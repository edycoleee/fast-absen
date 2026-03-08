# Panduan Integrasi Aplikasi Baru — kos.sulfat.site
> Template implementasi lengkap: **FastAPI + SQLite + ReactJS** di atas stack existing
> (absen.sulfat.site), server `192.10.10.152`, reverse proxy SSL `192.10.10.15`.

---

## Daftar Isi

1. [Gambaran Arsitektur](#gambaran-arsitektur)
2. [Struktur Direktori Baru](#struktur-direktori-baru)
3. [File 1 — Dockerfile Backend](#file-1--dockerfile-backend-kos)
4. [File 2 — main.py Backend Template](#file-2--mainpy-fastapi--sqlite-template)
5. [File 3 — requirements.txt Backend](#file-3--requirementstxt-backend)
6. [File 4 — Dockerfile Frontend](#file-4--dockerfile-frontend-kos)
7. [File 5 — nginx.conf Frontend (static SPA)](#file-5--nginxconf-frontend-static-spa)
8. [File 6 — vite.config.js Frontend](#file-6--viteconfigjs-frontend)
9. [File 7 — nginx-kos.conf (entrypoint kos stack)](#file-7--nginx-kosconf-entrypoint-kos-stack)
10. [File 8 — Patch docker-compose.yml](#file-8--patch-docker-composeyml)
11. [File 9 — Block Reverse Proxy 192.10.10.15](#file-9--block-nginx-reverse-proxy-192101015)
12. [Langkah Deployment](#langkah-deployment)
13. [Verifikasi End-to-End](#verifikasi-end-to-end)
14. [Checklist Hardening Produksi](#checklist-hardening-produksi)

---

## Gambaran Arsitektur

```
Browser / Android
      │  HTTPS
      ▼
┌──────────────────────────┐
│  Nginx Reverse Proxy      │  192.10.10.15  (SSL termination)
│  kos.sulfat.site :443     │
└────────┬─────────────────┘
         │  HTTP LAN
         ▼
┌──────────────────────────┐
│  kos-nginx               │  192.10.10.152:3001 → container:80
│  (entrypoint kos stack)  │  rate limit · gzip · security headers
└──────┬───────────────────┘
       │              │
       ▼              ▼
┌──────────┐   ┌─────────────┐
│kos-backend│  │kos-frontend │
│FastAPI    │  │React static │
│SQLite     │  │nginx:alpine │
│port 8001  │  │port 80      │
└──────────┘   └─────────────┘
       │
  [volume]
  kos_db_data
  /app/data/kos.db
```

**Prinsip yang dipertahankan:**
- SSL terminate di reverse proxy, container hanya HTTP.
- CORS dikelola di FastAPI, **tidak** di Nginx.
- Real IP klien diteruskan via `X-Real-IP`.
- Port baru diekspose: `3001` (tidak konflik dengan absen stack di `3000`).

---

## Struktur Direktori Baru

Buat di root repositori (sejajar dengan `backend/` dan `frontend/` yang existing):

```
fast-absen/
├── backend/               ← existing (absen app)
├── frontend/              ← existing (absen app)
├── deploy/
│   ├── docker-compose.yml ← TAMBAH service kos-* di sini
│   ├── nginx.conf         ← existing (absen-nginx, tidak diubah)
│   ├── nginx-kos.conf     ← BARU (entrypoint kos-nginx)
│   └── nginx-kos-frontend.conf  ← BARU (static SPA kos-frontend)
├── kos-backend/           ← BARU
│   ├── Dockerfile
│   ├── main.py
│   ├── database.py
│   └── requirements.txt
└── kos-frontend/          ← BARU
    ├── Dockerfile
    ├── nginx.conf          → disalin dari deploy/nginx-kos-frontend.conf saat build
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        └── App.jsx
```

---

## File 1 — Dockerfile Backend kos

**Path:** `kos-backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Sistem dependency minimal
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Buat direktori data untuk SQLite — volume akan di-mount di sini
RUN mkdir -p /app/data

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", \
     "--workers", "2", "--no-access-log"]
```

---

## File 2 — main.py FastAPI + SQLite Template

**Path:** `kos-backend/main.py`

```python
"""
Kos App — API Template (FastAPI + SQLite)
Ganti/tambah router sesuai kebutuhan aplikasi.
"""
from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from database import init_db


# ── Allowed Origins ──────────────────────────────────────────
# Produksi: hanya domain resmi. Dev: tambahkan localhost:port.
CORS_ORIGINS = [
    "https://kos.sulfat.site",
]
CORS_ORIGIN_REGEX = (
    r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+"
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inisialisasi DB saat startup."""
    init_db()
    yield


app = FastAPI(
    title="Kos App API",
    version="1.0.0",
    docs_url="/docs" if os.getenv("DEBUG", "false").lower() == "true" else None,
    redoc_url=None,
    openapi_url="/openapi.json" if os.getenv("DEBUG", "false").lower() == "true" else None,
    lifespan=lifespan,
)

# ── CORS — dikelola di sini, BUKAN di Nginx ──────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ── Import & daftarkan router di sini ────────────────────────
# from routers import kamar, penghuni, pembayaran
# app.include_router(kamar.router, prefix="/api/v1/kamar", tags=["Kamar"])


@app.get("/", tags=["Root"])
def root():
    return {"app": "Kos App", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
```

---

## File 3 — requirements.txt Backend

**Path:** `kos-backend/requirements.txt`

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.36
python-multipart==0.0.12
pydantic==2.9.2
pydantic-settings==2.5.2
alembic==1.13.3
```

---

## File 3b — database.py SQLite Setup

**Path:** `kos-backend/database.py`

```python
"""
SQLite setup via SQLAlchemy.
File DB disimpan di /app/data/kos.db
→ di-mount sebagai Docker volume agar persisten.
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DB_DIR  = os.getenv("DB_DIR", "/app/data")
DB_PATH = os.path.join(DB_DIR, "kos.db")

# check_same_thread=False wajib untuk SQLite + multi-thread ASGI
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def init_db():
    """Buat tabel jika belum ada (otomatis saat startup)."""
    os.makedirs(DB_DIR, exist_ok=True)
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency — inject DB session ke route."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## File 4 — Dockerfile Frontend kos

**Path:** `kos-frontend/Dockerfile`

```dockerfile
# ── Stage 1: Build React ──────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

COPY . .

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ── Stage 2: Serve static dengan Nginx ───────────────────────
FROM nginx:alpine AS runner

# Hapus default config nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copy hasil build React
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config SPA (tidak mengekspos port 3001 — itu tugas kos-nginx)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## File 5 — nginx.conf Frontend (static SPA)

**Path:** `kos-frontend/nginx.conf`
*(Juga disimpan sebagai `deploy/nginx-kos-frontend.conf` untuk referensi)*

```nginx
# ============================================================
# Nginx — kos-frontend (static React SPA)
# Hanya melayani file statis + SPA fallback.
# Keamanan & rate-limit ditangani kos-nginx di upstream.
# ============================================================

server {
    listen 80;

    root /usr/share/nginx/html;
    index index.html;

    # ── SPA fallback ─────────────────────────────────────────
    # Semua route dikembalikan ke index.html agar React Router
    # dapat menangani client-side routing.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ── Cache asset statis 30 hari ───────────────────────────
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # ── Sembunyikan info Nginx ───────────────────────────────
    server_tokens off;
}
```

---

## File 6 — vite.config.js Frontend

**Path:** `kos-frontend/vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3001,
    proxy: {
      // Development: proxy ke backend lokal
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}))
```

---

## File 7 — nginx-kos.conf (entrypoint kos stack)

**Path:** `deploy/nginx-kos.conf`

> File ini di-mount ke container `kos-nginx` dan merupakan konfigurasi utama
> entrypoint stack kos. Lihat juga file fisik: [`nginx-kos.conf`](nginx-kos.conf)

```nginx
# ============================================================
# NGINX — kos Stack (192.10.10.152)
# ============================================================
# Port  : kos-nginx listen :80 di dalam container
#         docker memetakan 0.0.0.0:3001 → container:80
# Reverse proxy 192.10.10.15 meneruskan:
#   kos.sulfat.site → 192.10.10.152:3001 (HTTP)
# SSL ditangani oleh reverse proxy di 192.10.10.15.
# ============================================================

# ── Real IP ──────────────────────────────────────────────────
set_real_ip_from  192.10.10.15;
real_ip_header    X-Real-IP;
real_ip_recursive on;

# ── Rate limiting ─────────────────────────────────────────────
limit_req_zone $binary_remote_addr zone=kos_api:10m rate=20r/s;

# ── Gzip compression ─────────────────────────────────────────
gzip            on;
gzip_types      text/css application/javascript application/json
                image/svg+xml text/plain application/xml;
gzip_min_length 1024;
gzip_vary       on;
gzip_proxied    any;

# ── Custom log format ─────────────────────────────────────────
log_format kos_real '$remote_addr [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" real_ip=$http_x_real_ip';

server {
    listen 80;
    server_name kos.sulfat.site;

    client_max_body_size 10m;

    access_log /var/log/nginx/access.log kos_real;
    error_log  /var/log/nginx/error.log  warn;

    # ── Security Headers ─────────────────────────────────────
    # CORS TIDAK diset di sini — ditangani FastAPI (main.py).
    add_header X-Frame-Options          "SAMEORIGIN"                       always;
    add_header X-Content-Type-Options   "nosniff"                          always;
    add_header X-XSS-Protection         "1; mode=block"                    always;
    add_header Referrer-Policy          "strict-origin-when-cross-origin"  always;
    add_header Permissions-Policy       "geolocation=(), microphone=(), camera=()" always;
    add_header Content-Security-Policy
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://kos.sulfat.site; font-src 'self';"
        always;

    # ── Proxy headers diteruskan ke upstream ──────────────────
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;

    # ----------------------------------------------------------
    # HEALTH CHECK → kos-backend:8001/health  (no rate limit)
    # ----------------------------------------------------------
    location ~ ^/health(/|$) {
        proxy_pass         http://kos-backend:8001;
        proxy_read_timeout 10s;
    }

    # ----------------------------------------------------------
    # BACKEND API → kos-backend:8001
    # ----------------------------------------------------------
    location /api/ {
        limit_req zone=kos_api burst=40 nodelay;
        limit_req_status 429;

        proxy_pass         http://kos-backend:8001/api/;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;

        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
    }

    # ----------------------------------------------------------
    # FRONTEND SPA → kos-frontend:80
    # ----------------------------------------------------------
    location / {
        proxy_pass         http://kos-frontend:80/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
    }
}
```

---

## File 8 — Patch docker-compose.yml

Tambahkan **snippet berikut** ke `deploy/docker-compose.yml` yang sudah ada.
Cukup tambahkan di bawah service `nginx` existing (jangan hapus service lain).

```yaml
  # ── kos Backend (FastAPI + SQLite) ────────────────────────
  kos-backend:
    container_name: kos-backend
    build:
      context: ../kos-backend
    environment:
      DEBUG:    "false"
      DB_DIR:   /app/data
    volumes:
      - kos_db_data:/app/data      # SQLite persisten di sini
      - kos_backend_logs:/app/logs
    networks:
      - app_net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # ── kos Frontend (React → nginx static) ───────────────────
  kos-frontend:
    container_name: kos-frontend
    build:
      context: ../kos-frontend
      args:
        VITE_API_BASE_URL: /api/v1
    depends_on:
      - kos-backend
    networks:
      - app_net
    restart: unless-stopped

  # ── kos Nginx (entrypoint, port 3001) ─────────────────────
  kos-nginx:
    container_name: kos-nginx
    image: nginx:alpine
    ports:
      - "0.0.0.0:3001:80"         # reverse proxy (192.10.10.15) → :3001
    volumes:
      - ./nginx-kos.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - kos-frontend
      - kos-backend
    networks:
      - app_net
    restart: unless-stopped
```

Tambahkan juga **volumes baru** di bagian `volumes:` yang sudah ada:

```yaml
  kos_db_data:       # file SQLite — jangan pernah hapus volume ini
  kos_backend_logs:
```

> **Catatan:** Tidak ada perubahan pada service `backend`, `frontend`, `nginx` (absen stack).
> Network `app_net` sudah ada dan digunakan bersama.

---

## File 9 — Block Nginx Reverse Proxy 192.10.10.15

Tambahkan dua server block berikut di konfigurasi Nginx pada server `192.10.10.15`
(biasanya di `/etc/nginx/sites-available/kos.sulfat.site`):

```nginx
# ── HTTP → HTTPS redirect ─────────────────────────────────────
server {
    listen 80;
    server_name kos.sulfat.site;
    return 301 https://$host$request_uri;
}

# ── HTTPS (SSL termination) ───────────────────────────────────
server {
    listen 443 ssl http2;
    server_name kos.sulfat.site;

    # Ganti path sesuai sertifikat Let's Encrypt
    ssl_certificate     /etc/letsencrypt/live/kos.sulfat.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kos.sulfat.site/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL_kos:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_pass         http://192.10.10.152:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;       # ← IP asli klien
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Connection        "";

        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
```

Aktifkan dan reload:

```bash
# Di server 192.10.10.15
sudo ln -s /etc/nginx/sites-available/kos.sulfat.site \
           /etc/nginx/sites-enabled/kos.sulfat.site
sudo nginx -t && sudo nginx -s reload
```

Dapatkan sertifikat SSL (jika belum):

```bash
sudo certbot --nginx -d kos.sulfat.site
```

---

## Langkah Deployment

Semua perintah dijalankan di **server 192.10.10.152**:

```bash
# 1. Masuk ke direktori deploy
cd /opt/fast-absen/deploy

# 2. Build & jalankan hanya service kos (tidak restart absen stack)
docker compose up -d --build kos-backend kos-frontend kos-nginx

# 3. Cek status semua container
docker compose ps

# 4. Lihat log startup kos-backend
docker compose logs -f kos-backend
```

---

## Verifikasi End-to-End

```bash
# ── Di server 192.10.10.152 ───────────────────────────────────

# 1. Health check langsung ke kos-nginx (tanpa melewati reverse proxy)
curl -s http://localhost:3001/health
# Ekspektasi: {"status":"healthy"}

# 2. Health check langsung ke kos-backend
docker compose exec kos-backend curl -s http://localhost:8001/health
# Ekspektasi: {"status":"healthy"}

# 3. Cek real IP di access log (pastikan bukan 192.10.10.15)
docker compose logs kos-nginx | tail -20
# Baris log harus menunjukkan IP klien nyata, bukan 192.10.10.15

# 4. Cek volume SQLite tetap ada setelah restart
docker compose restart kos-backend
docker compose exec kos-backend ls -lh /app/data/kos.db
# File harus tetap ada

# ── Dari browser / klien eksternal ───────────────────────────

# 5. Uji akses frontend
curl -I https://kos.sulfat.site
# Ekspektasi: HTTP/2 200, X-Frame-Options: SAMEORIGIN, dll.

# 6. Uji API endpoint
curl -s https://kos.sulfat.site/health
# Ekspektasi: {"status":"healthy"}

# 7. Uji CORS (dari browser dev tools atau:)
curl -H "Origin: https://kos.sulfat.site" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS https://kos.sulfat.site/api/v1/ -v
# Ekspektasi: Access-Control-Allow-Origin: https://kos.sulfat.site
#             Header ini muncul 1× (dari FastAPI, bukan dari Nginx)

# 8. Test rate limit
for i in $(seq 1 60); do
  curl -s -o /dev/null -w "%{http_code}\n" https://kos.sulfat.site/api/v1/
done
# Setelah burst, beberapa request harus mendapat 429
```

---

## Checklist Hardening Produksi

### Firewall (Di server 192.10.10.152)

```bash
# Hanya izinkan akses port 3001 dari reverse proxy 192.10.10.15
sudo ufw allow from 192.10.10.15 to any port 3001 proto tcp
sudo ufw deny 3001

# Verifikasi
sudo ufw status numbered
```

### Backup SQLite Berkala

Volume Docker ada di `/var/lib/docker/volumes/deploy_kos_db_data/_data/kos.db`.

```bash
# Tambahkan ke crontab (backup setiap hari jam 02:00)
# crontab -e
0 2 * * * docker compose -f /opt/fast-absen/deploy/docker-compose.yml \
  exec -T kos-backend sqlite3 /app/data/kos.db ".backup /app/data/kos.db.bak" \
  && cp /var/lib/docker/volumes/deploy_kos_db_data/_data/kos.db.bak \
     /backup/kos/kos-$(date +\%Y\%m\%d).db
```

### Log Rotation

Tambahkan `/etc/logrotate.d/kos-nginx`:

```
/var/lib/docker/volumes/deploy_kos_backend_logs/_data/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        docker exec kos-nginx nginx -s reopen 2>/dev/null || true
    endscript
}
```

### Checklist Final

- [x] Port 3001 hanya bisa diakses dari 192.10.10.15 (firewall)
- [x] Volume `kos_db_data` untuk SQLite persisten
- [x] CORS dikelola di FastAPI (`main.py`), tidak di Nginx
- [x] SSL terminate di reverse proxy 192.10.10.15
- [x] Real IP klien tercatat di log (`set_real_ip_from`)
- [x] Security headers lengkap di `nginx-kos.conf`
- [x] Rate limit aktif untuk `/api/`
- [x] `client_max_body_size 10m` di `nginx-kos.conf`
- [x] Gzip aktif
- [x] `/docs` disabled di produksi (`DEBUG=false`)
- [ ] Backup SQLite berkala (crontab)
- [ ] Log rotation (logrotate)
- [ ] Certbot auto-renew aktif (`certbot renew --dry-run`)
- [ ] Health check monitoring (mis. UptimeRobot → https://kos.sulfat.site/health)
