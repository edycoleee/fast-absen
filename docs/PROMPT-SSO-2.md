# SSO RSUD Sulfat – Login Wajah & Login Password untuk Aplikasi Konsumen

Dokumen ini menjawab satu pertanyaan konkret:

> **Bagaimana aplikasi konsumen (SIMRS, finance, surat-menyurat, dll.) bisa menawarkan login wajah dan/atau login password kepada usernya, tanpa terganggu masalah CORS, dan tanpa membangun ulang infrastruktur autentikasi?**

---

## 1. Akar Masalah CORS

CORS (Cross-Origin Resource Sharing) adalah mekanisme browser yang memblokir request dari satu domain ke domain lain kecuali domain tujuan secara eksplisit mengizinkannya.

Masalah konkretnya:

```
Browser user di simrs.sulfat.site
    ↓
Coba panggil POST https://absen.sulfat.site/api/v1/auth/login
    ↓
Browser: "Tunggu dulu — domain berbeda, ada izin tidak?"
    ↓
SSO tidak kenal simrs.sulfat.site → request diblokir
```

**Solusi naif yang sering dilakukan tapi salah:** Tambahkan semua domain konsumen ke `CORS_ORIGINS` di SSO. Ini memang berhasil, tetapi:

- Setiap aplikasi konsumen baru → harus ubah config SSO → rebuild container
- CORS_ORIGINS semakin panjang dan sulit dikelola
- Jika ada typo di domain, seluruh login bisa gagal
- Coupling antara konfigurasi SSO dan setiap aplikasi konsumen menjadi erat dan rapuh

**Solusi yang benar: Backend Proxy Pattern** — frontend aplikasi konsumen tidak pernah memanggil SSO langsung. Semua request autentikasi masuk ke backend aplikasi konsumen sendiri, dan backend itulah yang meneruskan ke SSO secara server-to-server.

---

## 2. Backend Proxy Pattern — Cara Kerjanya

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser user                                                    │
│  (di simrs.sulfat.site)                                          │
└───────────────┬─────────────────────────────────────────────────┘
                │  POST /auth/login  (same origin, NO CORS)
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend SIMRS  (simrs.sulfat.site/api)                         │
│  ← ini server ke server, tidak ada browser, tidak ada CORS →    │
└───────────────┬─────────────────────────────────────────────────┘
                │  POST https://absen.sulfat.site/api/v1/auth/login
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  SSO (absen.sulfat.site)                                        │
│  Verifikasi → return JWT token                                   │
└───────────────┬─────────────────────────────────────────────────┘
                │  Token kembali ke backend SIMRS
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend SIMRS meneruskan token ke browser user                 │
└─────────────────────────────────────────────────────────────────┘
```

**Keuntungan:**

- CORS tidak pernah terjadi — request browser hanya ke origin-nya sendiri
- SSO tidak perlu tahu domain aplikasi konsumen manapun
- Tidak ada perubahan konfigurasi SSO saat ada aplikasi baru
- Backend konsumen bisa menambahkan logika lokal sebelum/sesudah proxy (audit, rate limit, dll.)

---

## 3. Dua Mode Login yang Didukung SSO

### Mode A — Login Password (username + password)

SSO endpoint: `POST /api/v1/auth/login`

```json
Request body:
{
  "username": "budi.santoso",
  "password": "rahasia123"
}
```

Cocok untuk: hampir semua aplikasi, desktop, mobile, kiosk.

### Mode B — Login Wajah (username + foto)

SSO endpoint: `POST /api/v1/auth/login-face`

```json
Request body:
{
  "username": "budi.santoso",
  "image": "<base64 foto wajah>",
  "threshold": 0.6
}
```

Cocok untuk: kiosk absensi, perangkat dengan kamera terarah, gerbang masuk ruangan.

**Syarat Mode B:** Pegawai harus sudah mendaftarkan wajah di aplikasi absensi terlebih dahulu. Spesimen wajah hanya disimpan di SSO — tidak perlu register ulang di setiap aplikasi.

**Kedua mode menghasilkan token yang identik** — mengandung `nik`, `full_name`, `unit_id`, `session_id`, dan semua klaim SSO.

---

## 4. Tahapan Implementasi di Aplikasi Konsumen

### Tahap 1 — Buat Proxy Endpoint Login di Backend Konsumen

Backend konsumen perlu membuat endpoint login-nya sendiri yang meneruskan request ke SSO.

**Contoh Python/FastAPI:**

```python
import httpx
from fastapi import APIRouter, Request, Response, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/auth")

SSO_BASE = "https://absen.sulfat.site/api/v1"

class LoginPasswordRequest(BaseModel):
    username: str
    password: str

class LoginFaceRequest(BaseModel):
    username: str
    image: str          # base64 foto wajah
    threshold: Optional[float] = 0.6


@router.post("/login")
async def login_password(body: LoginPasswordRequest):
    """Proxy ke SSO — login password."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SSO_BASE}/auth/login",
            json={"username": body.username, "password": body.password},
            timeout=10.0,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code,
                            detail=resp.json().get("detail", "Login gagal"))
    return resp.json()


@router.post("/login-face")
async def login_face(body: LoginFaceRequest):
    """Proxy ke SSO — login wajah."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SSO_BASE}/auth/login-face",
            json={
                "username": body.username,
                "image": body.image,
                "threshold": body.threshold,
            },
            timeout=15.0,   # sedikit lebih lama — face processing
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code,
                            detail=resp.json().get("detail", "Verifikasi wajah gagal"))
    return resp.json()
```

**Contoh Node.js/Express:**

```js
const express = require('express');
const axios = require('axios');
const router = express.Router();

const SSO_BASE = 'https://absen.sulfat.site/api/v1';

// Login password
router.post('/login', async (req, res) => {
  try {
    const { data } = await axios.post(`${SSO_BASE}/auth/login`, {
      username: req.body.username,
      password: req.body.password,
    }, { timeout: 10000 });
    res.json(data);
  } catch (err) {
    const status = err.response?.status ?? 500;
    res.status(status).json(err.response?.data ?? { detail: 'Login gagal' });
  }
});

// Login wajah
router.post('/login-face', async (req, res) => {
  try {
    const { data } = await axios.post(`${SSO_BASE}/auth/login-face`, {
      username: req.body.username,
      image: req.body.image,
      threshold: req.body.threshold ?? 0.6,
    }, { timeout: 15000 });
    res.json(data);
  } catch (err) {
    const status = err.response?.status ?? 500;
    res.status(status).json(err.response?.data ?? { detail: 'Verifikasi wajah gagal' });
  }
});

module.exports = router;
```

---

### Tahap 2 — Buat Proxy Endpoint Introspect di Backend Konsumen

Selain login, endpoint verifikasi token juga perlu diproxy agar backend konsumen tidak perlu memanggil SSO langsung dari middleware (walaupun server-to-server ini sudah aman, menyatukan dalam satu helper lebih rapi).

```python
@router.post("/introspect")
async def introspect(request: Request):
    """Proxy introspect ke SSO — verifikasi token user."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SSO_BASE}/auth/introspect",
            headers={"Authorization": auth_header},
            timeout=5.0,
        )

    data = resp.json().get("data", {})
    if not data.get("active"):
        raise HTTPException(status_code=401, detail="Token tidak valid")

    return data  # { nik, username, full_name, unit_id, roles, ... }
```

---

### Tahap 3 — Frontend Konsumen Hanya Berbicara ke Backend-nya Sendiri

Frontend (React, Vue, atau apapun) hanya memanggil endpoint backend konsumennya sendiri:

```js
// login-service.js di frontend SIMRS — TIDAK ada URL absen.sulfat.site
const API = '/api';  // atau 'https://simrs.sulfat.site/api'

export const loginPassword = (username, password) =>
  fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }).then(r => r.json());

export const loginFace = (username, imageBase64, threshold = 0.6) =>
  fetch(`${API}/auth/login-face`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, image: imageBase64, threshold }),
  }).then(r => r.json());
```

Browser tidak pernah tahu bahwa ada SSO di baliknya. Tidak ada CORS.

---

### Tahap 4 — Tangkap Gambar Wajah di Frontend (untuk Mode Face)

Frontend konsumen perlu akses kamera browser untuk mengambil foto. Ini kode standar yang bisa dipakai di semua aplikasi konsumen:

```js
// Buka kamera dan tangkap frame sebagai base64
async function captureWebcamPhoto() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  const video = document.createElement('video');
  video.srcObject = stream;
  await video.play();

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  // Stop kamera setelah capture
  stream.getTracks().forEach(t => t.stop());

  // Return base64 tanpa prefix data:image/...
  return canvas.toDataURL('image/jpeg').split(',')[1];
}

// Contoh penggunaan di halaman login face:
async function handleFaceLogin(username) {
  const imageBase64 = await captureWebcamPhoto();
  const result = await loginFace(username, imageBase64, 0.6);
  if (result?.data?.access_token) {
    localStorage.setItem('token', result.data.access_token);
    // redirect ke halaman utama
  }
}
```

---

### Tahap 5 — Resolve Permission Lokal Berdasarkan NIK

Setelah login berhasil (apapun modenya), token sudah di tangan. Setiap request selanjutnya ke backend konsumen harus diverifikasi dan permission resolve secara lokal:

```python
# Dependency FastAPI di backend SIMRS
async def get_current_simrs_user(request: Request) -> dict:
    # 1. Verifikasi token ke SSO via introspect
    identity = await introspect(request)  # dapat nik, full_name, dll.
    nik = identity.get("nik")

    if not nik:
        raise HTTPException(400, "NIK tidak ditemukan di token. Hubungi admin SSO.")

    # 2. Lookup permission lokal SIMRS berdasarkan NIK
    user_access = db.query(SimrsUserAccess).filter_by(nik=nik, is_active=True).first()
    if not user_access:
        raise HTTPException(403, "Akun belum terdaftar di SIMRS. Hubungi admin.")

    return {
        **identity,
        "simrs_role": user_access.role,          # dokter, perawat, admin, dll.
        "simrs_unit": user_access.unit_id,
    }
```

---

## 5. Memilih Mode Login yang Tepat per Aplikasi

Tidak semua aplikasi harus menawarkan semua mode. Panduan memilih:

| Aplikasi | Login Password | Login Wajah | Alasan |
|---|---|---|---|
| SIMRS Web (desktop) | ✅ Utama | ⚠️ Opsional | Dokter/perawat biasa pakai PC, kamera kualitas rendah |
| Absensi Kiosk | ⚠️ Fallback | ✅ Utama | Kamera terarah, pencahayaan terkontrol |
| Finance Web | ✅ Utama | ❌ Skip | Approval keuangan butuh akuntabilitas password |
| Surat-Menyurat | ✅ Utama | ❌ Skip | Penandatanganan digital butuh konfirmasi eksplisit |
| Gerbang Ruangan | ❌ Skip | ✅ Utama | Tidak ada keyboard, hanya kamera |

---

## 6. Ringkasan Tahapan per Aplikasi Konsumen

```
PERSIAPAN (sekali saja, koordinasi dengan admin SSO):
  [ ] Daftarkan client_id aplikasi di SSO Monitor
  [ ] Pastikan pegawai yang pakai aplikasi ini sudah punya NIK
  [ ] Jika pakai login wajah: pastikan wajah pegawai sudah terdaftar di SSO
  [ ] Buat tabel akses lokal (app_user_access) berbasis NIK di DB aplikasi

IMPLEMENTASI BACKEND KONSUMEN:
  [ ] Buat endpoint POST /auth/login (proxy ke SSO /auth/login)
  [ ] Buat endpoint POST /auth/login-face (proxy ke SSO /auth/login-face) — jika butuh
  [ ] Buat middleware verify_token yang memanggil SSO /auth/introspect
  [ ] Fungsi resolve permission lokal dari NIK → role aplikasi

IMPLEMENTASI FRONTEND KONSUMEN:
  [ ] Halaman login (form username+password) — memanggil /auth/login milik sendiri
  [ ] Komponen kamera + capture — jika pakai mode wajah
  [ ] Simpan token di localStorage atau memory
  [ ] Kirim token via Authorization header di setiap request

TEST:
  [ ] Login password berhasil → token dapat → introspect → active: true → NIK terisi
  [ ] Login wajah berhasil → token dapat → introspect → active: true → NIK terisi
  [ ] Token expired → introspect → active: false → redirect ke login
  [ ] User belum ada di tabel lokal → dapat pesan 403 yang jelas
  [ ] Kamera browser tidak tersedia → fallback ke login password
```

---

## 7. Cara Mudah Cek Apakah Integrasi Sudah Benar

Gunakan halaman **SSO Monitor → Tab Token Introspect** di `absen.sulfat.site`:

1. Login di aplikasi konsumen (password atau wajah)
2. Salin access token dari localStorage atau response login
3. Buka `absen.sulfat.site` → login admin → SSO Monitor → Token Introspect
4. Paste token → klik Introspect
5. Pastikan hasilnya:
   - `active: true`
   - `nik` terisi (bukan null)
   - `full_name`, `unit_id` terisi
   - `iss: "auth-server"`

Jika semua field terisi dan `active: true`, integrasi sudah benar.

---

## 8. Keamanan yang Perlu Dijaga

**Jangan simpan token lebih lama dari masa berlakunya.** Token berlaku 3 jam. Setelah itu user harus login ulang atau gunakan refresh token.

**Jangan log token di server konsumen.** Log boleh mencatat NIK, username, waktu login — tapi bukan token itu sendiri.

**Backend proxy harus pakai HTTPS di production.** Request server-to-server ke SSO harus lewat HTTPS (`https://absen.sulfat.site`), bukan HTTP.

**Timeout di proxy wajib ada.** Login password timeout 10 detik, login wajah timeout 15 detik. Jika SSO tidak merespons, kembalikan `503 Service Unavailable` — jangan biarkan request menggantung.

**Jangan cache token di backend.** Token harus selalu datang dari user dan selalu diverifikasi ke SSO setiap request. Caching token membuat revoke sesi tidak efektif.
