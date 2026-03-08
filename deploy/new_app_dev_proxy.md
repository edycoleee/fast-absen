# Panduan Konfigurasi Reverse Proxy — kos.sulfat.site
> Dijalankan di server **192.10.10.15** (SSL termination).
> App Stack ada di **192.10.10.152:3001** (kos-nginx container).

---

## Daftar Isi

1. [Prasyarat](#prasyarat)
2. [Buat File Konfigurasi Nginx](#buat-file-konfigurasi-nginx)
3. [Aktifkan Site](#aktifkan-site)
4. [Dapatkan Sertifikat SSL (Let's Encrypt)](#dapatkan-sertifikat-ssl-lets-encrypt)
5. [Konfigurasi Final Setelah Certbot](#konfigurasi-final-setelah-certbot)
6. [Verifikasi](#verifikasi)
7. [Checklist Hardening Reverse Proxy](#checklist-hardening-reverse-proxy)

---

## Prasyarat

Pastikan kondisi ini terpenuhi sebelum mulai:

```bash
# Di server 192.10.10.15 ─────────────────────────────────────

# 1. Nginx sudah terinstall dan berjalan
nginx -v
systemctl status nginx

# 2. Certbot sudah terinstall
certbot --version

# 3. Port 80 dan 443 terbuka di firewall
sudo ufw status  # atau iptables -L

# 4. DNS kos.sulfat.site sudah mengarah ke IP publik 192.10.10.15
dig +short kos.sulfat.site
# Harus mengembalikan IP publik server ini

# 5. Port 3001 di 192.10.10.152 bisa dijangkau dari sini
curl -s http://192.10.10.152:3001/health
# Harus mengembalikan: {"status":"healthy"}
# (kos-nginx container di app server harus sudah jalan)
```

---

## Buat File Konfigurasi Nginx

```bash
sudo nano /etc/nginx/sites-available/kos.sulfat.site
```

Isi dengan konfigurasi berikut (blok HTTP dulu — certbot akan menambah blok HTTPS):

```nginx
# ============================================================
# kos.sulfat.site — Reverse Proxy
# Server: 192.10.10.15 (SSL termination)
# Upstream: 192.10.10.152:3001 (kos-nginx container)
# ============================================================

# ── HTTP: redirect ke HTTPS ───────────────────────────────────
server {
    listen 80;
    listen [::]:80;
    server_name kos.sulfat.site;

    # Certbot akan mengisi bagian ini secara otomatis.
    # Jangan tambahkan isi lain di sini sebelum certbot dijalankan.
}
```

Simpan, lalu lanjut ke langkah aktifkan site.

---

## Aktifkan Site

```bash
# Buat symlink ke sites-enabled
sudo ln -s /etc/nginx/sites-available/kos.sulfat.site \
           /etc/nginx/sites-enabled/kos.sulfat.site

# Pastikan tidak ada konflik (uji konfigurasi)
sudo nginx -t

# Reload Nginx agar perubahan aktif
sudo systemctl reload nginx
```

---

## Dapatkan Sertifikat SSL (Let's Encrypt)

```bash
# Certbot akan otomatis memodifikasi file konfigurasi Nginx
# dan menambahkan blok HTTPS + redirect.
sudo certbot --nginx -d kos.sulfat.site

# Ikuti prompt certbot:
# - Masukkan email untuk notifikasi expiry
# - Setujui ToS
# - Pilih opsi redirect (pilih 2: Redirect — recommended)
```

Setelah certbot selesai, verifikasi auto-renew:

```bash
sudo certbot renew --dry-run
# Harus sukses tanpa error
```

---

## Konfigurasi Final Setelah Certbot

Setelah certbot berjalan, buka kembali file konfigurasi dan **ganti seluruh isinya** dengan
konfigurasi lengkap berikut (certbot terkadang menghasilkan konfigurasi minimal):

```bash
sudo nano /etc/nginx/sites-available/kos.sulfat.site
```

```nginx
# ============================================================
# kos.sulfat.site — Reverse Proxy (192.10.10.15)
# ============================================================
# Upstream : 192.10.10.152:3001  (kos-nginx container)
# SSL      : Let's Encrypt via Certbot
# ============================================================

# ── HTTP → HTTPS redirect ─────────────────────────────────────
server {
    listen 80;
    listen [::]:80;
    server_name kos.sulfat.site;

    # Certbot well-known challenge (jangan hapus)
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# ── HTTPS (SSL termination) ───────────────────────────────────
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name kos.sulfat.site;

    # ── SSL Certificate (Let's Encrypt) ──────────────────────
    ssl_certificate     /etc/letsencrypt/live/kos.sulfat.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kos.sulfat.site/privkey.pem;

    # ── SSL Hardening ─────────────────────────────────────────
    ssl_protocols             TLSv1.2 TLSv1.3;
    ssl_ciphers               ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache         shared:SSL_kos:10m;
    ssl_session_timeout       1d;
    ssl_session_tickets       off;

    # HSTS — browser wajib HTTPS selama 1 tahun, termasuk subdomain
    # Aktifkan hanya setelah yakin HTTPS berjalan sempurna.
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # ── Logging ───────────────────────────────────────────────
    access_log /var/log/nginx/kos_access.log;
    error_log  /var/log/nginx/kos_error.log warn;

    # ── Proxy ke App Stack (kos-nginx container) ──────────────
    location / {
        proxy_pass         http://192.10.10.152:3001;
        proxy_http_version 1.1;

        # Forward IP asli klien ke kos-nginx di app server
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Connection        "";

        # Timeout upstream
        proxy_connect_timeout 10s;
        proxy_read_timeout    120s;
        proxy_send_timeout    120s;

        # Buffer — nonaktifkan agar streaming/SSE tidak tertunda
        proxy_buffering    off;
        proxy_buffer_size  4k;
    }
}
```

Terapkan:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Verifikasi

```bash
# ── Di server 192.10.10.15 ─────────────────────────────────────

# 1. Cek konfigurasi Nginx
sudo nginx -t
# Ekspektasi: syntax is ok / test is successful

# 2. Uji redirect HTTP → HTTPS
curl -I http://kos.sulfat.site
# Ekspektasi: HTTP/1.1 301 Moved Permanently
#             Location: https://kos.sulfat.site/

# 3. Uji HTTPS health check
curl -s https://kos.sulfat.site/health
# Ekspektasi: {"status":"healthy"}

# 4. Cek header keamanan dari response
curl -I https://kos.sulfat.site
# Ekspektasi (dari kos-nginx di app server):
#   X-Frame-Options: SAMEORIGIN
#   X-Content-Type-Options: nosniff
#   Content-Security-Policy: ...

# 5. Cek sertifikat SSL
echo | openssl s_client -connect kos.sulfat.site:443 -servername kos.sulfat.site 2>/dev/null \
  | openssl x509 -noout -dates -subject
# Tampilkan: notAfter (tanggal kedaluwarsa) dan CN=kos.sulfat.site

# 6. Cek SSL grade (opsional, dari mesin lain)
# Kunjungi: https://www.ssllabs.com/ssltest/analyze.html?d=kos.sulfat.site

# 7. Cek log akses real-time saat ada request
sudo tail -f /var/log/nginx/kos_access.log
# Buka https://kos.sulfat.site di browser, pastikan log muncul

# 8. Pastikan log error bersih
sudo tail -20 /var/log/nginx/kos_error.log
```

---

## Checklist Hardening Reverse Proxy

### Firewall pada 192.10.10.15

```bash
# Izinkan HTTP dan HTTPS dari mana saja (akses publik)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Izinkan SSH dari IP manajemen saja (ganti 10.0.0.X)
sudo ufw allow from 10.0.0.X to any port 22 proto tcp
sudo ufw deny 22

sudo ufw enable
sudo ufw status verbose
```

### Firewall pada 192.10.10.152 (App Server)

```bash
# Port 3001 (kos stack): hanya izinkan dari reverse proxy
sudo ufw allow from 192.10.10.15 to any port 3001 proto tcp

# Pastikan port 3001 tidak bisa diakses publik langsung
sudo ufw deny 3001

sudo ufw reload
```

### Auto-Renew Certbot

```bash
# Cek timer systemd certbot (biasanya sudah aktif otomatis)
systemctl status certbot.timer

# Jika belum aktif:
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Uji dry-run
sudo certbot renew --dry-run
```

### Log Rotation (sudah default di Nginx, verifikasi)

```bash
cat /etc/logrotate.d/nginx
# Pastikan /var/log/nginx/*.log sudah masuk konfigurasi rotate
```

### Checklist Final

- [x] DNS `kos.sulfat.site` → IP publik 192.10.10.15
- [x] HTTP 80 redirect ke HTTPS 443
- [x] SSL TLSv1.2 + TLSv1.3 only, cipher modern
- [x] `X-Real-IP` diteruskan ke app server (IP asli klien)
- [x] `X-Forwarded-Proto: https` diteruskan (FastAPI bisa deteksi HTTPS)
- [x] Log terpisah: `/var/log/nginx/kos_access.log`
- [x] Port 3001 di app server hanya bisa diakses dari 192.10.10.15
- [x] Auto-renew certbot aktif (`certbot.timer`)
- [ ] HSTS aktif (`Strict-Transport-Security`) — aktifkan setelah konfirmasi HTTPS stabil
- [ ] Rate limit di reverse proxy (opsional, sudah ada di kos-nginx app server)
- [ ] Monitoring SSL expiry (mis. UptimeRobot SSL monitor → kos.sulfat.site)

---

## Referensi Cepat — Perintah Berguna

```bash
# Reload konfigurasi tanpa downtime
sudo systemctl reload nginx

# Test konfigurasi sebelum reload
sudo nginx -t

# Lihat semua site yang aktif
ls -la /etc/nginx/sites-enabled/

# Cek status Nginx
sudo systemctl status nginx

# Cek log error langsung
sudo journalctl -u nginx -f

# Perpanjang sertifikat manual (jika timer tidak jalan)
sudo certbot renew

# Cek tanggal kedaluwarsa semua sertifikat
sudo certbot certificates
```
