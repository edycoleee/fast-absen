# Panduan Deploy – RSUD Sulfat Attendance System

## Arsitektur

```
Internet
   │
   ▼
[192.10.10.15]  ← nginx reverse proxy
   absen.sulfat.site  (HTTPS/443) → HTTP → 192.10.10.152:3000
   │
   ▼
[192.10.10.152]  ← App Server
   Docker stack (deploy/docker-compose.yml):
   ┌─────────────────────────────────────┐
   │  nginx  (0.0.0.0:3000 → :80)        │
   │    /api/  →  backend:8000           │
   │    /      →  frontend:80            │
   │                                     │
   │  backend  (FastAPI, port 8000)      │
   │  frontend (React SPA via nginx:80)  │
   └─────────────────────────────────────┘
         │ TCP 5432
         ▼
[192.10.10.151]  ← DB Server
   Docker stack (database/docker-compose.yml):
   PostgreSQL 16  (0.0.0.0:5432)
   pgAdmin        (0.0.0.0:5050)
```

---

## 1. Setup DB Server (192.10.10.151)

```bash
# Salin repo
git clone <repo-url> /opt/fast-absen
cd /opt/fast-absen/database

# .env sudah tersedia (database/.env)
# Cek dan sesuaikan jika perlu
cat .env

# Jalankan PostgreSQL
docker compose up -d

# Verifikasi
docker ps
docker exec attendance-db-postgres pg_isready -U sultan -d attendance_db
```

> **Firewall DB Server**: Buka port 5432 hanya untuk 192.10.10.152
> ```bash
> ufw allow from 192.10.10.152 to any port 5432
> ```

---

## 2. Setup App Server (192.10.10.152)

```bash
# Salin repo
git clone <repo-url> /opt/fast-absen
cd /opt/fast-absen/deploy

# Cek .env (sudah dikonfigurasi untuk 192.10.10.151)
cat .env

# Build & jalankan
docker compose up -d --build

# Verifikasi
docker ps
curl -s http://localhost:3000/health | python3 -m json.tool
```

### Cek log

```bash
docker logs absen-backend  -f --tail 50
docker logs absen-frontend -f --tail 20
docker logs absen-nginx    -f --tail 20
```

### Rebuild frontend dan reload nginx:
```
cd /home/sultan/fast-absen/deploy && docker compose build frontend && docker compose up -d frontend && docker compose exec nginx nginx -s reload && echo "DONE"
```

---

## 3. Setup Reverse Proxy (192.10.10.15)

Tambahkan konfigurasi nginx untuk subdomain `absen.sulfat.site`:

```nginx
server {
    listen 80;
    server_name absen.sulfat.site;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name absen.sulfat.site;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # Harus sama atau lebih besar dari client_max_body_size di app server (50m)
    client_max_body_size 50m;

    location / {
        proxy_pass         http://192.10.10.152:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 120s;
    }
}
```

> Reload nginx: `nginx -t && systemctl reload nginx`

---

## 4. Update & Redeploy

```bash
cd /opt/fast-absen
git pull

cd deploy
# Rebuild hanya image yang berubah
docker compose up -d --build backend
# atau
docker compose up -d --build
```

---

## 5. Variabel Penting di deploy/.env

| Variabel | Nilai | Keterangan |
|---|---|---|
| `DB_HOST_IP` | `192.10.10.151` | IP server database |
| `POSTGRES_DB` | `attendance_db` | Nama database |
| `POSTGRES_USER` | `sultan` | User PostgreSQL |
| `POSTGRES_PASSWORD` | `Sulfat123#!` | Password PostgreSQL |
| `SECRET_KEY` | `WfWzwN-1b_...` | JWT secret – **ganti di produksi** |
| `CORS_ORIGINS` | `https://absen.sulfat.site,...` | Allowed CORS origins |

---

## 6. Troubleshooting

### Backend tidak bisa konek DB
```bash
# Tes koneksi dari dalam container
docker exec absen-backend \
  python -c "import psycopg2; psycopg2.connect(host='192.10.10.151', port=5432, dbname='attendance_db', user='sultan', password='Sulfat123#!')"

# Tes dari host
nc -zv 192.10.10.151 5432
```

### Port 3000 tidak bisa diakses
```bash
# Pastikan docker nginx berjalan
docker ps | grep absen-nginx

# Tes lokal
curl -I http://localhost:3000
```

### Reset total
```bash
cd /opt/fast-absen/deploy
docker compose down -v
docker compose up -d --build
```
