# Panduan Permission System

## Overview
Sistem permission menggunakan role-based access control (RBAC) dengan granular permissions untuk setiap operasi.

## Permissions List

### Authentication
- `user.login` - Login ke aplikasi
  - **Required for**: Semua user yang perlu login

### User Management
- `users.read` - Melihat data user
- `users.create` - Membuat user baru
- `users.update` - Mengubah data user
- `users.delete` - Menghapus user
  - **Required for**: Admin yang mengelola user

### Role Management
- `roles.read` - Melihat data role
- `roles.create` - Membuat role baru
- `roles.update` - Mengubah role
- `roles.delete` - Menghapus role
  - **Required for**: Super Admin

### Permission Management
- `permissions.read` - Melihat data permission
- `permissions.create` - Membuat permission baru
- `permissions.update` - Mengubah permission
- `permissions.delete` - Menghapus permission
  - **Required for**: Super Admin

### Pegawai Management
- `pegawai.read` - Melihat data pegawai
- `pegawai.create` - Membuat data pegawai baru
- `pegawai.update` - Mengubah data pegawai
- `pegawai.delete` - Menghapus data pegawai
  - **Required for**: Admin HR

### Absensi Management
- `absensi.read` - Melihat data absensi (history, summary, today)
  - **Used by endpoints**: 
    - `GET /absensi/today` - View today's status
    - `GET /absensi/history` - View attendance history
    - `GET /absensi/summary` - View attendance summary
    - `GET /absensi/` - Admin: View all attendance
    - `GET /absensi/{id}` - Admin: View specific attendance
  - **Required for**: All users (pegawai), Admin

- `absensi.create` - Membuat absensi (check-in)
  - **Used by endpoints**: 
    - `POST /absensi/check-in` - Daily check-in
  - **Required for**: All users (pegawai)

- `absensi.update` - Mengubah absensi (check-out, admin edit)
  - **Used by endpoints**: 
    - `POST /absensi/check-out` - Daily check-out
    - `PUT /absensi/{id}` - Admin: Edit attendance record
  - **Required for**: All users (pegawai), Admin

- `absensi.delete` - Menghapus absensi (admin only)
  - **Used by endpoints**: 
    - `DELETE /absensi/{id}` - Admin: Delete attendance record
  - **Required for**: Admin only

### User Sessions Management
- `user_sessions.read` - Melihat data session login
- `user_sessions.create` - Membuat session login baru
- `user_sessions.update` - Mengubah status session
- `user_sessions.delete` - Menghapus session
  - **Required for**: Admin untuk monitoring login sessions

### Deprecated Permissions
- `login_absensi.read` - [DEPRECATED] Gunakan `user_sessions.read`
- `login_absensi.create` - [DEPRECATED] Gunakan `user_sessions.create`

## Recommended Role Configurations

### 1. Role: "user" atau "pegawai" (Regular Employee)

**Tujuan**: Pegawai biasa yang melakukan absensi harian

**Required Permissions**:
```json
[
  "user.login",
  "absensi.read",
  "absensi.create",
  "absensi.update"
]
```

**Dapat Melakukan**:
- ✅ Login ke sistem
- ✅ Check-in harian (POST /absensi/check-in)
- ✅ Check-out harian (POST /absensi/check-out)
- ✅ Melihat status hari ini (GET /absensi/today)
- ✅ Melihat riwayat absensi sendiri (GET /absensi/history)
- ✅ Melihat summary absensi sendiri (GET /absensi/summary)

**Tidak Dapat**:
- ❌ Edit/delete absensi orang lain
- ❌ Melihat absensi pegawai lain
- ❌ Kelola user/pegawai/role

### 2. Role: "admin" (HR/Admin)

**Tujuan**: Admin yang mengelola pegawai dan absensi

**Required Permissions**:
```json
[
  "user.login",
  "users.read",
  "users.create",
  "users.update",
  "users.delete",
  "pegawai.read",
  "pegawai.create",
  "pegawai.update",
  "pegawai.delete",
  "absensi.read",
  "absensi.create",
  "absensi.update",
  "absensi.delete",
  "user_sessions.read"
]
```

**Dapat Melakukan**:
- ✅ Semua yang bisa dilakukan pegawai
- ✅ CRUD semua pegawai
- ✅ CRUD semua user
- ✅ CRUD semua absensi (termasuk edit/delete)
- ✅ Melihat login sessions
- ✅ Melihat statistik lengkap

### 3. Role: "super-admin" (System Administrator)

**Tujuan**: Administrator sistem dengan akses penuh

**Required Permissions**: **SEMUA PERMISSIONS** (otomatis di-assign via sync script)

## Sync Permissions ke Database

Jalankan script ini setelah menambah/mengubah permission di registry:

```bash
cd /home/sultan/fast-absen/backend
source venv/bin/activate
python scripts/sync_permissions.py
```

Script ini akan:
1. Membuat permission baru yang belum ada di database
2. Update deskripsi permission yang sudah berubah
3. Auto-assign semua permission ke role "super-admin", "super_admin", "superadmin"

## Workflow Check-In/Check-Out

### User Workflow:
1. **Check-in** - POST /absensi/check-in
   - Permission: `absensi.create`
   - Payload: `{status: "HADIR", keterangan?: "..."}`
   - Validasi: Tidak bisa check-in 2x di hari yang sama
   - Auto-capture: IP address, jam_masuk, device info

2. **Check-out** - POST /absensi/check-out  
   - Permission: `absensi.update` ⚠️
   - Payload: empty (no body required)
   - Validasi: Harus sudah check-in hari ini
   - Auto-capture: jam_keluar

3. **View Today Status** - GET /absensi/today
   - Permission: `absensi.read`
   - Response: `{has_checked_in, can_check_out, absensi}`

### Admin Workflow:
1. **View All Attendance** - GET /absensi/
   - Permission: `absensi.read`
   - Dapat filter by pegawai, date range

2. **Edit Attendance** - PUT /absensi/{id}
   - Permission: `absensi.update`
   - Dapat edit semua field (status, keterangan, jam_masuk, jam_keluar)

3. **Delete Attendance** - DELETE /absensi/{id}
   - Permission: `absensi.delete`
   - Hapus record absensi tertentu

## Catatan Penting

### ⚠️ Check-out Requires UPDATE Permission
Check-out menggunakan `absensi.update` permission (bukan `absensi.create`) karena:
- Secara teknis adalah UPDATE operation (update field `jam_keluar`)
- Role "user"/"pegawai" HARUS memiliki permission `absensi.update`
- Service layer membatasi bahwa user hanya bisa check-out absensi milik sendiri hari ini
- User tidak bisa edit absensi hari sebelumnya atau milik orang lain (dihandle di business logic)

### Status yang Memerlukan Keterangan
Keterangan WAJIB diisi untuk status:
- IZIN
- SAKIT
- TERLAMBAT
- CUTI

Validasi dilakukan di:
1. Frontend - conditional textarea
2. Backend schema - Pydantic @model_validator
3. Database constraint - dapat ditambahkan jika perlu

### Session Tracking
Login sessions dicatat di tabel `user_sessions` dengan informasi:
- Device type (web/mobile/tablet)
- Browser & OS
- IP address
- Login/logout timestamp
- Session UUID

## Troubleshooting

### User tidak bisa check-out
**Gejala**: Error "Forbidden" atau "Permission denied" saat POST /absensi/check-out

**Solusi**: Pastikan role user memiliki permission `absensi.update`:
```sql
-- Check permission user
SELECT r.name as role, p.name as permission
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'user' AND p.name = 'absensi.update';

-- Jika tidak ada, tambahkan manual atau assign via admin panel
```

### Permission tidak ada di database
**Solusi**: Jalankan sync script:
```bash
python scripts/sync_permissions.py
```

### User sudah punya permission tapi tetap forbidden
**Kemungkinan**:
1. Token JWT expired - minta user login ulang
2. User tidak punya role - assign role via admin panel
3. Role tidak punya permission - assign permission ke role
