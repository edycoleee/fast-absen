# Quick Start - Sistem Absensi RSUD Sulfat

Panduan cepat untuk memulai menggunakan Sistem Absensi RSUD Sulfat.

**Swagger UI**: http://192.168.171.15:8000/docs  
**ReDoc**: http://192.168.171.15:8000/redoc

---

## 📚 Dokumentasi Lengkap

### Untuk Administrator
📖 **[Panduan Administrator (ADMIN_GUIDE.md)](ADMIN_GUIDE.md)**

Panduan lengkap untuk admin dalam:
- ✅ Login sebagai admin
- ✅ Mengelola users (create, update, delete)
- ✅ Mengelola roles & permissions
- ✅ Mengelola data pegawai (dengan upload foto)
- ✅ Monitoring absensi semua pegawai
- ✅ Monitoring login device
- ✅ Update/koreksi data absensi

### Untuk User/Pegawai
📖 **[Panduan User/Pegawai (USER_GUIDE.md)](USER_GUIDE.md)**

Panduan lengkap untuk pegawai dalam:
- ✅ Login dengan akun pegawai
- ✅ Melakukan absensi harian
- ✅ Melihat riwayat absensi sendiri
- ✅ Login device (untuk mobile app)
- ✅ FAQ dan troubleshooting

---

## 🚀 Quick Start (5 Menit)

### 1. Akses Swagger UI

Buka browser: **http://192.168.171.15:8000/docs**

### 2. Login

**Admin:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**User/Pegawai:**
```json
{
  "username": "username_anda",
  "password": "password_anda"
}
```

### 3. Authorize

1. Copy `access_token` dari response login
2. Klik tombol **"Authorize"** (🔒) di pojok kanan atas
3. Paste token
4. Klik **"Authorize"**

### 4. Mulai Gunakan API

**Admin** → Akses semua endpoint  
**User** → Akses endpoint absensi

---

## 📋 Ringkasan Endpoint

### Authentication
| Endpoint | Method | Akses | Fungsi |
|----------|--------|-------|--------|
| `/auth/login` | POST | Public | Login → dapat token |

### Users (Admin Only)
| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/users/` | GET | List semua user |
| `/users/` | POST | Buat user baru |
| `/users/{id}` | GET | Detail user |
| `/users/{id}` | PUT | Update user |
| `/users/{id}` | DELETE | Hapus user |

### Roles (Admin Only)
| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/roles/` | GET | List semua role |
| `/roles/` | POST | Buat role baru |
| `/roles/{id}` | GET | Detail role |
| `/roles/{id}` | PUT | Update role |
| `/roles/{id}` | DELETE | Hapus role |

### Permissions (Admin Only)
| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/permissions/` | GET | List semua permission |
| `/permissions/` | POST | Buat permission baru |
| `/permissions/{id}` | GET | Detail permission |
| `/permissions/{id}` | PUT | Update permission |
| `/permissions/{id}` | DELETE | Hapus permission |

### Pegawai (Admin Only)
| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/pegawai/` | GET | List/search pegawai |
| `/pegawai/` | POST | Tambah pegawai (+ foto) |
| `/pegawai/{id}` | GET | Detail pegawai |
| `/pegawai/{id}` | PUT | Update pegawai (+ foto) |
| `/pegawai/{id}` | DELETE | Hapus pegawai |

### Absensi (Admin)
| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/absensi/` | GET | List semua absensi |
| `/absensi/{id}` | GET | Detail absensi |
| `/absensi/{id}` | PUT | Update absensi |
| `/absensi/{id}` | DELETE | Hapus absensi |

### Absensi (User)
| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/absensi/create` | POST | Buat absensi (auto IP & pegawai) |
| `/absensi/me` | GET | List absensi sendiri |
| `/absensi/me/{id}` | GET | Detail absensi sendiri |

### Login Absensi
| Endpoint | Method | Akses | Fungsi |
|----------|--------|-------|--------|
| `/login-absensi/` | POST | User | Catat login device |
| `/login-absensi/` | GET | Admin | List semua login device |
| `/login-absensi/{id}` | GET | Admin | Detail login device |

---

## 🎯 Use Cases

### Use Case 1: Admin Menambah Pegawai Baru

1. Login sebagai admin
2. POST `/pegawai/` dengan data:
   ```
   id_pegawai: P002
   nip: 198501012010011002
   nama: Jane Smith
   jabatan: Dokter
   foto: [upload file]
   ```
3. POST `/users/` untuk buat akun user:
   ```json
   {
     "username": "janesmith",
     "password": "password123",
     "id_pegawai": "P002",
     "is_active": true,
     "role_ids": [2]
   }
   ```
4. Informasikan username & password ke pegawai

### Use Case 2: Pegawai Melakukan Absensi

1. Login dengan akun pegawai
2. POST `/absensi/create`:
   ```json
   {
     "id_lokasi": "LOK001",
     "uid": "DEVICE123",
     "keterangan": "Hadir tepat waktu"
   }
   ```
3. Sistem otomatis mencatat:
   - ID pegawai (dari token)
   - Tanggal & waktu
   - IP address

### Use Case 3: Admin Monitoring Absensi

1. Login sebagai admin
2. GET `/absensi/` untuk lihat semua absensi
3. Cek IP address untuk validasi lokasi
4. Update keterangan jika perlu koreksi

### Use Case 4: Pegawai Cek Riwayat Absensi

1. Login dengan akun pegawai
2. GET `/absensi/me` untuk lihat riwayat absensi sendiri
3. GET `/absensi/me/{id}` untuk detail tertentu

---

## 🔐 Roles & Permissions

### Role: Admin
**Akses**: FULL (semua endpoint)

**Default Admin:**
- Username: `admin`
- Password: `admin123`
- ⚠️ **Ganti password setelah instalasi!**

### Role: User
**Akses**: Terbatas

**Bisa Akses:**
- ✅ Login
- ✅ Buat absensi sendiri
- ✅ Lihat absensi sendiri
- ✅ Catat login device

**Tidak Bisa Akses:**
- ❌ Kelola users
- ❌ Kelola roles/permissions
- ❌ Kelola pegawai
- ❌ Lihat absensi orang lain
- ❌ Update/delete absensi

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* data here */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

### HTTP Status Codes
- `200` - OK (success)
- `201` - Created (resource created)
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (token invalid/expired)
- `403` - Forbidden (no permission)
- `404` - Not Found (resource not found)
- `500` - Internal Server Error

---

## 🔧 Troubleshooting

### 1. Token Expired (401)
**Solusi**: Login ulang, copy token baru, authorize ulang

### 2. Forbidden (403)
**Solusi**: 
- Pastikan role sesuai (admin untuk endpoint admin)
- Pastikan token valid

### 3. Not Found (404)
**Solusi**: Cek ID resource yang diakses

### 4. Bad Request (400)
**Solusi**: Cek format input, pastikan field required terisi

### 5. Connection Refused
**Solusi**: 
- Pastikan server running
- Cek koneksi network
- Pastikan akses ke IP 192.168.171.15:8000

---

## 📱 Testing dengan Tools

### 1. Swagger UI (Recommended)
**URL**: http://192.168.171.15:8000/docs

**Kelebihan:**
- ✅ Interactive
- ✅ Try it out langsung
- ✅ Auto-generate request
- ✅ Built-in authorization

### 2. ReDoc
**URL**: http://192.168.171.15:8000/redoc

**Kelebihan:**
- ✅ Dokumentasi lebih detail
- ✅ Search function
- ✅ Export friendly

### 3. cURL
```bash
# Login
curl -X POST http://192.168.171.15:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Use token
curl -X GET http://192.168.171.15:8000/api/v1/users/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Python requests
```python
import requests

# Login
response = requests.post(
    "http://192.168.171.15:8000/api/v1/auth/login",
    json={"username": "admin", "password": "admin123"}
)
token = response.json()["data"]["access_token"]

# Use API
headers = {"Authorization": f"Bearer {token}"}
users = requests.get(
    "http://192.168.171.15:8000/api/v1/users/",
    headers=headers
)
print(users.json())
```

### 5. Postman
1. Import OpenAPI spec: http://192.168.171.15:8000/openapi.json
2. Setup environment variable untuk token
3. Test endpoints

---

## 🎓 Best Practices

### Untuk Admin
1. ✅ Backup database secara berkala
2. ✅ Ganti password default
3. ✅ Monitor log secara rutin
4. ✅ Review permission sebelum assign role
5. ✅ Validasi data pegawai sebelum input
6. ✅ Export laporan absensi bulanan

### Untuk User
1. ✅ Absensi tepat waktu
2. ✅ Isi keterangan dengan jelas
3. ✅ Cek riwayat absensi secara berkala
4. ✅ Laporkan anomali ke admin
5. ✅ Jaga kerahasiaan password
6. ✅ Logout setelah selesai

---

## 📞 Support & Dokumentasi

### Dokumentasi Teknis
- 📖 [API Endpoints Documentation](API_ENDPOINTS.md)
- 📖 [Clean Architecture Guide](CLEAN_ARCHITECTURE_GUIDE.md)
- 📖 [Response Format](RESPONSE_FORMAT.md)
- 📖 [Testing Guide](../tests/README.md)
- 📖 [Database Guide](../../database/DOCKER_DATABASE.md)

### User Documentation
- 📖 [Admin Guide](ADMIN_GUIDE.md) ⭐
- 📖 [User Guide](USER_GUIDE.md) ⭐

### Server Information
- **Environment**: Production
- **Server**: http://192.168.171.15:8000
- **Swagger**: http://192.168.171.15:8000/docs
- **ReDoc**: http://192.168.171.15:8000/redoc
- **Database**: PostgreSQL 16 (Docker)

---

## 🔄 Updates & Changelog

### Version 2.0.0 (12 Feb 2026)
- ✅ Complete REST API with 30 endpoints
- ✅ JWT Authentication & RBAC
- ✅ Dual access pattern (Admin + User)
- ✅ Photo upload support
- ✅ IP address tracking
- ✅ Device login tracking
- ✅ Comprehensive documentation

### Previous Versions
- v1.0.0 - Initial release

---

**Selamat menggunakan Sistem Absensi RSUD Sulfat!** 🎉

Untuk pertanyaan lebih lanjut, silakan hubungi tim IT atau baca dokumentasi lengkap di folder `/docs`.
