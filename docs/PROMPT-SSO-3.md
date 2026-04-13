# SSO RSUD Sulfat – Panduan Integrasi untuk Developer Aplikasi Konsumen

Dokumen ini adalah panduan teknis **dari sudut pandang developer aplikasi konsumen** (SIMRS, finance, surat-menyurat, inventory, dll.) yang ingin mengintegrasikan login ke SSO RSUD Sulfat. Dibaca sekali, langsung bisa implementasi.

---

## Prasyarat Sebelum Mulai Coding

Sebelum mulai implementasi, pastikan tiga hal ini sudah beres:

**1. Daftarkan client_id aplikasi ke admin SSO.**
Buka `https://absen.sulfat.site` → login admin → SSO Monitor → Tab App Clients → Daftarkan App. Isi `client_id` yang unik, misalnya `simrs-web`, `finance-app`, `surat-service`.

**2. Pastikan pegawai yang akan login sudah punya NIK.**
NIK adalah kunci identitas lintas aplikasi. Tanpa NIK, token yang dihasilkan akan mengandung `nik: null` dan aplikasi konsumen tidak bisa memetakan user ke data lokalnya. Admin SSO mengisi NIK di menu Pegawai → Edit.

**3. Untuk login wajah: pastikan wajah sudah terdaftar di SSO.**
Wajah didaftarkan oleh admin di `absen.sulfat.site` → Pegawai → Register Wajah. Pendaftaran wajah hanya dilakukan sekali di SSO — tidak perlu diulang di setiap aplikasi konsumen.

---

## Arsitektur yang Harus Diikuti

```
Browser user (di aplikasi konsumen)
        │
        │  POST /auth/login   ← HANYA ke backend aplikasi konsumen sendiri
        ▼                       TIDAK boleh langsung ke absen.sulfat.site
Backend Aplikasi Konsumen
        │
        │  POST https://absen.sulfat.site/api/v1/auth/login  ← server-to-server
        ▼
SSO (absen.sulfat.site)
        │
        └── return JWT token ──► Backend Konsumen ──► Browser user
```

**Aturan utama:** Frontend konsumen **tidak boleh** memanggil SSO langsung. Semua lewat backend konsumen sendiri. Ini menghilangkan masalah CORS sepenuhnya dan tidak memerlukan perubahan konfigurasi di sisi SSO.

---

## Bagian 1 — Implementasi Backend Konsumen

### 1.1 Konfigurasi

Simpan URL SSO di environment variable, bukan hardcode:

```python
# Python — .env atau config
SSO_BASE_URL = "https://absen.sulfat.site/api/v1"
SSO_TIMEOUT_LOGIN = 10.0       # detik
SSO_TIMEOUT_FACE = 15.0        # lebih lama — ada proses ML
SSO_TIMEOUT_INTROSPECT = 5.0
```

```js
// Node.js — .env
SSO_BASE_URL=https://absen.sulfat.site/api/v1
```

---

### 1.2 Endpoint Login Password

Terima username+password dari frontend konsumen, teruskan ke SSO, kembalikan token.

**Python / FastAPI:**
```python
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/auth")
SSO_BASE = "https://absen.sulfat.site/api/v1"

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
async def login(body: LoginRequest):
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{SSO_BASE}/auth/login",
                json={"username": body.username, "password": body.password},
                timeout=10.0,
            )
        except httpx.TimeoutException:
            raise HTTPException(503, "SSO tidak merespons, coba beberapa saat lagi.")
        except httpx.RequestError:
            raise HTTPException(502, "Tidak dapat terhubung ke SSO.")

    if resp.status_code != 200:
        # Teruskan error dari SSO ke client (401, 403, dll.)
        raise HTTPException(
            status_code=resp.status_code,
            detail=resp.json().get("detail", "Login gagal.")
        )

    sso_data = resp.json().get("data", {})
    token = sso_data.get("access_token")

    # Opsional: catat audit login lokal
    # audit_log(username=body.username, event="login_success")

    return {"access_token": token, "token_type": "bearer"}
```

**Node.js / Express:**
```js
const axios = require('axios');
const SSO_BASE = process.env.SSO_BASE_URL;

router.post('/login', async (req, res) => {
  try {
    const { data } = await axios.post(`${SSO_BASE}/auth/login`, {
      username: req.body.username,
      password: req.body.password,
    }, { timeout: 10000 });

    const token = data?.data?.access_token;
    res.json({ access_token: token, token_type: 'bearer' });

  } catch (err) {
    const status = err.response?.status ?? 502;
    const detail = err.response?.data?.detail ?? 'Login gagal.';
    res.status(status).json({ detail });
  }
});
```

---

### 1.3 Endpoint Login Wajah

Terima username + foto base64 dari frontend, teruskan ke SSO.

**Python / FastAPI:**
```python
from typing import Optional

class FaceLoginRequest(BaseModel):
    username: str
    image: str            # base64 JPEG, tanpa prefix "data:image/..."
    threshold: Optional[float] = 0.6   # 0.5–0.7, default 0.6

@router.post("/login-face")
async def login_face(body: FaceLoginRequest):
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{SSO_BASE}/auth/login-face",
                json={
                    "username": body.username,
                    "image": body.image,
                    "threshold": body.threshold,
                },
                timeout=15.0,
            )
        except httpx.TimeoutException:
            raise HTTPException(503, "SSO tidak merespons saat verifikasi wajah.")
        except httpx.RequestError:
            raise HTTPException(502, "Tidak dapat terhubung ke SSO.")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=resp.status_code,
            detail=resp.json().get("detail", "Verifikasi wajah gagal.")
        )

    sso_data = resp.json().get("data", {})
    return {
        "access_token": sso_data.get("access_token"),
        "token_type": "bearer",
        "face_similarity": sso_data.get("face_similarity"),
    }
```

**Node.js / Express:**
```js
router.post('/login-face', async (req, res) => {
  try {
    const { data } = await axios.post(`${SSO_BASE}/auth/login-face`, {
      username: req.body.username,
      image: req.body.image,
      threshold: req.body.threshold ?? 0.6,
    }, { timeout: 15000 });

    res.json({
      access_token: data?.data?.access_token,
      token_type: 'bearer',
      face_similarity: data?.data?.face_similarity,
    });

  } catch (err) {
    const status = err.response?.status ?? 502;
    res.status(status).json({ detail: err.response?.data?.detail ?? 'Verifikasi wajah gagal.' });
  }
});
```

---

### 1.4 Middleware Verifikasi Token (Dependency / Guard)

Setiap endpoint yang membutuhkan autentikasi harus melalui middleware ini.

**Python / FastAPI:**
```python
import httpx
from fastapi import Request, HTTPException, Depends

SSO_BASE = "https://absen.sulfat.site/api/v1"

async def get_current_user(request: Request) -> dict:
    """
    Verifikasi token ke SSO lalu resolve permission lokal.
    Gunakan sebagai Depends() di setiap endpoint yang butuh auth.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Token tidak ditemukan.")

    # Verifikasi ke SSO
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{SSO_BASE}/auth/introspect",
                headers={"Authorization": auth_header},
                timeout=5.0,
            )
        except (httpx.TimeoutException, httpx.RequestError):
            raise HTTPException(503, "SSO tidak dapat dihubungi saat verifikasi token.")

    identity = resp.json().get("data", {})
    if not identity.get("active"):
        raise HTTPException(401, "Token tidak valid atau sudah kadaluarsa.")

    nik = identity.get("nik")
    if not nik:
        raise HTTPException(400, "NIK tidak ditemukan di token. Hubungi admin SSO untuk mengisi NIK.")

    # Resolve permission lokal berdasarkan NIK
    # Ganti dengan query ke DB aplikasi konsumen masing-masing
    user_access = get_local_access(nik)   # query tabel akses lokal
    if not user_access:
        raise HTTPException(403, "Akun belum memiliki akses di aplikasi ini. Hubungi admin.")

    return {
        # Identitas dari SSO
        "nik": nik,
        "username": identity.get("username"),
        "full_name": identity.get("full_name"),
        "unit_id": identity.get("unit_id"),
        "sso_roles": identity.get("roles", []),

        # Permission lokal aplikasi konsumen
        "role": user_access.role,
        "is_active": user_access.is_active,
    }

# Contoh penggunaan di endpoint:
@router.get("/pasien")
async def get_pasien(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["dokter", "perawat", "admin"]:
        raise HTTPException(403, "Tidak punya akses ke data pasien.")
    # ... logika endpoint
```

**Node.js / Express:**
```js
const axios = require('axios');
const SSO_BASE = process.env.SSO_BASE_URL;

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Token tidak ditemukan.' });
  }

  try {
    const { data } = await axios.post(`${SSO_BASE}/auth/introspect`, {}, {
      headers: { Authorization: authHeader },
      timeout: 5000,
    });

    const identity = data?.data ?? {};
    if (!identity.active) {
      return res.status(401).json({ detail: 'Token tidak valid.' });
    }
    if (!identity.nik) {
      return res.status(400).json({ detail: 'NIK belum diisi. Hubungi admin SSO.' });
    }

    // Resolve permission lokal
    const userAccess = await getLocalAccess(identity.nik); // query DB lokal
    if (!userAccess) {
      return res.status(403).json({ detail: 'Akun belum memiliki akses di aplikasi ini.' });
    }

    req.user = { ...identity, role: userAccess.role };
    next();

  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      return res.status(503).json({ detail: 'SSO timeout.' });
    }
    return res.status(502).json({ detail: 'Gagal verifikasi token.' });
  }
}

// Pakai di route:
router.get('/pasien', authMiddleware, (req, res) => {
  if (!['dokter', 'perawat'].includes(req.user.role)) {
    return res.status(403).json({ detail: 'Tidak punya akses.' });
  }
  // ...
});
```

---

### 1.5 Tabel Akses Lokal yang Harus Dibuat

Setiap aplikasi konsumen menyimpan mapping NIK → role lokal di DB-nya sendiri.

```sql
-- Buat sesuai nama aplikasi (simrs_, finance_, surat_, dll.)
CREATE TABLE simrs_user_access (
    id          SERIAL PRIMARY KEY,
    nik         VARCHAR(20)  NOT NULL UNIQUE,
    role        VARCHAR(50)  NOT NULL,
    -- Contoh role: dokter, perawat, admin, apoteker, kasir, viewer
    notes       TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Index untuk lookup cepat saat introspect
CREATE INDEX idx_simrs_user_access_nik ON simrs_user_access(nik) WHERE is_active = TRUE;

-- Isi data awal (NIK harus sama dengan yang ada di SSO)
INSERT INTO simrs_user_access (nik, role) VALUES
  ('3578010101900001', 'dokter'),
  ('3578010101900002', 'perawat'),
  ('3578010101900003', 'admin');
```

---

## Bagian 2 — Implementasi Frontend Konsumen

### 2.1 Login Password — Form Standar

```jsx
// LoginPage.jsx (React)
import { useState } from 'react';

const API = '/api';  // relatif ke domain sendiri — TIDAK ada absen.sulfat.site

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? 'Login gagal.');

      localStorage.setItem('access_token', data.access_token);
      window.location.href = '/dashboard';

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
      {error && <p style={{color:'red'}}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Memproses...' : 'Login'}
      </button>
    </form>
  );
}
```

---

### 2.2 Login Wajah — Komponen Kamera

```jsx
// FaceLoginPage.jsx (React)
import { useState, useRef, useEffect } from 'react';

const API = '/api';

export default function FaceLoginPage() {
  const videoRef   = useRef(null);
  const [username, setUsername] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus]     = useState('');
  const [error, setError]       = useState('');

  // Mulai kamera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      videoRef.current.srcObject = stream;
      setStreaming(true);
      setStatus('Kamera aktif. Posisikan wajah di tengah lalu klik Verifikasi.');
    } catch {
      setError('Kamera tidak dapat diakses. Izinkan akses kamera di browser.');
    }
  };

  // Stop kamera
  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach(t => t.stop());
    setStreaming(false);
  };

  // Capture dan kirim ke SSO via backend proxy
  const handleVerify = async () => {
    if (!username.trim()) { setError('Masukkan username terlebih dahulu.'); return; }

    setStatus('Mengambil foto...');
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

    // Base64 tanpa prefix "data:image/jpeg;base64,"
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

    stopCamera();
    setStatus('Memverifikasi wajah...');

    try {
      const res = await fetch(`${API}/auth/login-face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, image: imageBase64, threshold: 0.6 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? 'Verifikasi wajah gagal.');

      localStorage.setItem('access_token', data.access_token);
      setStatus(`✅ Berhasil (similarity: ${data.face_similarity})`);
      window.location.href = '/dashboard';

    } catch (err) {
      setError(err.message);
      setStatus('');
    }
  };

  useEffect(() => () => stopCamera(), []); // cleanup saat unmount

  return (
    <div>
      <input
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="Masukkan username"
        disabled={streaming}
      />

      <video ref={videoRef} autoPlay playsInline
        style={{ display: streaming ? 'block' : 'none', width: 320 }} />

      {!streaming
        ? <button onClick={startCamera}>📷 Buka Kamera</button>
        : <button onClick={handleVerify}>✅ Verifikasi Wajah</button>
      }

      {status && <p style={{color:'gray'}}>{status}</p>}
      {error  && <p style={{color:'red'}}>{error}</p>}
    </div>
  );
}
```

---

### 2.3 Kirim Token di Setiap Request

Setelah login berhasil, token disimpan di `localStorage`. Setiap request ke backend konsumen wajib menyertakan token:

```js
// api-client.js — wrapper fetch standar untuk semua request
const API = '/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('access_token');

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Token expired → paksa login ulang
    localStorage.removeItem('access_token');
    window.location.href = '/login';
    return;
  }

  return res.json();
}

// Contoh penggunaan:
const pasien = await apiFetch('/pasien');
const hasil  = await apiFetch('/rawat-inap', { method: 'POST', body: JSON.stringify(data) });
```

---

## Bagian 3 — Test Integrasi

### 3.1 Test Manual — Login Password

```bash
# 1. Login via backend konsumen (bukan langsung ke SSO)
curl -X POST https://simrs.sulfat.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"budi.santoso","password":"rahasia123"}'

# Hasil yang diharapkan:
# { "access_token": "eyJ...", "token_type": "bearer" }

# 2. Gunakan token untuk akses endpoint konsumen
curl https://simrs.sulfat.site/api/pasien \
  -H "Authorization: Bearer eyJ..."
```

### 3.2 Test Manual — Introspect Token

Cara paling mudah: gunakan halaman **SSO Monitor → Token Introspect** di `absen.sulfat.site`.

Atau via curl langsung (ini server-to-server, tidak ada CORS):
```bash
curl -X POST https://absen.sulfat.site/api/v1/auth/introspect \
  -H "Authorization: Bearer eyJ..."

# Hasil yang diharapkan:
# {
#   "data": {
#     "active": true,
#     "nik": "3578010101900001",
#     "username": "budi.santoso",
#     "full_name": "Budi Santoso, S.Kep",
#     "unit_id": 3,
#     ...
#   }
# }
```

### 3.3 Checklist Test Sebelum Go-Live

```
LOGIN PASSWORD:
  [ ] Login berhasil → dapat access_token
  [ ] Username salah → dapat 401 dengan pesan jelas
  [ ] Password salah → dapat 401 dengan pesan jelas
  [ ] SSO mati → dapat 503, bukan hang atau crash

LOGIN WAJAH:
  [ ] Kamera terbuka di browser
  [ ] Foto terkirim → verifikasi berhasil → dapat token
  [ ] Wajah tidak cocok → dapat 401 dengan similarity info
  [ ] Username belum daftar wajah di SSO → dapat pesan jelas
  [ ] Kamera tidak ada → error handling tampil, fallback ke password

TOKEN & PERMISSION:
  [ ] Token valid → introspect → active: true, nik terisi
  [ ] Token expired → backend konsumen return 401, frontend redirect ke login
  [ ] NIK ada di DB lokal → dapat data + role lokal
  [ ] NIK tidak ada di DB lokal → dapat 403 dengan pesan "belum terdaftar"
  [ ] NIK null (pegawai belum diisi NIK) → dapat 400 dengan pesan jelas
```

---

## Ringkasan Satu Halaman

```
BACKEND KONSUMEN — 3 endpoint wajib:
  POST /auth/login        → proxy ke SSO /auth/login
  POST /auth/login-face   → proxy ke SSO /auth/login-face  (jika pakai wajah)
  Middleware auth         → proxy ke SSO /auth/introspect → lookup NIK di DB lokal

FRONTEND KONSUMEN — 2 komponen:
  Form login (username + password)  → panggil /auth/login sendiri
  Komponen kamera                   → capture base64 → panggil /auth/login-face sendiri

DB KONSUMEN — 1 tabel wajib:
  app_user_access (nik, role, is_active)
  → diisi manual untuk setiap pegawai yang perlu akses

KOORDINASI DENGAN ADMIN SSO (sekali saja):
  → Daftarkan client_id di SSO Monitor
  → Pastikan NIK semua pegawai sudah terisi
  → Untuk login wajah: pastikan wajah sudah didaftarkan di SSO
```
