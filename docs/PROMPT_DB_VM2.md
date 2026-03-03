# PROMPT: VM2 Database Server — PostgreSQL + pgvector + pgAdmin + MongoDB + Mongo Express + Health Check

> **Tujuan**: Setup lengkap VM2 (192.10.10.151) sebagai database server terpusat untuk semua aplikasi di VM1 (192.10.10.152). Semua parameter database disimpan di `.env`, tidak ada hardcode di compose file.

---

## 1. Infrastruktur Overview

```
VM1 (192.10.10.152) — Docker App Host
  ├── attendance (FastAPI + React)  → PostgreSQL
  ├── wa-gateway  (FastAPI)         → PostgreSQL
  ├── booking     (FastAPI)         → PostgreSQL + MongoDB
  └── reverse-proxy (Nginx)

          ↕ Private Network (Proxmox)
          192.10.10.0/24

VM2 (192.10.10.151) — Database Server
  ├── PostgreSQL 16 + pgvector  :5432
  ├── pgAdmin 4                 :5050
  ├── MongoDB 7                 :27017
  ├── Mongo Express             :8081
  └── DB Health Check API       :8888
```

**Catatan penting:**
- Port PostgreSQL dan MongoDB **TIDAK** diekspos ke internet, hanya ke jaringan private Proxmox.
- pgAdmin dan Mongo Express diekspos ke `127.0.0.1` (localhost) atau melalui Nginx reverse proxy dengan Basic Auth.
- Health Check API diekspos untuk di-ping oleh Nginx di VM1 dari jaringan private.

---

## 2. Struktur Direktori VM2

```
/opt/rsud/database/
├── .env                          ← SEMUA konfigurasi ada di sini
├── docker-compose.yml
├── init-postgres/
│   └── 01_init.sql               ← Schema + seed (copy dari attendance)
├── mongo-init/
│   └── 01_init.js                ← Create user + database MongoDB
├── healthcheck/
│   ├── main.py                   ← FastAPI health check service
│   ├── requirements.txt
│   └── Dockerfile
└── backups/                      ← Direktori backup (dibuat manual/cron)
```

---

## 3. File `.env` Lengkap

```dotenv
# ============================================================
# VM2 Database Server — Environment Configuration
# File: /opt/rsud/database/.env
# ============================================================
# JANGAN commit file ini ke git!
# Salin dari .env.example lalu isi nilainya.
# ============================================================

# ── Network binding ─────────────────────────────────────────
# IP VM2 di jaringan private Proxmox
DB_HOST_IP=192.10.10.151

# ── PostgreSQL ───────────────────────────────────────────────
POSTGRES_VERSION=16
POSTGRES_DB=attendance_db
POSTGRES_USER=sultan
POSTGRES_PASSWORD=GantiPasswordIni_Pg!2025

# Port binding: hanya ke IP private, bukan 0.0.0.0
POSTGRES_PORT=5432

# Tuning (sesuaikan RAM VM2 — contoh RAM 16GB)
PG_SHARED_BUFFERS=4GB
PG_WORK_MEM=256MB
PG_MAINTENANCE_WORK_MEM=2GB
PG_MAX_PARALLEL_MAINTENANCE_WORKERS=4
PG_EFFECTIVE_CACHE_SIZE=12GB
PG_LOG_MIN_DURATION_MS=2000

# ── pgAdmin ──────────────────────────────────────────────────
PGADMIN_DEFAULT_EMAIL=dba@rsudsulfat.site
PGADMIN_DEFAULT_PASSWORD=GantiPasswordIni_PgAdmin!2025
# Bind ke localhost agar hanya bisa diakses via Nginx + Basic Auth
PGADMIN_PORT=5050
PGADMIN_HOST_BIND=127.0.0.1

# ── MongoDB ──────────────────────────────────────────────────
MONGO_VERSION=7
MONGO_INITDB_ROOT_USERNAME=mongoadmin
MONGO_INITDB_ROOT_PASSWORD=GantiPasswordIni_Mongo!2025
MONGO_INITDB_DATABASE=booking_db
MONGO_PORT=27017

# Database + user untuk booking app (dibuat di mongo-init/01_init.js)
MONGO_APP_DATABASE=booking_db
MONGO_APP_USERNAME=booking_user
MONGO_APP_PASSWORD=GantiPasswordIni_BookingMongo!2025

# ── Mongo Express ─────────────────────────────────────────────
MONGO_EXPRESS_USERNAME=admin
MONGO_EXPRESS_PASSWORD=GantiPasswordIni_MongoExpress!2025
MONGO_EXPRESS_PORT=8081
MONGO_EXPRESS_HOST_BIND=127.0.0.1

# ── DB Health Check API ───────────────────────────────────────
HEALTH_API_PORT=8888
# Secret token untuk mengamankan /health endpoint
HEALTH_API_TOKEN=token-rahasia-ganti-ini-2025

# ── Timezone ─────────────────────────────────────────────────
TZ=Asia/Jakarta
```

---

## 4. `docker-compose.yml`

```yaml
# ============================================================
# VM2 — Database Stack
# PostgreSQL 16 + pgvector | pgAdmin | MongoDB 7 | Mongo Express | Health Check
# ============================================================
# Usage:
#   cp .env.example .env && nano .env   ← isi password dulu!
#   docker compose up -d
#   docker compose logs -f
# ============================================================

services:

  # ──────────────────────────────────────────────────────────
  # PostgreSQL 16 + pgvector
  # ──────────────────────────────────────────────────────────
  postgres:
    image: pgvector/pgvector:pg${POSTGRES_VERSION:-16}
    container_name: db-postgres
    env_file: .env
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: "-E UTF8"
      TZ: ${TZ:-Asia/Jakarta}
    command: >
      postgres
      -c shared_buffers=${PG_SHARED_BUFFERS:-2GB}
      -c work_mem=${PG_WORK_MEM:-128MB}
      -c maintenance_work_mem=${PG_MAINTENANCE_WORK_MEM:-1GB}
      -c max_parallel_maintenance_workers=${PG_MAX_PARALLEL_MAINTENANCE_WORKERS:-2}
      -c effective_cache_size=${PG_EFFECTIVE_CACHE_SIZE:-6GB}
      -c log_min_duration_statement=${PG_LOG_MIN_DURATION_MS:-2000}
      -c log_timezone=Asia/Jakarta
      -c timezone=Asia/Jakarta
    ports:
      - "${DB_HOST_IP}:${POSTGRES_PORT:-5432}:5432"
    volumes:
      - ./init-postgres:/docker-entrypoint-initdb.d:ro
      - postgres_data:/var/lib/postgresql/data
    shm_size: '512mb'
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - db_internal
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"

  # ──────────────────────────────────────────────────────────
  # pgAdmin 4 — PostgreSQL UI
  # Bind ke localhost, akses via Nginx + Basic Auth di VM2
  # ──────────────────────────────────────────────────────────
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: db-pgadmin
    env_file: .env
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_DEFAULT_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_DEFAULT_PASSWORD}
      PGADMIN_LISTEN_ADDRESS: 0.0.0.0
      PGADMIN_CONFIG_SERVER_MODE: 'False'
      PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED: 'False'
      TZ: ${TZ:-Asia/Jakarta}
    ports:
      - "${PGADMIN_HOST_BIND:-127.0.0.1}:${PGADMIN_PORT:-5050}:80"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - db_internal
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "3"

  # ──────────────────────────────────────────────────────────
  # MongoDB 7
  # ──────────────────────────────────────────────────────────
  mongodb:
    image: mongo:${MONGO_VERSION:-7}
    container_name: db-mongodb
    env_file: .env
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_INITDB_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_INITDB_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: ${MONGO_INITDB_DATABASE:-admin}
      TZ: ${TZ:-Asia/Jakarta}
    ports:
      - "${DB_HOST_IP}:${MONGO_PORT:-27017}:27017"
    volumes:
      - ./mongo-init:/docker-entrypoint-initdb.d:ro
      - mongo_data:/data/db
      - mongo_config:/data/configdb
    healthcheck:
      test: >
        mongosh
        --quiet
        --username ${MONGO_INITDB_ROOT_USERNAME}
        --password ${MONGO_INITDB_ROOT_PASSWORD}
        --authenticationDatabase admin
        --eval "db.adminCommand('ping').ok"
        | grep -q 1
      interval: 15s
      timeout: 10s
      retries: 5
      start_period: 30s
    networks:
      - db_internal
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"

  # ──────────────────────────────────────────────────────────
  # Mongo Express — MongoDB Web UI
  # Bind ke localhost, akses via Nginx + Basic Auth di VM2
  # ──────────────────────────────────────────────────────────
  mongo-express:
    image: mongo-express:latest
    container_name: db-mongoexpress
    env_file: .env
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: ${MONGO_INITDB_ROOT_USERNAME}
      ME_CONFIG_MONGODB_ADMINPASSWORD: ${MONGO_INITDB_ROOT_PASSWORD}
      ME_CONFIG_MONGODB_URL: "mongodb://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@mongodb:27017/?authSource=admin"
      ME_CONFIG_BASICAUTH_USERNAME: ${MONGO_EXPRESS_USERNAME}
      ME_CONFIG_BASICAUTH_PASSWORD: ${MONGO_EXPRESS_PASSWORD}
      ME_CONFIG_OPTIONS_EDITORTHEME: "ambiance"
      TZ: ${TZ:-Asia/Jakarta}
    ports:
      - "${MONGO_EXPRESS_HOST_BIND:-127.0.0.1}:${MONGO_EXPRESS_PORT:-8081}:8081"
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - db_internal
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "3"

  # ──────────────────────────────────────────────────────────
  # DB Health Check API
  # FastAPI ringan, cek koneksi PostgreSQL + MongoDB
  # Diakses dari VM1: http://192.10.10.151:8888/health
  # ──────────────────────────────────────────────────────────
  db-healthcheck:
    build:
      context: ./healthcheck
      dockerfile: Dockerfile
    container_name: db-healthcheck
    env_file: .env
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_PORT: "5432"
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      MONGO_HOST: mongodb
      MONGO_PORT: "27017"
      MONGO_USERNAME: ${MONGO_INITDB_ROOT_USERNAME}
      MONGO_PASSWORD: ${MONGO_INITDB_ROOT_PASSWORD}
      HEALTH_API_TOKEN: ${HEALTH_API_TOKEN}
      TZ: ${TZ:-Asia/Jakarta}
    ports:
      - "${DB_HOST_IP}:${HEALTH_API_PORT:-8888}:8888"
    depends_on:
      postgres:
        condition: service_healthy
      mongodb:
        condition: service_healthy
    networks:
      - db_internal
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

# ──────────────────────────────────────────────────────────────
volumes:
  postgres_data:
    driver: local
  pgadmin_data:
    driver: local
  mongo_data:
    driver: local
  mongo_config:
    driver: local

networks:
  db_internal:
    name: db_internal
    driver: bridge
```

---

## 5. MongoDB Init Script

**File: `mongo-init/01_init.js`**

```javascript
// ============================================================
// MongoDB Init Script
// Dijalankan sekali saat container pertama kali dibuat
// Membuat database + user khusus untuk setiap aplikasi
// ============================================================

// Autentikasi sebagai root (sudah otomatis dari docker env)
db = db.getSiblingDB('admin');

// ── Booking App Database ──────────────────────────────────
db = db.getSiblingDB(process.env.MONGO_APP_DATABASE || 'booking_db');

db.createUser({
  user: process.env.MONGO_APP_USERNAME || 'booking_user',
  pwd:  process.env.MONGO_APP_PASSWORD || 'GANTI_PASSWORD_INI',
  roles: [
    { role: 'readWrite', db: process.env.MONGO_APP_DATABASE || 'booking_db' }
  ]
});

// Buat koleksi awal agar database tersimpan
db.createCollection('_init');
db._init.insertOne({ initialized: true, created_at: new Date() });

print('✅ MongoDB init selesai: database booking_db siap digunakan');
```

---

## 6. DB Health Check Service

### `healthcheck/requirements.txt`

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
psycopg2-binary==2.9.9
pymongo==4.10.1
```

### `healthcheck/Dockerfile`

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Pasang dependencies system untuk psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8888

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8888"]
```

### `healthcheck/main.py`

```python
"""
DB Health Check API
Endpoint tunggal untuk mengecek koneksi PostgreSQL + MongoDB dari VM1.

Akses:
  GET http://192.10.10.151:8888/health
  Header: X-Health-Token: <HEALTH_API_TOKEN>  ← opsional, untuk keamanan

Response contoh:
  {
    "status": "healthy",
    "timestamp": "2025-03-03T10:00:00+07:00",
    "databases": {
      "postgresql": { "status": "up", "latency_ms": 3.2, "version": "16.x" },
      "mongodb":    { "status": "up", "latency_ms": 1.8, "version": "7.x"  }
    }
  }
"""

import os
import time
from datetime import datetime, timezone, timedelta
from typing import Optional

import psycopg2
import pymongo
from fastapi import FastAPI, Header, HTTPException, status
from fastapi.responses import JSONResponse

app = FastAPI(title="DB Health Check", version="1.0.0", docs_url=None, redoc_url=None)

# ── Config dari ENV ──────────────────────────────────────────
POSTGRES_HOST     = os.getenv("POSTGRES_HOST", "postgres")
POSTGRES_PORT     = int(os.getenv("POSTGRES_PORT", "5432"))
POSTGRES_DB       = os.getenv("POSTGRES_DB", "attendance_db")
POSTGRES_USER     = os.getenv("POSTGRES_USER", "sultan")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")

MONGO_HOST     = os.getenv("MONGO_HOST", "mongodb")
MONGO_PORT     = int(os.getenv("MONGO_PORT", "27017"))
MONGO_USERNAME = os.getenv("MONGO_USERNAME", "mongoadmin")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD", "")

# Token opsional untuk mengamankan endpoint
HEALTH_API_TOKEN: Optional[str] = os.getenv("HEALTH_API_TOKEN") or None

WIB = timezone(timedelta(hours=7))


def _now_wib() -> str:
    return datetime.now(WIB).isoformat()


def _check_postgres() -> dict:
    start = time.monotonic()
    try:
        conn = psycopg2.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            dbname=POSTGRES_DB,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            connect_timeout=5,
        )
        cur = conn.cursor()
        cur.execute("SELECT version();")
        row = cur.fetchone()
        version = row[0].split(",")[0] if row else "unknown"
        cur.close()
        conn.close()
        latency = round((time.monotonic() - start) * 1000, 2)
        return {"status": "up", "latency_ms": latency, "version": version}
    except Exception as exc:
        latency = round((time.monotonic() - start) * 1000, 2)
        return {"status": "down", "latency_ms": latency, "error": str(exc)}


def _check_mongodb() -> dict:
    start = time.monotonic()
    try:
        client = pymongo.MongoClient(
            host=MONGO_HOST,
            port=MONGO_PORT,
            username=MONGO_USERNAME,
            password=MONGO_PASSWORD,
            authSource="admin",
            serverSelectionTimeoutMS=5000,
        )
        info = client.admin.command("ping")
        server_info = client.server_info()
        version = server_info.get("version", "unknown")
        client.close()
        latency = round((time.monotonic() - start) * 1000, 2)
        ok = info.get("ok", 0)
        if ok == 1:
            return {"status": "up", "latency_ms": latency, "version": version}
        return {"status": "down", "latency_ms": latency, "error": f"ping ok={ok}"}
    except Exception as exc:
        latency = round((time.monotonic() - start) * 1000, 2)
        return {"status": "down", "latency_ms": latency, "error": str(exc)}


@app.get("/health")
def health_check(x_health_token: Optional[str] = Header(default=None)):
    # Validasi token hanya jika HEALTH_API_TOKEN di-set di env
    if HEALTH_API_TOKEN and x_health_token != HEALTH_API_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Health-Token header",
        )

    pg_result    = _check_postgres()
    mongo_result = _check_mongodb()

    all_up = pg_result["status"] == "up" and mongo_result["status"] == "up"

    result = {
        "status": "healthy" if all_up else "degraded",
        "timestamp": _now_wib(),
        "databases": {
            "postgresql": pg_result,
            "mongodb": mongo_result,
        },
    }

    http_status = status.HTTP_200_OK if all_up else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(content=result, status_code=http_status)


@app.get("/")
def root():
    return {"service": "db-healthcheck", "docs": "/health"}
```

---

## 7. Cara Akses Health Check dari VM1

### Manual (curl)

```bash
# Tanpa token (jika HEALTH_API_TOKEN tidak di-set)
curl http://192.10.10.151:8888/health

# Dengan token
curl -H "X-Health-Token: token-rahasia-ganti-ini-2025" \
     http://192.10.10.151:8888/health
```

### Dari Nginx VM1 (upstream health check)

Tambahkan di `nginx.conf` VM1:

```nginx
upstream db_health {
    server 192.10.10.151:8888;
}

# Opsional: expose health status di endpoint internal
location /internal/db-health {
    allow 127.0.0.1;
    deny all;
    proxy_pass http://db_health/health;
    proxy_set_header X-Health-Token "token-rahasia-ganti-ini-2025";
}
```

---

## 8. Nginx di VM2 (Akses pgAdmin + Mongo Express via Browser)

> Opsional: Jika ingin akses pgAdmin dan Mongo Express dari browser external melalui Cloudflare tunnel yang sama di VM1.

Buat `nginx-vm2.conf` di VM2:

```nginx
# VM2 Nginx — hanya untuk tool admin (pgAdmin + Mongo Express)
# Diakses melalui subdomain: db.rsudsulfat.site (via Cloudflare tunnel dari VM1)

server {
    listen 8082;  # Nginx di VM2 listen di port lain, diforward dari VM1

    # ── pgAdmin ──────────────────────────────────────────────
    location /pgadmin/ {
        proxy_pass         http://127.0.0.1:5050/;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_redirect     off;

        # Basic Auth lapisan tambahan (berbeda dari login pgAdmin)
        auth_basic           "Database Admin Area";
        auth_basic_user_file /etc/nginx/.htpasswd_db;
    }

    # ── Mongo Express ─────────────────────────────────────────
    location /mongoexpress/ {
        proxy_pass         http://127.0.0.1:8081/;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_redirect     off;

        auth_basic           "Database Admin Area";
        auth_basic_user_file /etc/nginx/.htpasswd_db;
    }
}
```

Buat htpasswd:

```bash
# Install htpasswd
sudo apt install apache2-utils -y

# Buat file auth
sudo htpasswd -c /etc/nginx/.htpasswd_db dba
# Masukkan password yang kuat
```

---

## 9. Langkah Deploy VM2

```bash
# ── 1. Login ke VM2 ──────────────────────────────────────────
ssh user@192.10.10.151

# ── 2. Install Docker (jika belum) ───────────────────────────
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# ── 3. Buat direktori ─────────────────────────────────────────
sudo mkdir -p /opt/rsud/database/{init-postgres,mongo-init,healthcheck,backups}
sudo chown -R $USER:$USER /opt/rsud/database
cd /opt/rsud/database

# ── 4. Salin / buat semua file ────────────────────────────────
# .env, docker-compose.yml, init-postgres/01_init.sql,
# mongo-init/01_init.js, healthcheck/main.py, Dockerfile, requirements.txt

# ── 5. Edit .env → ganti semua password ──────────────────────
cp .env.example .env
nano .env

# ── 6. Jalankan stack ─────────────────────────────────────────
docker compose up -d

# ── 7. Cek status ─────────────────────────────────────────────
docker compose ps
docker compose logs postgres   --tail=30
docker compose logs mongodb    --tail=30
docker compose logs db-healthcheck --tail=20

# ── 8. Test health check lokal ───────────────────────────────
curl http://localhost:8888/health
# atau dari VM1:
curl http://192.10.10.151:8888/health

# ── 9. Test koneksi PostgreSQL dari VM1 ──────────────────────
# (jalankan di VM1)
psql -h 192.10.10.151 -U sultan -d attendance_db

# ── 10. Test koneksi MongoDB dari VM1 ────────────────────────
# (jalankan di VM1)
mongosh "mongodb://mongoadmin:PASSWORD@192.10.10.151:27017/?authSource=admin"
```

---

## 10. Firewall VM2 (UFW)

```bash
# Reset dan setup firewall VM2
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH dari mana saja (atau batasi ke IP admin)
sudo ufw allow ssh

# PostgreSQL — hanya dari VM1
sudo ufw allow from 192.10.10.152 to any port 5432

# MongoDB — hanya dari VM1
sudo ufw allow from 192.10.10.152 to any port 27017

# Health Check API — hanya dari VM1
sudo ufw allow from 192.10.10.152 to any port 8888

# pgAdmin / Mongo Express — TIDAK diekspos ke port publik
# (akses via localhost + SSH tunnel atau Cloudflare tunnel)

sudo ufw enable
sudo ufw status verbose
```

---

## 11. Backup Strategy (Cron)

### Backup PostgreSQL harian

```bash
# /opt/rsud/database/backup-postgres.sh
#!/bin/bash
set -e

BACKUP_DIR="/opt/rsud/database/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=14

source /opt/rsud/database/.env

mkdir -p "$BACKUP_DIR"

docker exec db-postgres pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -F c \
  -f "/tmp/backup_${DATE}.dump"

docker cp "db-postgres:/tmp/backup_${DATE}.dump" "$BACKUP_DIR/"
docker exec db-postgres rm "/tmp/backup_${DATE}.dump"

# Hapus backup lebih dari RETENTION_DAYS hari
find "$BACKUP_DIR" -name "*.dump" -mtime +${RETENTION_DAYS} -delete

echo "✅ Backup PostgreSQL selesai: $BACKUP_DIR/backup_${DATE}.dump"
```

### Backup MongoDB harian

```bash
# /opt/rsud/database/backup-mongo.sh
#!/bin/bash
set -e

BACKUP_DIR="/opt/rsud/database/backups/mongo"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=14

source /opt/rsud/database/.env

mkdir -p "$BACKUP_DIR"

docker exec db-mongodb mongodump \
  --username "$MONGO_INITDB_ROOT_USERNAME" \
  --password "$MONGO_INITDB_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --out "/tmp/mongodump_${DATE}"

docker cp "db-mongodb:/tmp/mongodump_${DATE}" "$BACKUP_DIR/"
docker exec db-mongodb rm -rf "/tmp/mongodump_${DATE}"

# Kompres
tar -czf "$BACKUP_DIR/mongodump_${DATE}.tar.gz" -C "$BACKUP_DIR" "mongodump_${DATE}"
rm -rf "$BACKUP_DIR/mongodump_${DATE}"

# Hapus backup lama
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo "✅ Backup MongoDB selesai: $BACKUP_DIR/mongodump_${DATE}.tar.gz"
```

### Pasang ke Cron

```bash
chmod +x /opt/rsud/database/backup-postgres.sh
chmod +x /opt/rsud/database/backup-mongo.sh

# Edit crontab
crontab -e

# Tambahkan:
# Backup PostgreSQL setiap hari pukul 01:00
0 1 * * * /opt/rsud/database/backup-postgres.sh >> /var/log/backup-postgres.log 2>&1

# Backup MongoDB setiap hari pukul 01:30
30 1 * * * /opt/rsud/database/backup-mongo.sh >> /var/log/backup-mongo.log 2>&1
```

---

## 12. Connection String untuk Aplikasi di VM1

Tambahkan ke `.env` masing-masing aplikasi di VM1:

```dotenv
# ── PostgreSQL ───────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://sultan:PASSWORD@192.10.10.151:5432/attendance_db

# ── MongoDB (untuk booking app) ──────────────────────────────
MONGODB_URL=mongodb://booking_user:PASSWORD@192.10.10.151:27017/booking_db?authSource=booking_db

# ── Health Check ─────────────────────────────────────────────
DB_HEALTH_URL=http://192.10.10.151:8888/health
DB_HEALTH_TOKEN=token-rahasia-ganti-ini-2025
```

---

## 13. Best Practices Checklist

| # | Praktik | Implementasi |
|---|---------|-------------|
| 1 | **Tidak ada hardcode credential** | Semua dari `.env`, compose hanya referensi `${VAR}` |
| 2 | **Port binding ke IP spesifik** | `DB_HOST_IP:port:port` bukan `0.0.0.0:port:port` |
| 3 | **Tool admin hanya di localhost** | pgAdmin + Mongo Express bind ke `127.0.0.1` |
| 4 | **Firewall UFW** | Hanya VM1 yang boleh koneksi ke port DB |
| 5 | **Healthcheck Docker** | `pg_isready` untuk Postgres, `mongosh ping` untuk Mongo |
| 6 | **Named volumes** | Bukan bind mount untuk data — persistent + portable |
| 7 | **Log rotation** | `json-file` driver dengan `max-size` dan `max-file` |
| 8 | **Restart policy** | `unless-stopped` — auto-restart kecuali dihentikan manual |
| 9 | **Backup otomatis** | Cron harian + retensi 14 hari |
| 10 | **Token auth health API** | `X-Health-Token` header untuk keamanan endpoint |
| 11 | **Init script readonly** | Volume mount `:ro` agar tidak termodifikasi |
| 12 | **Separate app user MongoDB** | Bukan root user untuk koneksi aplikasi |
| 13 | **pgvector pre-installed** | Gunakan image `pgvector/pgvector:pg16` bukan `postgres:16` |
| 14 | **shm_size PostgreSQL** | Set `shm_size: 512mb` untuk buffer management yang optimal |

---

## 14. Troubleshooting

```bash
# Cek container berjalan
docker compose ps

# Lihat log real-time
docker compose logs -f postgres
docker compose logs -f mongodb
docker compose logs -f db-healthcheck

# Test koneksi PostgreSQL dari dalam VM2
docker exec -it db-postgres psql -U sultan -d attendance_db -c "SELECT version();"

# Test pgvector extension aktif
docker exec -it db-postgres psql -U sultan -d attendance_db \
  -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"

# Test koneksi MongoDB dari dalam VM2
docker exec -it db-mongodb mongosh \
  --username mongoadmin --password PASSWORD \
  --authenticationDatabase admin \
  --eval "db.adminCommand('ping')"

# Restart satu service
docker compose restart postgres

# Cek penggunaan disk volume
docker system df -v | grep -E "postgres_data|mongo_data"
```
