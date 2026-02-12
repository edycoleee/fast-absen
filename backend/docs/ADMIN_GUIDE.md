# Panduan Administrator - Sistem Absensi RSUD Sulfat

Panduan lengkap untuk administrator dalam mengelola sistem absensi menggunakan API.

**API Documentation**: http://192.168.171.15:8000/docs

---

## 📋 Daftar Isi

1. [Login Sebagai Admin](#1-login-sebagai-admin)
2. [Mengelola Users](#2-mengelola-users)
3. [Mengelola Roles](#3-mengelola-roles)
4. [Mengelola Permissions](#4-mengelola-permissions)
5. [Mengelola Pegawai](#5-mengelola-pegawai)
6. [Mengelola Absensi](#6-mengelola-absensi)
7. [Monitoring Login Device](#7-monitoring-login-device)

---

## 1. Login Sebagai Admin

### Langkah 1: Buka Swagger Documentation

Buka browser dan akses: **http://192.168.171.15:8000/docs**

### Langkah 2: Login Admin

1. Cari section **Authentication** di Swagger UI
2. Klik endpoint **POST /api/v1/auth/login**
3. Klik tombol **"Try it out"**
4. Masukkan kredensial admin:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

5. Klik **"Execute"**
6. Copy **access_token** dari response

### Langkah 3: Authorize Swagger UI

1. Klik tombol **"Authorize"** (ikon gembok) di pojok kanan atas
2. Paste token yang sudah di-copy
3. Format: `Bearer <your_token_here>`
4. Klik **"Authorize"**
5. Klik **"Close"**

**✅ Sekarang Anda sudah terautentikasi sebagai admin!**

---

## 2. Mengelola Users

### 2.1 Melihat Daftar Users

**Endpoint**: `GET /api/v1/users/`

1. Buka section **Users**
2. Klik **GET /api/v1/users/**
3. Klik **"Try it out"**
4. Set pagination (opsional):
   - `page`: 1
   - `limit`: 10
5. Klik **"Execute"**

**Response**: Daftar semua users dengan role dan pegawai info

### 2.2 Membuat User Baru

**Endpoint**: `POST /api/v1/users/`

**Skenario A: Membuat User Admin Baru**

```json
{
  "username": "admin2",
  "password": "password123",
  "id_pegawai": null,
  "is_active": true,
  "role_ids": [1]
}
```

**Skenario B: Membuat User Pegawai**

```json
{
  "username": "johndoe",
  "password": "pegawai123",
  "id_pegawai": "P001",
  "is_active": true,
  "role_ids": [2]
}
```

**📌 Catatan:**
- `role_ids: [1]` = Admin
- `role_ids: [2]` = User/Pegawai
- `id_pegawai` harus sudah ada di database pegawai
- Password minimal 6 karakter

### 2.3 Melihat Detail User

**Endpoint**: `GET /api/v1/users/{id}`

1. Masukkan ID user yang ingin dilihat
2. Klik **"Execute"**

### 2.4 Update User

**Endpoint**: `PUT /api/v1/users/{id}`

**Contoh:Nonaktifkan User**

```json
{
  "is_active": false
}
```

**Contoh: Update Password**

```json
{
  "password": "newpassword123"
}
```

**Contoh: Update Role**

```json
{
  "role_ids": [1, 2]
}
```

### 2.5 Hapus User

**Endpoint**: `DELETE /api/v1/users/{id}`

⚠️ **Perhatian**: User yang dihapus tidak bisa dikembalikan!

---

## 3. Mengelola Roles

### 3.1 Melihat Daftar Roles

**Endpoint**: `GET /api/v1/roles/`

Response akan menampilkan:
- Role default: `admin` dan `user`
- Role custom yang sudah dibuat

### 3.2 Membuat Role Baru

**Endpoint**: `POST /api/v1/roles/`

**Contoh: Membuat Role "Supervisor"**

```json
{
  "name": "supervisor",
  "description": "Supervisor yang dapat melihat laporan absensi",
  "is_system": false,
  "permission_ids": [3, 4]
}
```

**📌 Catatan:**
- `is_system: false` - Role custom (bisa dihapus)
- `is_system: true` - Role system (tidak bisa dihapus)
- `permission_ids`: Array ID permission yang diberikan

### 3.3 Update Role

**Endpoint**: `PUT /api/v1/roles/{id}`

**Contoh: Tambah Permission ke Role**

```json
{
  "description": "Supervisor dengan akses update",
  "permission_ids": [3, 4, 5]
}
```

⚠️ **Tidak bisa update**: Role system (`admin`, `user`)

### 3.4 Hapus Role

**Endpoint**: `DELETE /api/v1/roles/{id}`

⚠️ **Tidak bisa hapus**: Role system (`admin`, `user`)

---

## 4. Mengelola Permissions

### 4.1 Melihat Daftar Permissions

**Endpoint**: `GET /api/v1/permissions/`

Default permissions:
- `user.login` - Login aplikasi
- `absensi.create` - Buat absensi
- `absensi.read` - Lihat absensi
- `absensi.update` - Update absensi
- `absensi.delete` - Hapus absensi

### 4.2 Membuat Permission Baru

**Endpoint**: `POST /api/v1/permissions/`

**Contoh: Permission untuk Laporan**

```json
{
  "name": "report.view",
  "description": "Melihat laporan absensi bulanan",
  "is_system": false
}
```

### 4.3 Update Permission

**Endpoint**: `PUT /api/v1/permissions/{id}`

```json
{
  "description": "Melihat dan export laporan absensi"
}
```

⚠️ **Tidak bisa update**: Permission system

### 4.4 Hapus Permission

**Endpoint**: `DELETE /api/v1/permissions/{id}`

⚠️ **Tidak bisa hapus**: Permission system

---

## 5. Mengelola Pegawai

### 5.1 Melihat Daftar Pegawai

**Endpoint**: `GET /api/v1/pegawai/`

**Dengan Pencarian:**
- Parameter `search`: Cari berdasarkan nama atau NIP
- Contoh: `search=john` atau `search=123456`

### 5.2 Menambah Pegawai Baru

**Endpoint**: `POST /api/v1/pegawai/`

**⚠️ Format: multipart/form-data**

1. Klik endpoint **POST /api/v1/pegawai/**
2. Klik **"Try it out"**
3. Isi form fields:
   - `id_pegawai`: **P001** (unique, wajib)
   - `nip`: **198501012010011001** (unique, wajib)
   - `nama`: **John Doe** (wajib)
   - `jabatan`: **Perawat**
   - `foto`: *Click "Choose File"* untuk upload foto (opsional)
     - Format: JPG/PNG
     - Max size: ~10MB
     - Otomatis disimpan di `/uploads/photos/`

4. Klik **"Execute"**

**📌 Tips:**
- NIP harus unique (18 digit)
- ID Pegawai harus unique
- Foto akan otomatis di-resize jika terlalu besar

### 5.3 Melihat Detail Pegawai

**Endpoint**: `GET /api/v1/pegawai/{id_pegawai}`

Response termasuk:
- Data pegawai lengkap
- Path foto (jika ada)
- URL akses foto

### 5.4 Update Pegawai

**Endpoint**: `PUT /api/v1/pegawai/{id_pegawai}`

**Contoh: Update Jabatan**

```
jabatan: Kepala Ruangan
```

**Contoh: Ganti Foto**

```
foto: [upload file baru]
```

**📌 Catatan:**
- Foto lama akan otomatis dihapus saat upload foto baru
- Bisa update sebagian field saja

### 5.5 Hapus Pegawai

**Endpoint**: `DELETE /api/v1/pegawai/{id_pegawai}`

⚠️ **Perhatian:**
- Pegawai yang dihapus akan menghapus:
  - Data pegawai
  - Foto pegawai (jika ada)
  - ⚠️ Users terkait mungkin bermasalah (set id_pegawai = null dulu)

**Best Practice:**
1. Hapus/update user terkait dulu
2. Baru hapus pegawai

---

## 6. Mengelola Absensi

### 6.1 Melihat Semua Absensi (Admin)

**Endpoint**: `GET /api/v1/absensi/`

Response termasuk:
- Semua data absensi dari semua pegawai
- Informasi pegawai (nama, NIP)
- IP address perangkat
- Tanggal dan waktu absensi

**Pagination:**
- `skip`: 0 (default)
- `limit`: 100 (default)

### 6.2 Melihat Detail Absensi

**Endpoint**: `GET /api/v1/absensi/{id}`

Melihat detail absensi spesifik berdasarkan ID.

### 6.3 Update Absensi

**Endpoint**: `PUT /api/v1/absensi/{id}`

**Contoh: Koreksi Keterangan**

```json
{
  "keterangan": "Hadir dengan izin terlambat - macet 30 menit"
}
```

**Contoh: Update Lokasi**

```json
{
  "id_lokasi": "LOK002",
  "keterangan": "Dipindahkan ke Ruang IGD"
}
```

**Contoh: Koreksi Tanggal**

```json
{
  "tanggal": "2026-02-12T08:00:00"
}
```

**📌 Field yang bisa diupdate:**
- `id_lokasi`
- `uid`
- `tanggal`
- `keterangan`
- `id_pegawai` (jika ada kesalahan input)

### 6.4 Hapus Absensi

**Endpoint**: `DELETE /api/v1/absensi/{id}`

Menghapus data absensi (misalnya data duplikat).

---

## 7. Monitoring Login Device

### 7.1 Melihat Semua Login Device

**Endpoint**: `GET /api/v1/login-absensi/`

Response menampilkan:
- Device UID
- Player ID (untuk push notification)
- Model device (merek HP)
- Nama pegawai yang login
- Waktu login

**Kegunaan:**
- Monitoring device yang digunakan pegawai
- Deteksi login mencurigakan
- Tracking untuk push notification

### 7.2 Melihat Detail Login Device

**Endpoint**: `GET /api/v1/login-absensi/{id}`

Detail device login spesifik.

---

## 📊 Tips & Best Practices

### 1. Manajemen User
- ✅ Buat pegawai dulu, baru buat user
- ✅ Gunakan username yang mudah diingat (contoh: NIP atau nama)
- ✅ Password minimal 6 karakter, disarankan 8-12 karakter
- ✅ Nonaktifkan user, jangan langsung hapus (untuk histori)

### 2. Manajemen Role & Permission
- ✅ Jangan edit role system (`admin`, `user`)
- ✅ Buat role custom untuk kebutuhan khusus (supervisor, manager, dll)
- ✅ Berikan permission sesuai kebutuhan (principle of least privilege)

### 3. Manajemen Pegawai
- ✅ Pastikan NIP dan ID unik
- ✅ Upload foto untuk identifikasi
- ✅ Update data pegawai jika ada perubahan jabatan

### 4. Monitoring Absensi
- ✅ Cek IP address untuk deteksi anomali
- ✅ Review absensi yang mencurigakan
- ✅ Backup data secara berkala

### 5. Keamanan
- ✅ Ganti password admin default setelah instalasi
- ✅ Logout setelah selesai menggunakan sistem
- ✅ Jangan share access token
- ✅ Token expire setelah 30 menit (auto logout)

---

## 🔧 Troubleshooting

### Token Expired (401 Unauthorized)

**Masalah**: Response "Invalid authentication credentials"

**Solusi**:
1. Login ulang di endpoint `/api/v1/auth/login`
2. Copy token baru
3. Authorize ulang di Swagger UI

### Forbidden (403)

**Masalah**: "Not enough permissions"

**Solusi**:
- Pastikan Anda login sebagai admin
- Cek role user di endpoint `/api/v1/users/{id}`

### Duplicate Error

**Masalah**: Username/NIP/ID sudah ada

**Solusi**:
- Gunakan username/NIP/ID yang berbeda
- Cek daftar users/pegawai yang sudah ada

### File Upload Error

**Masalah**: Gagal upload foto

**Solusi**:
- Pastikan format JPG atau PNG
- Reduce ukuran file (max ~10MB)
- Pastikan koneksi internet stabil

---

## 📞 Support

Jika mengalami kendala:
1. Cek log server di terminal
2. Cek dokumentasi API di http://192.168.171.15:8000/docs
3. Hubungi tim teknis

---

**Version**: 2.0.0  
**Last Updated**: 12 Februari 2026  
**Environment**: Production - RSUD Sulfat
