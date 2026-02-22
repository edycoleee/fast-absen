# Quick Start - Sistem Absensi RSUD Sulfat

Panduan cepat untuk mulai memakai API versi saat ini.

- Base URL: `/api/v1`
- Swagger: `http://192.168.171.15:8000/docs`
- ReDoc: `http://192.168.171.15:8000/redoc`

---

## 1) Login dan Authorize

### Login
Gunakan endpoint `POST /api/v1/auth/login`:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

Ambil `data.access_token` dari response.

### Authorize di Swagger
- Klik tombol **Authorize**
- Isi: `Bearer <access_token>`
- Klik **Authorize**

---

## 2) Endpoint Inti yang Paling Sering Dipakai

## Authentication
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

## Absensi (User)
- `POST /absensi/check-in`
- `POST /absensi/check-out`
- `GET /absensi/today`
- `GET /absensi/history`
- `GET /absensi/summary`

## Absensi (Admin/Monitoring)
- `GET /absensi/statistics`
- `GET /absensi/`
- `GET /absensi/{absensi_id}`
- `PUT /absensi/{absensi_id}`
- `DELETE /absensi/{absensi_id}`

## User Sessions
- `POST /user-sessions/` (catat sesi user)
- `GET /user-sessions/` (list)
- `GET /user-sessions/records/{session_record_id}`
- `GET /user-sessions/active`
- `GET /user-sessions/history`
- `GET /user-sessions/statistics`
- `GET /user-sessions/by-session/{session_id}`
- `POST /user-sessions/{session_id}/force-logout`
- `POST /user-sessions/heartbeat?session_id=...`
- `POST /user-sessions/cleanup-expired`

## Roster & Evaluasi Otomatis
- `GET /roster-upload-batch/template/download`
- `POST /roster-upload-batch/import`
- `POST /penilaian-shift-absensi/evaluate`

---

## 3) Quick Use Case

## A. Pegawai Check-in dan Check-out
1. Login (`/auth/login`)
2. `POST /absensi/check-in`
3. `GET /absensi/today`
4. `POST /absensi/check-out`
5. `GET /absensi/history`

Contoh body check-in:

```json
{
  "status": "HADIR",
  "keterangan": "Masuk shift pagi"
}
```

## B. Admin Monitoring
1. Login admin
2. `GET /absensi/statistics`
3. `GET /absensi/?skip=0&limit=100`
4. `GET /user-sessions/active`

## C. Runbook Bulanan Roster (Ringkas)
1. Download template: `GET /roster-upload-batch/template/download`
2. Isi roster bulan berikutnya per unit/periode (gunakan format template resmi)
3. Import Excel: `POST /roster-upload-batch/import`
4. Perbaiki error validasi sampai hasil import sesuai target kualitas
5. Jalankan evaluasi: `POST /penilaian-shift-absensi/evaluate`
6. Pantau ringkasan hasil evaluate:
  - `created_count`
  - `updated_count`
  - `skipped_manual_override`
  - `skipped_existing`
  - `failed_count`

Catatan operasional:
- Lakukan upload roster di akhir bulan untuk bulan berikutnya
- Terapkan cutoff perubahan roster agar evaluasi absensi stabil
- Gunakan approval/manual override hanya untuk kasus khusus agar jejak audit tetap jelas

---

## 4) Ringkasan Akses

- `super-admin`: penuh (termasuk roles/permissions)
- `admin`: sesuai permission yang diberikan
- `user`: endpoint user (absensi diri sendiri + session terkait)

Lihat detail permission di:
- `utils/permission_registry.py`
- `docs/API_ENDPOINTS.md`

---

## 5) Response Format

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

Untuk endpoint list, `data` berisi:
- `items`
- `total`
- `skip`
- `limit`

---

## 6) Referensi Lanjutan

- [API_ENDPOINTS.md](API_ENDPOINTS.md)
- [ADMIN_GUIDE.md](ADMIN_GUIDE.md)
- [USER_GUIDE.md](USER_GUIDE.md)
- [tests/README.md](../tests/README.md)

---

Last updated: 22 Februari 2026
