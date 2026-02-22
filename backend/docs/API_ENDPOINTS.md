# API Endpoints Documentation (Current)

Dokumentasi endpoint backend yang **sesuai implementasi saat ini**.

- Base API: `/api/v1`
- Swagger: `/docs` (aktif saat `DEBUG=true`)
- Response wrapper standar: `success`, `message`, `data`

---

## Authentication

Semua endpoint (kecuali `POST /auth/login`) butuh access token:

```http
Authorization: Bearer <access_token>
```

Refresh token dikirim via HTTP-only cookie (`refresh_token`) untuk endpoint `/auth/refresh`.

---

## Daftar Endpoint (Ringkas)

## 1) Auth (`/auth`)

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| POST | `/auth/login` | ❌ | - |
| POST | `/auth/refresh` | 🍪 Cookie | - |
| POST | `/auth/logout` | 🍪 Cookie | - |

## 2) Users (`/users`)

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| GET | `/users/` | ✅ | `users.read` |
| POST | `/users/` | ✅ | `users.create` |
| GET | `/users/{user_id}` | ✅ | `users.read` |
| PUT | `/users/{user_id}` | ✅ | `users.update` |
| DELETE | `/users/{user_id}` | ✅ | `users.delete` |

## 3) Roles (`/roles`) *(super-admin)*

| Method | Endpoint | Auth | Guard |
|---|---|---|---|
| GET | `/roles/` | ✅ | `require_super_admin` |
| POST | `/roles/` | ✅ | `require_super_admin` |
| GET | `/roles/{role_id}` | ✅ | `require_super_admin` |
| PUT | `/roles/{role_id}` | ✅ | `require_super_admin` |
| DELETE | `/roles/{role_id}` | ✅ | `require_super_admin` |

## 4) Permissions (`/permissions`) *(super-admin)*

| Method | Endpoint | Auth | Guard |
|---|---|---|---|
| GET | `/permissions/` | ✅ | `require_super_admin` |
| POST | `/permissions/` | ✅ | `require_super_admin` |
| GET | `/permissions/{permission_id}` | ✅ | `require_super_admin` |
| PUT | `/permissions/{permission_id}` | ✅ | `require_super_admin` |
| DELETE | `/permissions/{permission_id}` | ✅ | `require_super_admin` |

## 5) Pegawai (`/pegawai`)

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| GET | `/pegawai/` | ✅ | `pegawai.read` |
| POST | `/pegawai/` | ✅ | `pegawai.create` |
| GET | `/pegawai/{pegawai_id}` | ✅ | `pegawai.read` |
| PUT | `/pegawai/{pegawai_id}` | ✅ | `pegawai.update` |
| DELETE | `/pegawai/{pegawai_id}` | ✅ | `pegawai.delete` |

## 6) Unit (`/unit`)

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| GET | `/unit/` | ✅ | `unit.read` |
| POST | `/unit/` | ✅ | `unit.create` |
| GET | `/unit/{id_unit}` | ✅ | `unit.read` |
| PUT | `/unit/{id_unit}` | ✅ | `unit.update` |
| DELETE | `/unit/{id_unit}` | ✅ | `unit.delete` |

## 7) Shift Kelompok (`/shift-kelompok`)

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| GET | `/shift-kelompok/` | ✅ | `shift_kelompok.read` |
| POST | `/shift-kelompok/` | ✅ | `shift_kelompok.create` |
| GET | `/shift-kelompok/{shift_kelompok_id}` | ✅ | `shift_kelompok.read` |
| PUT | `/shift-kelompok/{shift_kelompok_id}` | ✅ | `shift_kelompok.update` |
| DELETE | `/shift-kelompok/{shift_kelompok_id}` | ✅ | `shift_kelompok.delete` |

## 8) Shift Kelompok Aturan (`/shift-kelompok-aturan`)

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| GET | `/shift-kelompok-aturan/` | ✅ | `shift_kelompok_aturan.read` |
| POST | `/shift-kelompok-aturan/` | ✅ | `shift_kelompok_aturan.create` |
| GET | `/shift-kelompok-aturan/{aturan_id}` | ✅ | `shift_kelompok_aturan.read` |
| PUT | `/shift-kelompok-aturan/{aturan_id}` | ✅ | `shift_kelompok_aturan.update` |
| DELETE | `/shift-kelompok-aturan/{aturan_id}` | ✅ | `shift_kelompok_aturan.delete` |

## 9) Pegawai Shift Kelompok (`/pegawai-shift-kelompok`)

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| GET | `/pegawai-shift-kelompok/` | ✅ | `pegawai_shift_kelompok.read` |
| POST | `/pegawai-shift-kelompok/` | ✅ | `pegawai_shift_kelompok.create` |
| GET | `/pegawai-shift-kelompok/{assignment_id}` | ✅ | `pegawai_shift_kelompok.read` |
| PUT | `/pegawai-shift-kelompok/{assignment_id}` | ✅ | `pegawai_shift_kelompok.update` |
| DELETE | `/pegawai-shift-kelompok/{assignment_id}` | ✅ | `pegawai_shift_kelompok.delete` |

## 10) Roster Upload Batch (`/roster-upload-batch`)

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| GET | `/roster-upload-batch/template/download` | ✅ | `roster_upload_batch.read` |
| POST | `/roster-upload-batch/import` | ✅ | `roster_upload_batch.create` |
| GET | `/roster-upload-batch/` | ✅ | `roster_upload_batch.read` |
| POST | `/roster-upload-batch/` | ✅ | `roster_upload_batch.create` |
| GET | `/roster-upload-batch/{batch_id}` | ✅ | `roster_upload_batch.read` |
| PUT | `/roster-upload-batch/{batch_id}` | ✅ | `roster_upload_batch.update` |
| DELETE | `/roster-upload-batch/{batch_id}` | ✅ | `roster_upload_batch.delete` |

## 11) Roster Shift (`/roster-shift`)

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| GET | `/roster-shift/` | ✅ | `roster_shift.read` |
| POST | `/roster-shift/` | ✅ | `roster_shift.create` |
| GET | `/roster-shift/{roster_id}` | ✅ | `roster_shift.read` |
| PUT | `/roster-shift/{roster_id}` | ✅ | `roster_shift.update` |
| DELETE | `/roster-shift/{roster_id}` | ✅ | `roster_shift.delete` |

## 12) Penilaian Shift Absensi (`/penilaian-shift-absensi`)

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| GET | `/penilaian-shift-absensi/` | ✅ | `penilaian_shift_absensi.read` |
| POST | `/penilaian-shift-absensi/` | ✅ | `penilaian_shift_absensi.create` |
| POST | `/penilaian-shift-absensi/evaluate` | ✅ | `penilaian_shift_absensi.create` |
| GET | `/penilaian-shift-absensi/{penilaian_id}` | ✅ | `penilaian_shift_absensi.read` |
| PUT | `/penilaian-shift-absensi/{penilaian_id}` | ✅ | `penilaian_shift_absensi.update` |
| DELETE | `/penilaian-shift-absensi/{penilaian_id}` | ✅ | `penilaian_shift_absensi.delete` |

## 13) Approval Pengajuan Absensi (`/approval-pengajuan-absensi`)

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| GET | `/approval-pengajuan-absensi/logs` | ✅ | `approval_pengajuan_absensi.read` |
| POST | `/approval-pengajuan-absensi/` | ✅ | `approval_pengajuan_absensi.create` |
| GET | `/approval-pengajuan-absensi/mine` | ✅ | `approval_pengajuan_absensi.read` |
| GET | `/approval-pengajuan-absensi/assigned` | ✅ | `approval_pengajuan_absensi.read` |
| POST | `/approval-pengajuan-absensi/{pengajuan_id}/decision` | ✅ | `approval_pengajuan_absensi.update` |
| GET | `/approval-pengajuan-absensi/{pengajuan_id}/logs` | ✅ | `approval_pengajuan_absensi.read` |

## 14) Approval Pengajuan Absensi Log (`/approval-pengajuan-absensi-log`)

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| GET | `/approval-pengajuan-absensi-log/` | ✅ | `approval_pengajuan_absensi_log.read` |
| GET | `/approval-pengajuan-absensi-log/pengajuan/{pengajuan_id}` | ✅ | `approval_pengajuan_absensi_log.read` |

## 15) Absensi (`/absensi`)

### User flow

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| POST | `/absensi/check-in` | ✅ | `absensi.create` |
| POST | `/absensi/check-out` | ✅ | `absensi.update` |
| GET | `/absensi/today` | ✅ | `absensi.read` |
| GET | `/absensi/history` | ✅ | `absensi.read` |
| GET | `/absensi/summary` | ✅ | `absensi.read` |

### Monitoring/admin

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| GET | `/absensi/statistics` | ✅ | `absensi.read` |
| GET | `/absensi/` | ✅ | `absensi.read` |
| GET | `/absensi/{absensi_id}` | ✅ | `absensi.read` |
| PUT | `/absensi/{absensi_id}` | ✅ | `absensi.update` |
| DELETE | `/absensi/{absensi_id}` | ✅ | `absensi.delete` |

## 16) User Sessions (`/user-sessions`)

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| POST | `/user-sessions/` | ✅ | `user_sessions.create` |
| GET | `/user-sessions/` | ✅ | `user_sessions.read` |
| GET | `/user-sessions/records/{session_record_id}` | ✅ | `user_sessions.read` |
| GET | `/user-sessions/active` | ✅ | `user_sessions.read` |
| GET | `/user-sessions/history` | ✅ | `user_sessions.read` |
| GET | `/user-sessions/statistics` | ✅ | `user_sessions.read` |
| GET | `/user-sessions/by-session/{session_id}` | ✅ | `user_sessions.read` |
| POST | `/user-sessions/{session_id}/force-logout` | ✅ | `user_sessions.update` |
| POST | `/user-sessions/heartbeat?session_id=...` | ✅ | `get_current_user` |
| POST | `/user-sessions/cleanup-expired` | ✅ | `user_sessions.update` |

## 17) Stats (`/stats`)

| Method | Endpoint | Auth | Guard |
|---|---|---|---|
| GET | `/stats/` | ✅ | punya salah satu: `users.read` / `pegawai.read` / `roles.read` / `absensi.read` |

## 18) Halo (`/halo`) *(legacy/example)*

| Method | Endpoint | Auth |
|---|---|---|
| GET | `/halo/` | ❌ |
| POST | `/halo/` | ❌ |

---

## Endpoint Detail Penting

## Auth flow

### `POST /auth/login`
- Body: `username`, `password`
- Return: `access_token`, `token_type`, `user_id`, `username`, `roles`, `session_id`
- Set cookie: `refresh_token` (HTTP-only)

### `POST /auth/refresh`
- Tanpa body, wajib cookie `refresh_token`
- Return access token baru

### `POST /auth/logout`
- Hapus cookie `refresh_token`

## Absensi flow

### `POST /absensi/check-in`
- Cegah check-in ganda di hari yang sama
- Tangkap `ip_address` otomatis dari request

### `POST /absensi/check-out`
- Hanya untuk absensi aktif hari ini
- Cegah check-out ganda

### `GET /absensi/history`
- Query: `skip`, `limit`
- Return pagination: `items`, `total`, `skip`, `limit`

## User sessions flow

### `POST /user-sessions/heartbeat`
- Parameter: `session_id` (query param)
- Security check: session harus milik user login
- Update `last_activity`

### `POST /user-sessions/cleanup-expired`
- Query: `expiry_hours` (default 24)
- Auto logout untuk session idle

---

## Format Response

### Success
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Error
```json
{
  "success": false,
  "message": "Error description"
}
```

Untuk endpoint list/paginasi, format `data` menggunakan:
- `items`
- `total`
- `skip`
- `limit`

---

## Catatan Sinkronisasi

Dokumen ini sudah disesuaikan dengan route aktif di:
- `api/v1/router.py`
- seluruh file pada `api/v1/endpoints/`

Jika ada penambahan endpoint baru, update file ini dan verifikasi cepat via Swagger (`/docs`).
