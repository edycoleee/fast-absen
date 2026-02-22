# Panduan Administrator - Sistem Absensi RSUD Sulfat

Panduan operasional admin + contoh payload yang mengikuti schema aktual endpoint.

- Swagger: `http://192.168.171.15:8000/docs`
- Base API: `/api/v1`

---

## 1) Login Admin

Endpoint: `POST /api/v1/auth/login`

Schema: `LoginRequest`

```json
{
  "username": "admin",
  "password": "admin123"
}
```

Setelah login:
1. copy `access_token`
2. authorize di Swagger: `Bearer <token>`

---

## 2) Endpoint Admin Utama

## A. Users (`/users`)
- `GET /users/`
- `POST /users/`
- `GET /users/{user_id}`
- `PUT /users/{user_id}`
- `DELETE /users/{user_id}`

Permission: `users.read/create/update/delete`

### Contoh body `POST /users/` (schema `UserCreate`)
```json
{
  "username": "pegawai01",
  "id_pegawai": "P001",
  "is_active": true,
  "password": "password123",
  "role_ids": [2]
}
```

### Contoh body `PUT /users/{user_id}` (schema `UserUpdate`)
```json
{
  "username": "pegawai01.updated",
  "password": "newpass123",
  "id_pegawai": "P001",
  "is_active": true,
  "role_ids": [1, 2]
}
```

## B. Roles & Permissions *(super-admin)*

### Roles (`/roles`)
- `GET /roles/`, `POST /roles/`, `GET /roles/{role_id}`, `PUT /roles/{role_id}`, `DELETE /roles/{role_id}`

### Permissions (`/permissions`)
- `GET /permissions/`, `POST /permissions/`, `GET /permissions/{permission_id}`, `PUT /permissions/{permission_id}`, `DELETE /permissions/{permission_id}`

## C. Pegawai (`/pegawai`)
- `GET /pegawai/`
- `POST /pegawai/`
- `GET /pegawai/{pegawai_id}`
- `PUT /pegawai/{pegawai_id}`
- `DELETE /pegawai/{pegawai_id}`

Catatan: endpoint create/update pegawai memakai `multipart/form-data` (bukan JSON body).

### Field form `POST /pegawai/` (schema dasar `PegawaiCreate` + form endpoint)
- `id_pegawai` (required)
- `nip`, `nama`, `jenis_kelamin(L/P)`, `tempat_lahir`, `tanggal_lahir(YYYY-MM-DD)`, `alamat`, `id_unit`, `kepala_id_unit`, `status`, `foto`

## D. Absensi (`/absensi`)

### User-flow endpoint (untuk monitoring)
- `GET /absensi/today`
- `GET /absensi/history`
- `GET /absensi/summary`

### Admin endpoint
- `GET /absensi/statistics`
- `GET /absensi/`
- `GET /absensi/{absensi_id}`
- `PUT /absensi/{absensi_id}`
- `DELETE /absensi/{absensi_id}`

### Contoh body `PUT /absensi/{absensi_id}` (schema `AbsensiUpdate`)
```json
{
  "status": "IZIN",
  "keterangan": "Izin medis",
  "jam_masuk": "2026-02-22T08:00:00+07:00",
  "jam_keluar": "2026-02-22T16:00:00+07:00",
  "dokumen_pendukung": "uploads/surat/surat-dokter.pdf"
}
```

## E. User Sessions Monitoring (`/user-sessions`)
- `GET /user-sessions/`
- `GET /user-sessions/records/{session_record_id}`
- `GET /user-sessions/active`
- `GET /user-sessions/history`
- `GET /user-sessions/statistics`
- `GET /user-sessions/by-session/{session_id}`
- `POST /user-sessions/{session_id}/force-logout`
- `POST /user-sessions/cleanup-expired`

### Contoh body `POST /user-sessions/` (schema `UserSessionsCreate`)
```json
{
  "uid": "DEVICE123",
  "player_id": "PLAYER456",
  "model": "Samsung Galaxy A52"
}
```

## F. Unit, Shift, Roster, Penilaian

- Unit: `/unit`
- Shift Kelompok: `/shift-kelompok`
- Shift Kelompok Aturan: `/shift-kelompok-aturan`
- Pegawai Shift Kelompok: `/pegawai-shift-kelompok`
- Roster Upload Batch: `/roster-upload-batch`
- Roster Shift: `/roster-shift`
- Penilaian Shift Absensi: `/penilaian-shift-absensi`

Semua modul di atas mengikuti pola CRUD standar.

### Endpoint penting untuk operasional roster bulanan

- `GET /roster-upload-batch/template/download` (download template Excel resmi)
- `POST /roster-upload-batch/import` (upload & import roster dari Excel)
- `POST /penilaian-shift-absensi/evaluate` (evaluasi otomatis roster vs absensi)

## G. Approval Pengajuan Absensi

- `GET /approval-pengajuan-absensi/logs`
- `POST /approval-pengajuan-absensi/`
- `GET /approval-pengajuan-absensi/mine`
- `GET /approval-pengajuan-absensi/assigned`
- `POST /approval-pengajuan-absensi/{pengajuan_id}/decision`
- `GET /approval-pengajuan-absensi/{pengajuan_id}/logs`

Audit log endpoint:
- `GET /approval-pengajuan-absensi-log/`
- `GET /approval-pengajuan-absensi-log/pengajuan/{pengajuan_id}`

Kebijakan resolver approver saat ini (P0-3 tahap awal):
- Sistem menggunakan **1 atasan langsung** saja (tanpa hirarki bertingkat).
- Atasan langsung di-resolve dari mapping `kepala_id_unit` pada data pegawai pemohon.
- Jika mapping belum lengkap/invalid, pengajuan ditolak dengan error validasi agar data organisasi diperbaiki dulu.

### Contoh body `POST /approval-pengajuan-absensi/` (schema `ApprovalPengajuanAbsensiCreate`)
```json
{
  "tipe_pengajuan": "MISSING_CHECKIN",
  "target_tanggal": "2026-02-22",
  "alasan": "Lupa check-in karena emergency di ruangan",
  "roster_shift_id": 123
}
```

### Contoh body `POST /approval-pengajuan-absensi/{pengajuan_id}/decision` (schema `ApprovalPengajuanAbsensiDecision`)
```json
{
  "action": "APPROVED",
  "catatan_approval": "Disetujui sesuai bukti"
}
```

---

## 3) SOP Roster Bulanan (Best Practice)

Pola lama (upload Excel di akhir bulan untuk bulan berikutnya) tetap dipakai, namun di sistem baru harus melalui pipeline resmi agar aman dan bisa diaudit.

### A. Timeline operasional yang disarankan

1. **H-10 s.d H-7 akhir bulan**
  - Download template resmi roster.
  - Susun jadwal per unit/periode bulan berikutnya.

2. **H-7 s.d H-3**
  - Import roster per unit/periode.
  - Perbaiki semua baris invalid sampai hasil validasi sesuai target kualitas data.

3. **H-2 s.d H-1**
  - Finalisasi roster dan publish internal.
  - Terapkan cutoff perubahan roster.

4. **Saat bulan berjalan**
  - Jalankan evaluasi otomatis roster vs absensi secara berkala.
  - Tindak lanjuti exception melalui approval (bukan edit diam-diam).

### B. Aturan kualitas data sebelum publish

- Gunakan format waktu yang konsisten.
- Pastikan tidak ada shift overlap per pegawai pada rentang waktu yang sama.
- Pastikan semua pegawai aktif punya roster yang sesuai unitnya.
- Pisahkan import per unit/periode agar tracing batch dan rollback lebih mudah.

### C. Aturan governance (wajib)

- **Sumber kebenaran** adalah data yang sudah masuk database, bukan file Excel lokal.
- Setelah cutoff, perubahan roster harus melalui approval dan tercatat.
- Gunakan `manual override` hanya untuk kasus valid, selalu isi alasan.
- Rekap KPI/payroll mengambil data dari hasil evaluasi, bukan dari file mentah.

### D. Contoh payload evaluasi otomatis

Endpoint: `POST /api/v1/penilaian-shift-absensi/evaluate`

```json
{
  "start_date": "2026-03-01",
  "end_date": "2026-03-31",
  "id_unit": 10,
  "id_pegawai": null,
  "force_recalculate": false
}
```

Field ringkasan hasil yang perlu dipantau:
- `created_count`
- `updated_count`
- `skipped_manual_override`
- `skipped_existing`
- `failed_count`

---

## 4) Operasional Harian Disarankan

1. `GET /stats/`
2. `GET /absensi/statistics`
3. `GET /user-sessions/active`
4. `GET /approval-pengajuan-absensi/assigned`
5. `POST /approval-pengajuan-absensi/{pengajuan_id}/decision`

---

## 5) Troubleshooting Singkat

- `401`: token invalid/expired
- `403`: permission tidak cukup
- `404`: resource tidak ditemukan
- `400`: payload tidak sesuai schema atau validasi bisnis gagal

---

## 6) Referensi

- [API_ENDPOINTS.md](API_ENDPOINTS.md)
- [QUICK_START.md](QUICK_START.md)
- [USER_GUIDE.md](USER_GUIDE.md)

Last updated: 22 Februari 2026
