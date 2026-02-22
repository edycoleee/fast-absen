# Panduan User/Pegawai - Sistem Absensi RSUD Sulfat

Panduan endpoint user/pegawai yang sinkron dengan schema backend saat ini.

- Swagger: `http://192.168.171.15:8000/docs`
- Base API: `/api/v1`

---

## 1) Login

Endpoint: `POST /api/v1/auth/login`

Schema: `LoginRequest`

```json
{
  "username": "username_anda",
  "password": "password_anda"
}
```

Ketentuan schema:
- `username`: min 3 karakter
- `password`: min 6 karakter

Setelah login:
- simpan `access_token`
- authorize dengan `Bearer <token>`

Endpoint terkait:
- `POST /api/v1/auth/refresh` (pakai cookie refresh token)
- `POST /api/v1/auth/logout`

---

## 2) Absensi Harian (User)

## A. Check-in
Endpoint: `POST /api/v1/absensi/check-in`

Schema: `AbsensiCreate`

### Contoh body minimal
```json
{
  "status": "HADIR"
}
```

### Contoh body lengkap
```json
{
  "status": "TERLAMBAT",
  "keterangan": "Terlambat 15 menit karena macet",
  "dokumen_pendukung": "uploads/surat/terlambat-2026-02-22.pdf"
}
```

Ketentuan schema:
- `status` salah satu: `HADIR|IZIN|SAKIT|ALPHA|TERLAMBAT|CUTI`
- `keterangan` wajib jika `status` = `IZIN|SAKIT|TERLAMBAT|CUTI`

Sistem otomatis mencatat:
- `id_pegawai` dari token
- `jam_masuk`
- `ip_address`

## B. Check-out
Endpoint: `POST /api/v1/absensi/check-out`

Tidak pakai request body.

## C. Status hari ini
Endpoint: `GET /api/v1/absensi/today`

## D. Histori pribadi
Endpoint: `GET /api/v1/absensi/history?skip=0&limit=30`

## E. Ringkasan pribadi
Endpoint: `GET /api/v1/absensi/summary`

Opsional query:
- `start_date=YYYY-MM-DD`
- `end_date=YYYY-MM-DD`

---

## 3) Praktik Terbaik Roster Bulanan (Info untuk Pegawai)

Sistem sekarang tetap mendukung pola lama (upload roster Excel di akhir bulan untuk bulan berikutnya), tetapi prosesnya dibuat lebih terkontrol:

1. Admin unit menyiapkan roster bulan depan dari template resmi sistem.
2. File diimport ke sistem sebagai batch (bukan dipakai langsung sebagai sumber final).
3. Sistem memvalidasi data roster, lalu menyimpan shift valid ke database.
4. Saat bulan berjalan, sistem melakukan evaluasi otomatis roster vs absensi (mangkir, terlambat, pulang cepat, lembur).

### Dampak ke pegawai

- Pegawai wajib disiplin check-in dan check-out sesuai shift yang sudah diinput.
- Jika ada ketidaksesuaian data, gunakan alur pengajuan/approval, bukan mengubah data sendiri.
- Rekap performa kehadiran diambil dari hasil evaluasi sistem, bukan dari file Excel mentah.

### Kapan data dianggap final

- Setelah roster melewati cutoff operasional unit (ditetapkan admin), perubahan shift dibatasi.
- Koreksi setelah cutoff harus lewat approval agar jejak audit tetap lengkap.

---

## 3) User Sessions

## A. Catat sesi perangkat
Endpoint: `POST /api/v1/user-sessions/`

Schema: `UserSessionsCreate`

### Contoh body minimal (valid)
```json
{}
```

### Contoh body lengkap
```json
{
  "uid": "DEVICE123",
  "player_id": "PLAYER456",
  "model": "Samsung Galaxy A52"
}
```

Ketentuan schema:
- semua field opsional
- `model` max 250 karakter

## B. Heartbeat aktivitas sesi
Endpoint: `POST /api/v1/user-sessions/heartbeat?session_id=<session_id>`

Tidak pakai JSON body (pakai query param `session_id`).

---

## 4) Error Umum

- `401 Unauthorized`: token tidak valid/expired
- `403 Forbidden`: permission tidak cukup
- `404 Not Found`: resource tidak ditemukan
- `400 Bad Request`: payload tidak sesuai schema/rule

---

## 5) FAQ Singkat

### Bisa pakai endpoint `/absensi/me` atau `/absensi/create`?
Tidak. Endpoint user absensi sekarang:
- `/absensi/check-in`
- `/absensi/check-out`
- `/absensi/today`
- `/absensi/history`
- `/absensi/summary`

### Bisa edit absensi sendiri?
Tidak. Koreksi dilakukan admin melalui endpoint admin absensi.

### Kenapa heartbeat ditolak?
Pastikan `session_id` milik user yang sedang login.

### Roster saya berubah setelah bulan berjalan, kenapa?
Perubahan roster setelah publish biasanya dibatasi oleh cutoff unit. Jika ada kebutuhan khusus (misalnya dinas/penugasan darurat), perubahan dilakukan via admin + approval.

### Status mangkir/terlambat saya salah, apa yang harus dilakukan?
Ajukan koreksi melalui alur pengajuan absensi agar bisa direview atasan/admin, jangan meminta edit manual langsung tanpa jejak.

### Siapa yang menyetujui pengajuan saya?
Untuk tahap saat ini, sistem memakai **1 atasan langsung** (berdasarkan mapping organisasi) sebagai approver utama.

---

## 6) Referensi

- [QUICK_START.md](QUICK_START.md)
- [API_ENDPOINTS.md](API_ENDPOINTS.md)
- [ADMIN_GUIDE.md](ADMIN_GUIDE.md)

Last updated: 22 Februari 2026
