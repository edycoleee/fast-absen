# Prompt: Nginx Reverse Proxy + Infrastruktur Proxmox
## Domain rsudsulfat.site → Cloudflare → Tunnel → VM Docker

> Dokumen ini mencakup rancangan infrastruktur, konfigurasi nginx reverse proxy
> sebagai hub multi-aplikasi, dan halaman HTML uji coba routing end-to-end.

---

## Gambaran Infrastruktur

```
Internet (User)
    │
    ▼
rsudsulfat.site (Cloudflare DNS + Proxy)
    │  SSL termination di Cloudflare
    │  Zero Trust Tunnel (cloudflared)
    ▼
192.10.10.152 — VM 1: Docker Host          192.10.10.151 — VM 2: Database
┌──────────────────────────────────────┐   ┌──────────────────────────────┐
│  cloudflared (tunnel daemon)         │   │  PostgreSQL 16               │
│      │                               │   │    Port: 5432                │
│      ▼ :8080                         │   │    DB: absensi, wa_gateway,  │
│  nginx (reverse-proxy container)     │◄──┤         klinik, booking      │
│      │                               │   │                              │
│      ├─► attendance (FastAPI :8001)  │   │  MongoDB 7                   │
│      ├─► wa-gateway  (FastAPI :8002)  │   │    Port: 27017               │
│      ├─► booking     (FastAPI :8003) │   │    DB: booking, logs         │
│      └─► frontend-*  (nginx   :80xx) │   └──────────────────────────────┘
└──────────────────────────────────────┘

Network:
  app_net  — bridge internal VM 1 (semua container Docker)
  db_net   — VLAN / static route 192.10.10.152 ↔ 192.10.10.151
```

---

## Rencana Subdomain & Routing

| Subdomain / Path | Target Container | Keterangan |
|---|---|---|
| `rsudsulfat.site/` | `frontend-attendance` | App absensi (React/Vite) |
| `rsudsulfat.site/api/v1/` | `attendance-backend` | FastAPI absensi |
| `rsudsulfat.site/health` | `attendance-backend` | Health check |
| `rsudsulfat.site/pgadmin/` | `pgadmin` (VM 2 atau VM 1) | PgAdmin |
| `wa.rsudsulfat.site/` | `wa-gateway` | WhatsApp Gateway FastAPI |
| `booking.rsudsulfat.site/` | `frontend-booking` | App booking (masa depan) |
| `booking.rsudsulfat.site/api/` | `booking-backend` | FastAPI booking |
| `rsudsulfat.site/test` | Static HTML | Halaman uji routing |

---

## Struktur Direktori Deployment

```
/opt/rsud/
├── reverse-proxy/
│   ├── docker-compose.yml
│   ├── nginx.conf               ← konfigurasi utama multi-app
│   └── html/
│       └── test.html            ← halaman uji routing
│
├── attendance/                  ← clone fast-absen/docker/
│   ├── docker-compose.yml
│   └── ...
│
├── wa-gateway/                  ← project baru
│   ├── docker-compose.yml
│   └── ...
│
└── booking/                     ← project masa depan
    └── docker-compose.yml
```

---

## Prompt Lengkap untuk AI Coding Assistant

```
Kamu adalah senior DevOps & backend engineer. Bangun konfigurasi nginx reverse proxy
sebagai container Docker yang menjadi HUB untuk semua aplikasi di VM Docker host
(192.10.10.152). Infrastruktur menggunakan Proxmox dengan dua VM:

  VM 1 (192.10.10.152) — Docker Host
    Semua aplikasi berjalan sebagai container Docker
    cloudflared tunnel menerima traffic dari rsudsulfat.site → 127.0.0.1:8080
    nginx mendengarkan di 127.0.0.1:8080

  VM 2 (192.10.10.151) — Database Host
    PostgreSQL 16 (port 5432)
    MongoDB 7 (port 27017)
    Diakses dari VM 1 via IP internal

SSL dihandle oleh Cloudflare — nginx TIDAK mengurus SSL sama sekali.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FILE 1: reverse-proxy/docker-compose.yml

version: '3.9'

services:
  nginx:
    container_name: reverse-proxy
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:80"   # cloudflared → localhost:8080 → nginx
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./html:/usr/share/nginx/html/static:ro   # static test page
    networks:
      - proxy_net
      - attendance_net     # reach attendance containers
      - wa_net             # reach wa-gateway containers
      - booking_net        # reach booking containers (masa depan)
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"

networks:
  proxy_net:
    driver: bridge
  attendance_net:
    external: true
    name: attendance_app_net    # dibuat oleh docker-compose attendance
  wa_net:
    external: true
    name: wa_gateway_app_net    # dibuat oleh docker-compose wa-gateway
  booking_net:
    external: true
    name: booking_app_net       # dibuat oleh docker-compose booking

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FILE 2: reverse-proxy/nginx.conf

Buat konfigurasi nginx lengkap dengan blok server berikut:

PRINSIP KONFIGURASI:
  - Semua listen di port 80 (SSL di Cloudflare)
  - Gunakan proxy_set_header CF-Connecting-IP untuk IP asli user
  - Tambahkan security header standar di setiap location
  - index.html frontend: no-cache (agar browser selalu ambil versi terbaru)
  - Asset statis (js/css/img): cache 1 tahun (filename sudah di-hash oleh Vite)
  - Upstream timeout: 30 detik (sesuai Cloudflare default)
  - client_max_body_size: 20m (untuk upload foto/dokumen)

BLOK 1 — server rsudsulfat.site (port 80)
  Upstream yang dihandle:
    /test               → file statis html/test.html (alias)
    /health             → proxy http://attendance-backend:8000/health
    /api/               → proxy http://attendance-backend:8000/api/
    /pgadmin/           → proxy http://attendance-db-pgadmin:80/ (dengan X-Script-Name)
    /static/            → alias /usr/share/nginx/html/static/ (no-cache)
    ~* \.(js|css|...)$  → proxy http://attendance-frontend:80 (cache 1y)
    /                   → proxy http://attendance-frontend:80 (no-cache untuk index.html)

  Header wajib di semua location:
    proxy_set_header Host              $host;
    proxy_set_header CF-Connecting-IP  $http_cf_connecting_ip;
    proxy_set_header X-Real-IP         $http_cf_connecting_ip;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

  Security header (add_header, hanya untuk response dari nginx sendiri):
    X-Frame-Options: SAMEORIGIN
    X-Content-Type-Options: nosniff
    Referrer-Policy: strict-origin-when-cross-origin

BLOK 2 — server wa.rsudsulfat.site (port 80)
  Upstream yang dihandle:
    /health             → proxy http://wa-gateway:8000/health
    /api/               → proxy http://wa-gateway:8000/api/
    /docs               → proxy http://wa-gateway:8000/docs (hanya jika DEBUG=true, tapi tetap buat)
    /                   → return 404 (tidak ada frontend untuk subdomain ini)

  Tambahan:
    - Rate limit ketat: limit_req_zone + limit_req (10r/s per IP, burst 20)
    - Tidak boleh ada cache di semua endpoint /api/

BLOK 3 — server booking.rsudsulfat.site (port 80)
  Upstream yang dihandle:
    /health             → proxy http://booking-backend:8000/health
    /api/               → proxy http://booking-backend:8000/api/
    ~* \.(js|css|...)$  → proxy http://booking-frontend:80 (cache 1y)
    /                   → proxy http://booking-frontend:80 (no-cache)

  Catatan: Container booking belum ada, gunakan upstream fiktif dan tambahkan
  komentar "# TODO: aktifkan saat booking app deployed"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FILE 3: reverse-proxy/html/test.html

Buat halaman HTML lengkap (single file, no framework) untuk menguji routing
end-to-end dari domain → Cloudflare → tunnel → nginx → backend.

Halaman harus:
  1. Tampil di rsudsulfat.site/test
  2. Menampilkan info koneksi (apakah melalui Cloudflare, IP, header)
  3. Tombol tes konektivitas ke setiap service:
       [ Ping Attendance API ]   → fetch /health, tampilkan JSON response
       [ Ping WA Gateway ]       → fetch https://wa.rsudsulfat.site/health
       [ Ping Booking ]          → fetch https://booking.rsudsulfat.site/health
  4. Tampilkan timestamp server (dari header Date response)
  5. Tampilkan latency (waktu fetch dalam ms)
  6. Tampilkan apakah Cloudflare ray ID ada di response header
  7. Desain: clean, modern, bisa dibaca di mobile
     Gunakan hanya HTML + CSS inline + vanilla JS (tidak boleh ada CDN/library)
     Warna hijau sebagai aksen utama (sesuai brand RSUD)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHECKLIST KONFIGURASI

  [ ] nginx listen 80 saja (SSL di Cloudflare)
  [ ] ports binding ke 127.0.0.1:8080 (tidak expose ke public IP VM)
  [ ] CF-Connecting-IP diteruskan ke semua upstream
  [ ] index.html: no-cache, asset statis: cache 1y
  [ ] Security header: X-Frame-Options, X-Content-Type-Options
  [ ] Rate limit aktif untuk /api/ wa-gateway
  [ ] client_max_body_size 20m
  [ ] proxy_read_timeout 30s, proxy_connect_timeout 10s
  [ ] Upstream timeout sesuai (api lebih lama dari static)
  [ ] Log format include $http_cf_connecting_ip dan $http_cf_ray_id
  [ ] test.html tersedia di /test tanpa auth
  [ ] Semua container network terhubung dengan benar
```

---

## nginx.conf Lengkap (Siap Pakai)

```nginx
# ============================================================
# NGINX Reverse Proxy – RSUD Sulfat Multi-App Hub
# Domain  : rsudsulfat.site
# SSL     : Cloudflare (Zero Trust Tunnel) — NO SSL di sini
# VM Host : 192.10.10.152 (Docker Host)
# DB Host : 192.10.10.151 (PostgreSQL + MongoDB)
# ============================================================

# Rate limit zone — digunakan untuk WA Gateway
limit_req_zone $http_cf_connecting_ip zone=wa_api:10m rate=10r/s;
limit_req_zone $http_cf_connecting_ip zone=general:10m rate=30r/s;

# ──────────────────────────────────────────────────────────
# Log format: include Cloudflare info untuk tracing
# ──────────────────────────────────────────────────────────
log_format cf_combined '$remote_addr [$time_local] '
                       '"$request" $status $body_bytes_sent '
                       'rt=$request_time '
                       'cf_ip=$http_cf_connecting_ip '
                       'cf_ray=$http_cf_ray_id '
                       'ua="$http_user_agent"';

# ──────────────────────────────────────────────────────────
# SERVER 1: rsudsulfat.site — App Absensi + PgAdmin
# ──────────────────────────────────────────────────────────
server {
  listen 80;
  server_name rsudsulfat.site;

  access_log /var/log/nginx/attendance.access.log cf_combined;
  error_log  /var/log/nginx/attendance.error.log warn;

  client_max_body_size 20m;
  proxy_connect_timeout 10s;
  proxy_read_timeout    30s;
  proxy_send_timeout    30s;

  # Security header global untuk server ini
  add_header X-Frame-Options        "SAMEORIGIN"                   always;
  add_header X-Content-Type-Options "nosniff"                      always;
  add_header Referrer-Policy        "strict-origin-when-cross-origin" always;

  # ── Halaman uji routing ─────────────────────────────────
  location = /test {
    alias /usr/share/nginx/html/static/test.html;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header X-Frame-Options "SAMEORIGIN" always;
  }

  # ── Health check ────────────────────────────────────────
  location = /health {
    proxy_pass http://attendance-backend:8000/health;
    proxy_set_header Host              $host;
    proxy_set_header CF-Connecting-IP  $http_cf_connecting_ip;
    proxy_set_header X-Real-IP         $http_cf_connecting_ip;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    add_header Cache-Control "no-cache";
  }

  # ── Backend API ─────────────────────────────────────────
  location /api/ {
    proxy_pass         http://attendance-backend:8000/api/;
    proxy_set_header   Host              $host;
    proxy_set_header   CF-Connecting-IP  $http_cf_connecting_ip;
    proxy_set_header   X-Real-IP         $http_cf_connecting_ip;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_redirect     off;
    proxy_buffering    off;
    add_header Cache-Control "no-cache, no-store" always;

    limit_req zone=general burst=50 nodelay;
  }

  # ── PgAdmin ─────────────────────────────────────────────
  location /pgadmin/ {
    proxy_pass         http://attendance-db-pgadmin:80/;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $http_cf_connecting_ip;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_set_header   X-Script-Name     /pgadmin;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade           $http_upgrade;
    proxy_set_header   Connection        "upgrade";
    proxy_redirect     ~^/(.*)$          /pgadmin/$1;
  }

  # ── Asset statis (hash filename Vite) — cache 1 tahun ──
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
    proxy_pass         http://attendance-frontend:80;
    proxy_set_header   Host $host;
    proxy_cache_bypass $http_pragma $http_authorization;
    expires            1y;
    add_header         Cache-Control "public, immutable";
  }

  # ── Frontend SPA – index.html selalu fresh ──────────────
  location / {
    proxy_pass         http://attendance-frontend:80;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $http_cf_connecting_ip;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade           $http_upgrade;
    proxy_set_header   Connection        "upgrade";
    proxy_cache_bypass $http_upgrade;
    proxy_hide_header  Cache-Control;
    add_header         Cache-Control "no-cache, no-store, must-revalidate";
  }
}

# ──────────────────────────────────────────────────────────
# SERVER 2: wa.rsudsulfat.site — WhatsApp Gateway
# ──────────────────────────────────────────────────────────
server {
  listen 80;
  server_name wa.rsudsulfat.site;

  access_log /var/log/nginx/wa-gateway.access.log cf_combined;
  error_log  /var/log/nginx/wa-gateway.error.log warn;

  client_max_body_size 1m;
  proxy_connect_timeout 10s;
  proxy_read_timeout    30s;

  add_header X-Frame-Options        "DENY"    always;
  add_header X-Content-Type-Options "nosniff" always;

  location = /health {
    proxy_pass http://wa-gateway:8000/health;
    proxy_set_header Host             $host;
    proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
    proxy_set_header X-Real-IP        $http_cf_connecting_ip;
    proxy_set_header X-Forwarded-For  $proxy_add_x_forwarded_for;
    add_header Cache-Control "no-cache";
  }

  # Docs hanya untuk internal/debug — bisa diblokir di production
  location /docs {
    proxy_pass http://wa-gateway:8000/docs;
    proxy_set_header Host             $host;
    proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
    # Batasi akses docs ke IP internal jika perlu:
    # allow 192.10.10.0/24;
    # deny all;
  }

  location /api/ {
    proxy_pass         http://wa-gateway:8000/api/;
    proxy_set_header   Host              $host;
    proxy_set_header   CF-Connecting-IP  $http_cf_connecting_ip;
    proxy_set_header   X-Real-IP         $http_cf_connecting_ip;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_redirect     off;
    proxy_buffering    off;
    add_header Cache-Control "no-cache, no-store" always;

    # Rate limit ketat — WA gateway tidak boleh dibombardir
    limit_req zone=wa_api burst=20 nodelay;
    limit_req_status 429;
  }

  # Tidak ada frontend — tolak akses root
  location / {
    return 404 '{"success":false,"message":"Not found"}';
    add_header Content-Type application/json;
  }
}

# ──────────────────────────────────────────────────────────
# SERVER 3: booking.rsudsulfat.site — Booking App
# TODO: aktifkan saat booking app deployed
# ──────────────────────────────────────────────────────────
server {
  listen 80;
  server_name booking.rsudsulfat.site;

  access_log /var/log/nginx/booking.access.log cf_combined;

  client_max_body_size 10m;
  proxy_connect_timeout 10s;
  proxy_read_timeout    30s;

  add_header X-Frame-Options        "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff"    always;

  location = /health {
    # TODO: uncomment saat booking-backend ready
    # proxy_pass http://booking-backend:8000/health;
    return 200 '{"status":"not_deployed"}';
    add_header Content-Type application/json;
  }

  location /api/ {
    # TODO: uncomment saat booking-backend ready
    # proxy_pass http://booking-backend:8000/api/;
    return 503 '{"success":false,"message":"Booking service coming soon"}';
    add_header Content-Type application/json;
  }

  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    # TODO: uncomment saat booking-frontend ready
    # proxy_pass http://booking-frontend:80;
    return 404;
  }

  location / {
    # TODO: uncomment saat booking-frontend ready
    # proxy_pass http://booking-frontend:80;
    return 503 '{"success":false,"message":"Booking app coming soon"}';
    add_header Content-Type application/json;
  }
}
```

---

## Halaman Uji Routing — test.html

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Uji Routing – RSUD Sulfat</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f0fdf4;
      color: #1a1a1a;
      min-height: 100vh;
      padding: 2rem 1rem;
    }
    .container { max-width: 680px; margin: 0 auto; }
    h1 { font-size: 1.6rem; color: #166534; margin-bottom: .25rem; }
    .subtitle { color: #6b7280; font-size: .9rem; margin-bottom: 2rem; }

    /* Info cards */
    .info-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: .75rem;
      margin-bottom: 2rem;
    }
    @media(max-width:480px){ .info-grid { grid-template-columns: 1fr; } }
    .info-card {
      background: #fff; border: 1px solid #d1fae5; border-radius: .75rem;
      padding: .9rem 1rem;
    }
    .info-card .label { font-size: .72rem; color: #6b7280; text-transform: uppercase;
      letter-spacing: .05em; margin-bottom: .25rem; }
    .info-card .value { font-size: .9rem; font-weight: 600; color: #111827;
      word-break: break-all; }

    /* Service tests */
    h2 { font-size: 1.1rem; color: #166534; margin-bottom: 1rem; }
    .service-list { display: flex; flex-direction: column; gap: .75rem;
      margin-bottom: 2rem; }
    .service-row {
      background: #fff; border: 1px solid #e5e7eb; border-radius: .75rem;
      padding: .9rem 1rem; display: flex; align-items: center;
      flex-wrap: wrap; gap: .5rem;
    }
    .service-name { font-weight: 600; font-size: .9rem; flex: 1; min-width: 140px; }
    .service-url  { font-size: .78rem; color: #6b7280; flex-basis: 100%; }
    .btn {
      background: #16a34a; color: #fff; border: none; border-radius: .5rem;
      padding: .45rem .9rem; font-size: .82rem; cursor: pointer;
      transition: background .15s;
    }
    .btn:hover  { background: #15803d; }
    .btn:active { background: #166534; }
    .btn:disabled { background: #9ca3af; cursor: not-allowed; }

    .result {
      flex-basis: 100%; margin-top: .4rem; padding: .5rem .75rem;
      border-radius: .5rem; font-size: .8rem; font-family: monospace;
      white-space: pre-wrap; word-break: break-all; display: none;
    }
    .result.ok    { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .result.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .result.info  { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }

    .badge {
      display: inline-block; font-size: .7rem; padding: .2rem .5rem;
      border-radius: 9999px; font-weight: 600; margin-left: .4rem;
    }
    .badge-cf  { background: #fef3c7; color: #92400e; }
    .badge-ok  { background: #dcfce7; color: #166534; }
    .badge-err { background: #fee2e2; color: #b91c1c; }

    footer { text-align: center; color: #9ca3af; font-size: .78rem; margin-top: 1rem; }
  </style>
</head>
<body>
<div class="container">

  <h1>🏥 Uji Routing – RSUD Sulfat</h1>
  <p class="subtitle">
    Halaman diagnostik untuk memverifikasi koneksi
    <strong>Domain → Cloudflare → Tunnel → Nginx → Backend</strong>
  </p>

  <!-- Info koneksi -->
  <div class="info-grid">
    <div class="info-card">
      <div class="label">Domain</div>
      <div class="value" id="inf-host">—</div>
    </div>
    <div class="info-card">
      <div class="label">Protokol</div>
      <div class="value" id="inf-proto">—</div>
    </div>
    <div class="info-card">
      <div class="label">Cloudflare Ray ID</div>
      <div class="value" id="inf-ray">Periksa dari /health…</div>
    </div>
    <div class="info-card">
      <div class="label">Waktu Lokal</div>
      <div class="value" id="inf-time">—</div>
    </div>
    <div class="info-card">
      <div class="label">User Agent</div>
      <div class="value" id="inf-ua">—</div>
    </div>
    <div class="info-card">
      <div class="label">Status Tunnel</div>
      <div class="value" id="inf-tunnel">Memeriksa…</div>
    </div>
  </div>

  <h2>Uji Konektivitas Service</h2>
  <div class="service-list">

    <!-- Attendance -->
    <div class="service-row" id="svc-attendance">
      <span class="service-name">Attendance Backend</span>
      <button class="btn" onclick="pingService('attendance', '/health')">Ping</button>
      <span class="service-url">/health → attendance-backend:8000</span>
      <div class="result" id="res-attendance"></div>
    </div>

    <!-- WA Gateway -->
    <div class="service-row" id="svc-wa">
      <span class="service-name">WA Gateway</span>
      <button class="btn" onclick="pingService('wa', 'https://wa.rsudsulfat.site/health')">Ping</button>
      <span class="service-url">wa.rsudsulfat.site/health → wa-gateway:8000</span>
      <div class="result" id="res-wa"></div>
    </div>

    <!-- Booking -->
    <div class="service-row" id="svc-booking">
      <span class="service-name">Booking <span class="badge badge-cf">Coming Soon</span></span>
      <button class="btn" onclick="pingService('booking', 'https://booking.rsudsulfat.site/health')">Ping</button>
      <span class="service-url">booking.rsudsulfat.site/health → booking-backend:8000</span>
      <div class="result" id="res-booking"></div>
    </div>

    <!-- Nginx itself -->
    <div class="service-row" id="svc-nginx">
      <span class="service-name">Nginx (gateway ini)</span>
      <button class="btn" onclick="pingService('nginx', '/test')">Ping</button>
      <span class="service-url">rsudsulfat.site/test → nginx static</span>
      <div class="result" id="res-nginx"></div>
    </div>

  </div>

  <footer>
    © 2026 RSUD Sulfat · Halaman diagnostik internal ·
    <span id="inf-ts">—</span>
  </footer>

</div>

<script>
  // ── Isi info koneksi ─────────────────────────────────────
  document.getElementById('inf-host').textContent  = location.hostname;
  document.getElementById('inf-proto').textContent = location.protocol.replace(':','').toUpperCase();
  document.getElementById('inf-ua').textContent    = navigator.userAgent.slice(0, 60) + '…';

  const now = new Date();
  document.getElementById('inf-time').textContent = now.toLocaleString('id-ID');
  document.getElementById('inf-ts').textContent   = 'Build: ' + now.toLocaleDateString('id-ID');

  // ── Ping service ─────────────────────────────────────────
  async function pingService(key, url) {
    const btn    = document.querySelector(`#svc-${key} .btn`);
    const result = document.getElementById(`res-${key}`);

    btn.disabled   = true;
    btn.textContent = '…';
    result.style.display = 'block';
    result.className = 'result info';
    result.textContent  = 'Menghubungi ' + url + ' …';

    const t0 = performance.now();
    try {
      const response = await fetch(url, {
        method: 'GET',
        cache:  'no-store',
        signal: AbortSignal.timeout(8000),
      });
      const ms      = Math.round(performance.now() - t0);
      const cfRay   = response.headers.get('cf-ray') || response.headers.get('CF-Ray');
      const cfCache = response.headers.get('cf-cache-status') || '—';
      const server  = response.headers.get('server') || '—';
      const date    = response.headers.get('date') || '—';

      // Update Cloudflare ray ID dari response
      if (cfRay && key === 'attendance') {
        document.getElementById('inf-ray').innerHTML =
          cfRay + ' <span class="badge badge-cf">CF</span>';
        document.getElementById('inf-tunnel').innerHTML =
          '<span class="badge badge-ok">Tunnel OK ✓</span>';
      }

      let body = '';
      try { body = JSON.stringify(await response.json(), null, 2); }
      catch { body = await response.text(); }

      result.className = response.ok ? 'result ok' : 'result error';
      result.textContent = [
        `Status  : ${response.status} ${response.statusText}`,
        `Latency : ${ms} ms`,
        `Server  : ${server}`,
        `CF-Ray  : ${cfRay || '(tidak ada — belum melalui Cloudflare)'}`,
        `CF-Cache: ${cfCache}`,
        `Date    : ${date}`,
        `─────────────────────────────`,
        `Body:\n${body}`,
      ].join('\n');

    } catch (err) {
      const ms = Math.round(performance.now() - t0);
      result.className = 'result error';
      result.textContent = [
        `Error   : ${err.name} — ${err.message}`,
        `Latency : ${ms} ms`,
        '',
        'Kemungkinan penyebab:',
        '  • Container belum jalan (docker ps)',
        '  • Subdomain belum dikonfigurasi di Cloudflare',
        '  • Tunnel cloudflared tidak aktif',
        '  • CORS block (normal untuk cross-origin dari /test)',
      ].join('\n');

      if (key === 'attendance') {
        document.getElementById('inf-tunnel').innerHTML =
          '<span class="badge badge-err">Tunnel ERROR ✗</span>';
      }
    } finally {
      btn.disabled   = false;
      btn.textContent = 'Ping';
    }
  }

  // ── Auto-ping attendance saat halaman dimuat ────────────
  window.addEventListener('load', () => pingService('attendance', '/health'));
</script>
</body>
</html>
```

---

## docker-compose.yml Reverse Proxy (Siap Pakai)

```yaml
# /opt/rsud/reverse-proxy/docker-compose.yml
version: '3.9'

services:
  nginx:
    container_name: reverse-proxy
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./html:/usr/share/nginx/html/static:ro
      - nginx_logs:/var/log/nginx
    networks:
      - proxy_net
      - attendance_net
      - wa_net
      # - booking_net    # uncomment saat booking deployed
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  nginx_logs:

networks:
  proxy_net:
    driver: bridge
  attendance_net:
    external: true
    name: attendance_app_net
  wa_net:
    external: true
    name: wa_gateway_app_net
  # booking_net:
  #   external: true
  #   name: booking_app_net
```

---

## Urutan Deploy di VM 1 (192.10.10.152)

```bash
# 1. Clone / setup semua project ke /opt/rsud/
mkdir -p /opt/rsud/{reverse-proxy/html,attendance,wa-gateway}

# 2. Start database host VM 2 terlebih dahulu (PostgreSQL + MongoDB)
#    Pastikan 192.10.10.151:5432 sudah bisa diping dari VM 1

# 3. Start attendance stack — ini membuat network attendance_app_net
cd /opt/rsud/attendance
docker compose up -d

# 4. Start wa-gateway stack — membuat network wa_gateway_app_net
cd /opt/rsud/wa-gateway
docker compose up -d

# 5. Copy nginx.conf dan test.html ke tempatnya
cp nginx.conf /opt/rsud/reverse-proxy/nginx.conf
cp test.html  /opt/rsud/reverse-proxy/html/test.html

# 6. Start reverse proxy
cd /opt/rsud/reverse-proxy
docker compose up -d

# 7. Verifikasi nginx config valid sebelum start:
docker compose exec nginx nginx -t

# 8. Test lokal di VM 1
curl -s http://127.0.0.1:8080/health | python3 -m json.tool
curl -s -H "Host: wa.rsudsulfat.site" http://127.0.0.1:8080/health

# 9. Setup cloudflared tunnel (jika belum)
#    cloudflared tunnel create rsud-tunnel
#    cloudflared tunnel route dns rsud-tunnel rsudsulfat.site
#    cloudflared tunnel route dns rsud-tunnel wa.rsudsulfat.site
#    cloudflared tunnel route dns rsud-tunnel booking.rsudsulfat.site
#    cloudflared service install   # agar jalan sebagai service systemd

# 10. Uji end-to-end dari browser
#     https://rsudsulfat.site/test
```

---

## Cloudflare DNS yang Perlu Dikonfigurasi

| Record | Type | Value | Proxy |
|---|---|---|---|
| `rsudsulfat.site` | CNAME | `<tunnel-id>.cfargotunnel.com` | ✅ Proxied |
| `wa.rsudsulfat.site` | CNAME | `<tunnel-id>.cfargotunnel.com` | ✅ Proxied |
| `booking.rsudsulfat.site` | CNAME | `<tunnel-id>.cfargotunnel.com` | ✅ Proxied |

Semua subdomain mengarah ke **tunnel yang sama** — nginx yang membedakan
routing berdasarkan `server_name`.

---

## Pertimbangan Keamanan

| Aspek | Implementasi |
|---|---|
| SSL/TLS | Cloudflare Full (Strict) — enkripsi Cloudflare ↔ origin aktif |
| Expose port | Nginx hanya listen `127.0.0.1:8080` — tidak bisa diakses dari IP publik VM |
| IP asli user | `CF-Connecting-IP` header diteruskan ke semua upstream |
| Rate limit | Diterapkan di nginx untuk `/api/` wa-gateway (10r/s) |
| PgAdmin | Akses via `/pgadmin/` — pertimbangkan tambahan Basic Auth nginx |
| Docs endpoint | `/docs` wa-gateway bisa dibatasi via `allow 192.10.10.0/24; deny all;` |
| Log retention | `max-size: 10m, max-file: 5` — log tidak mengisi disk |
| Tunnel secret | `cloudflared` credentials di `/root/.cloudflared/` — backup ke tempat aman |

---

*Dokumen ini dibuat untuk infrastruktur RSUD Sulfat Proxmox 2-VM setup.*  
*Tanggal: 3 Maret 2026*
