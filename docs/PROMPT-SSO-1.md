# SSO RSUD Sulfat – Panduan Implementasi & Cara Integrasi

Dokumen ini menjelaskan **status SSO saat ini** (branch `12sso`), apa yang sudah live, format token yang berlaku, dan **cara konkret bagi aplikasi konsumen** (SIMRS, finance, surat-menyurat, dll.) untuk mengintegrasikan diri ke SSO ini.

---

## 1. Status Saat Ini

SSO dibangun di atas aplikasi absensi yang sudah berjalan di `absen.sulfat.site`.
Tidak ada server baru — aplikasi yang sama berevolusi menjadi identity provider.

### Yang Sudah Live (branch `12sso`)

| Komponen | Status |
|---|---|
| Token payload dengan `nik`, `unit_id`, `full_name`, `session_id` | ✅ Live |
| `POST /api/v1/auth/introspect` — validasi token untuk app konsumen | ✅ Live |
| `GET /api/v1/auth/me/sso-identity` — identitas SSO user aktif | ✅ Live |
| Tabel `app_clients` — registry aplikasi yang diizinkan pakai SSO | ✅ Live |
| `GET/POST/PUT/PATCH /api/v1/sso/app-clients` — manajemen registry | ✅ Live |
| Kolom `nik` di tabel `pegawai` | ✅ Live (migration 001_sso_phase1) |
| Alembic — auto-migration saat container start | ✅ Live |
| Halaman admin SSO Monitor (App Clients, Token Introspect, SSO Identity) | ✅ Live |

### Yang Belum Ada

- JWKS / public key endpoint (saat ini HMAC HS256, bukan RS256)
- Authorization code flow (tidak diperlukan untuk internal apps)
- Single sign-out lintas aplikasi
- Rate limiting di level endpoint (perlu dikonfigurasi di nginx/gateway)

---

## 2. Format Token JWT

Setiap access token yang diterbitkan SSO ini membawa klaim berikut:

```json
{
  "sub": "1",
  "username": "budi.santoso",
  "roles": ["admin", "user"],
  "nik": "3578010101900001",
  "id_pegawai": "P042",
  "unit_id": 3,
  "full_name": "Budi Santoso, S.Kep",
  "session_id": "a1b2c3d4-...",
  "iat": 1712700000,
  "exp": 1712710800,
  "iss": "auth-server",
  "aud": "internal-apps"
}
```

| Klaim | Tipe | Keterangan |
|---|---|---|
| `sub` | string | ID user internal (integer sebagai string) |
| `username` | string | Username login |
| `roles` | array | Role global di SSO (`admin`, `user`, dll.) |
| `nik` | string \| null | NIK — **kunci identitas lintas aplikasi** |
| `id_pegawai` | string | ID pegawai internal (`P042`) |
| `unit_id` | integer \| null | ID unit kerja utama |
| `full_name` | string \| null | Nama lengkap pegawai |
| `session_id` | string | UUID sesi aktif |
| `iss` | string | `"auth-server"` |
| `aud` | string | `"internal-apps"` |
| `exp` | int | Unix timestamp expiry (3 jam dari login) |

> **Catatan NIK:**  Jika kolom `nik` di tabel `pegawai` belum diisi, klaim `nik` akan `null`. Wajib isi NIK di halaman **Admin → Pegawai → Edit** sebelum menghubungkan aplikasi konsumen.

---

## 3. Cara Aplikasi Konsumen Mengintegrasikan SSO

Ada dua skenario: **frontend yang login lewat browser** dan **backend service (machine-to-machine)**.

### 3.1 Skenario A — Frontend / Browser App (SIMRS Web, Finance Web)

Alur:

1. User membuka aplikasi konsumen.
2. Aplikasi konsumen **redirect** user ke halaman login SSO: `https://absen.sulfat.site/login-admin`
3. User login. SSO menerbitkan access token.
4. Aplikasi konsumen menyimpan token (localStorage atau memory).
5. Setiap request ke backend konsumen, sertakan token di header.
6. Backend konsumen memanggil `/auth/introspect` untuk verifikasi.

> Untuk internal apps yang tidak membutuhkan OAuth redirect flow, cara yang paling pragmatis adalah user login di SSO, salin token, dan kirim ke aplikasi konsumen via query param atau session cookie internal. Implementasi redirect SSO penuh bisa ditambahkan di fase berikutnya.

### 3.2 Skenario B — Backend Service (machine-to-machine)

Service lain (misal Signature Service) yang perlu memverifikasi token user yang dikirim oleh frontend mereka:

1. Frontend pengguna login ke SSO, dapat access token.
2. Frontend kirim access token ke backend Signature Service.
3. Signature Service memanggil `/auth/introspect` dengan token tersebut.
4. Jika `active: true`, Signature Service resolve permission lokal berdasarkan `nik`.

---

## 4. Endpoint Introspect — Panduan Lengkap

### `POST /api/v1/auth/introspect`

Endpoint ini adalah **satu-satunya endpoint yang perlu dipanggil** oleh aplikasi konsumen untuk memverifikasi user.

**Request:**
```http
POST https://absen.sulfat.site/api/v1/auth/introspect
Authorization: Bearer <access_token_user>
```

Tidak ada request body. Token dikirim via header `Authorization`.

**Response — Token Valid:**
```json
{
  "success": true,
  "message": "Token active",
  "data": {
    "active": true,
    "sub": "1",
    "nik": "3578010101900001",
    "username": "budi.santoso",
    "full_name": "Budi Santoso, S.Kep",
    "unit_id": 3,
    "id_pegawai": "P042",
    "roles": ["user"],
    "iss": "auth-server",
    "exp": 1712710800,
    "session_id": "a1b2c3d4-..."
  }
}
```

**Response — Token Tidak Valid / Kadaluarsa:**
```json
{
  "success": true,
  "message": "Token inactive",
  "data": {
    "active": false,
    "reason": "Token invalid or expired"
  }
}
```

**Contoh implementasi di aplikasi konsumen (Python/FastAPI):**

```python
import httpx
from fastapi import Request, HTTPException

SSO_INTROSPECT_URL = "https://absen.sulfat.site/api/v1/auth/introspect"

async def verify_sso_token(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            SSO_INTROSPECT_URL,
            headers={"Authorization": auth_header},
            timeout=5.0,
        )

    data = resp.json().get("data", {})
    if not data.get("active"):
        raise HTTPException(status_code=401, detail="Token tidak valid")

    return data  # berisi nik, username, full_name, unit_id, roles, dll.
```

**Contoh implementasi di aplikasi konsumen (JavaScript/Node.js):**

```js
const axios = require('axios');

const SSO_URL = 'https://absen.sulfat.site/api/v1/auth/introspect';

async function verifySsoToken(bearerToken) {
  const { data } = await axios.post(SSO_URL, {}, {
    headers: { Authorization: `Bearer ${bearerToken}` },
    timeout: 5000,
  });
  if (!data?.data?.active) throw new Error('Token tidak valid');
  return data.data; // { nik, username, full_name, unit_id, ... }
}
```

---

## 5. Endpoint SSO Identity — Untuk Frontend Admin

### `GET /api/v1/auth/me/sso-identity`

Digunakan oleh frontend yang sudah login untuk mendapatkan identitas SSO-nya sendiri dalam format yang sudah distandarisasi.

**Request:**
```http
GET https://absen.sulfat.site/api/v1/auth/me/sso-identity
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "username": "budi.santoso",
    "id_pegawai": "P042",
    "nik": "3578010101900001",
    "full_name": "Budi Santoso, S.Kep",
    "unit_id": 3,
    "is_active": true,
    "roles": ["user"]
  }
}
```

---

## 6. Mendaftarkan Aplikasi Konsumen (App Client Registry)

Sebelum aplikasi konsumen dapat menggunakan SSO, aplikasinya harus didaftarkan di tabel `app_clients`. Ini untuk keperluan audit, governance, dan kontrol akses.

### Cara Daftarkan via Admin Panel

1. Login ke `absen.sulfat.site` dengan akun admin/super-admin.
2. Buka menu **SSO Monitor** di sidebar.
3. Tab **App Clients** → klik **Daftarkan App**.
4. Isi form:
   - **Client ID**: identifier unik, contoh `simrs-web`, `finance-app`, `surat-service`
   - **Nama Aplikasi**: nama tampilkan, contoh `SIMRS Web RSU Sulfat`
   - **Client Secret**: isi jika backend-to-backend; kosongkan untuk aplikasi frontend/trusted internal
   - **Allowed Scopes**: default `identity:read`

### Cara Daftarkan via API

```http
POST /api/v1/sso/app-clients
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "client_id": "simrs-web",
  "client_name": "SIMRS Web RSU Sulfat",
  "description": "Sistem Informasi Manajemen RS – modul rawat inap & rawat jalan",
  "allowed_scopes": "identity:read",
  "is_active": true
}
```

### Endpoint App Client Registry

| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/api/v1/sso/app-clients` | List semua app client |
| `POST` | `/api/v1/sso/app-clients` | Daftarkan app baru |
| `GET` | `/api/v1/sso/app-clients/{id}` | Detail satu app client |
| `PUT` | `/api/v1/sso/app-clients/{id}` | Update nama, deskripsi, secret, scopes |
| `PATCH` | `/api/v1/sso/app-clients/{id}/disable` | Nonaktifkan |
| `PATCH` | `/api/v1/sso/app-clients/{id}/enable` | Aktifkan kembali |

Semua endpoint di atas memerlukan token admin.

---

## 7. Pola Integrasi di Aplikasi Konsumen

### 7.1 Yang harus dilakukan aplikasi konsumen

```
1. Terima Bearer token dari user (frontend kirim via Authorization header)
2. Panggil POST /api/v1/auth/introspect dengan token tersebut
3. Jika active: false → tolak request, return 401
4. Jika active: true → ambil nilai `nik` dari response
5. Gunakan `nik` untuk lookup permission lokal di DB aplikasi sendiri
6. Lanjutkan proses request sesuai permission lokal
```

### 7.2 Tabel mapping yang perlu dibuat di aplikasi konsumen

Setiap aplikasi konsumen perlu menyimpan mapping akses lokal berbasis NIK:

```sql
-- Contoh untuk aplikasi Finance
CREATE TABLE finance_user_access (
    id          SERIAL PRIMARY KEY,
    nik         VARCHAR(20) NOT NULL UNIQUE,
    role        VARCHAR(50) NOT NULL,   -- finance_admin, approver, viewer
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Contoh untuk Surat-Menyurat
CREATE TABLE surat_user_access (
    id          SERIAL PRIMARY KEY,
    nik         VARCHAR(20) NOT NULL UNIQUE,
    role        VARCHAR(50) NOT NULL,   -- pembuat, verifikator, penandatangan
    is_active   BOOLEAN DEFAULT TRUE
);
```

### 7.3 Yang TIDAK perlu dilakukan aplikasi konsumen

- Buat tabel `users` sendiri — identitas sudah ada di SSO
- Buat form login sendiri — arahkan user ke SSO
- Simpan password — SSO yang handle autentikasi
- Decode JWT sendiri — gunakan endpoint `/introspect` (lebih aman, selalu real-time)

> **Mengapa pakai introspect daripada decode JWT lokal?**
> Decode lokal tidak mendeteksi jika user dinonaktifkan atau sesinya di-revoke setelah token diterbitkan. Endpoint `/introspect` selalu memeriksa status user di database secara real-time.

---

## 8. Checklist Integrasi untuk Tim Aplikasi Konsumen

```
[ ] Daftarkan aplikasi di SSO Monitor (client_id unik)
[ ] Pastikan user yang relevan sudah memiliki NIK di tabel pegawai
[ ] Tambahkan middleware verifikasi token via /auth/introspect
[ ] Buat tabel mapping akses lokal berbasis nik
[ ] Tambahkan fallback: jika introspect timeout → return 503, bukan 200
[ ] Tambahkan error handling: jika nik null → tampilkan pesan "NIK belum terdaftar"
[ ] Log setiap request yang berhasil diverifikasi (audit lokal)
[ ] Jangan cache hasil introspect lebih dari 60 detik
```

---

## 9. Info Teknis Deploy

| Parameter | Nilai |
|---|---|
| Base URL production | `https://absen.sulfat.site` |
| Base URL internal (app server) | `http://192.10.10.152:3000` |
| Algorithm | `HS256` |
| Issuer (`iss`) | `auth-server` |
| Audience (`aud`) | `internal-apps` |
| Access token lifetime | 3 jam (180 menit) |
| Refresh token lifetime | 14 hari |
| DB Server | `192.10.10.151:5432` |
| DB Name | `attendance_db` |

---

## 10. Urutan Onboarding Aplikasi Baru

```
1. Pastikan NIK pegawai yang akan pakai aplikasi sudah terisi
2. Daftarkan client_id aplikasi di SSO Monitor
3. Implementasikan middleware introspect di backend aplikasi
4. Buat tabel akses lokal berbasis NIK
5. Isi data mapping nik → role lokal untuk semua user yang perlu akses
6. Test: login di SSO → salin token → panggil /introspect → pastikan active: true dan nik terisi
7. Sambungkan UI aplikasi untuk redirect/kirim token ke backend
```

---

## 11. Roadmap Fase Berikutnya

| Fase | Deskripsi |
|---|---|
| **Fase 2** | Isi NIK seluruh pegawai aktif — validasi unikness |
| **Fase 3** | Signature Service (service terpisah, DB terpisah, pakai NIK) |
| **Fase 4** | Integrasi SIMRS Web sebagai konsumen pertama |
| **Fase 5** | Integrasi Surat-Menyurat + Signature |
| **Fase 6** | Finance, Inventory |
| **Opsional** | RS256 (asimetris) jika ada kebutuhan verifikasi token offline |
| **Opsional** | Single sign-out lintas aplikasi via webhook/event |
