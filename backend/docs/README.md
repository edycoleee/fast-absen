# Dokumentasi Sistem Absensi RSUD Sulfat

Selamat datang di dokumentasi lengkap Sistem Absensi RSUD Sulfat v2.0.0

**Server**: http://192.168.171.15:8000  
**Swagger UI**: http://192.168.171.15:8000/docs  
**ReDoc**: http://192.168.171.15:8000/redoc

---

## 📚 Panduan Pengguna

### 🚀 Mulai Cepat
📖 **[QUICK_START.md](QUICK_START.md)** - Panduan cepat mulai dalam 5 menit

Cocok untuk:
- ✅ Pengguna baru yang ingin coba sistem
- ✅ Quick reference untuk endpoint
- ✅ Troubleshooting umum
- ✅ Testing dengan berbagai tools

### 👨‍💼 Untuk Administrator
📖 **[ADMIN_GUIDE.md](ADMIN_GUIDE.md)** - Panduan lengkap administrator

Berisi:
- ✅ Login sebagai admin
- ✅ Mengelola users (CRUD)
- ✅ Mengelola roles & permissions
- ✅ Mengelola data pegawai (termasuk upload foto)
- ✅ Monitoring & mengelola absensi semua pegawai
- ✅ Monitoring login device
- ✅ Tips & best practices untuk admin
- ✅ Troubleshooting

### 👥 Untuk User/Pegawai
📖 **[USER_GUIDE.md](USER_GUIDE.md)** - Panduan lengkap pegawai

Berisi:
- ✅ Login dengan akun pegawai
- ✅ Cara melakukan absensi harian
- ✅ Melihat riwayat absensi sendiri
- ✅ Login device untuk mobile app
- ✅ FAQ lengkap
- ✅ Tips keamanan akun
- ✅ Troubleshooting

---

## 📖 Dokumentasi Teknis

### 📡 API Reference
📖 **[API_ENDPOINTS.md](API_ENDPOINTS.md)** - Dokumentasi lengkap API endpoints

Berisi:
- ✅ Daftar semua endpoint (30 endpoints)
- ✅ Request & response examples
- ✅ Testing dengan cURL
- ✅ Testing dengan Python requests
- ✅ Error codes & handling
- ✅ Authentication & authorization

### 🏗️ Arsitektur
📖 **[CLEAN_ARCHITECTURE_GUIDE.md](CLEAN_ARCHITECTURE_GUIDE.md)** - Panduan Clean Architecture

Berisi:
- ✅ Struktur folder & layer separation
- ✅ Models, Repositories, Services, Endpoints
- ✅ Dependency injection pattern
- ✅ Best practices development

### 📊 Response Format
📖 **[RESPONSE_FORMAT.md](RESPONSE_FORMAT.md)** - Standar format response

Berisi:
- ✅ Success response format
- ✅ Error response format
- ✅ HTTP status codes
- ✅ Consistency guidelines

### � JWT Authentication
📖 **[JWT_AUTHENTICATION.md](JWT_AUTHENTICATION.md)** - JWT with Access & Refresh Token

Berisi:
- ✅ Access Token (3 jam, localStorage)
- ✅ Refresh Token (14 hari, HTTP-only cookie)
- ✅ Security best practices
- ✅ Frontend implementation (React)
- ✅ Complete code examples

📖 **[JWT_MIGRATION_GUIDE.md](JWT_MIGRATION_GUIDE.md)** - Frontend Migration Guide

Berisi:
- ✅ Migration dari token lama ke JWT baru
- ✅ Step-by-step checklist
- ✅ Auto-refresh implementation
- ✅ Common issues & solutions

📖 **[JWT_QUICK_REFERENCE.md](JWT_QUICK_REFERENCE.md)** - Quick Reference

Berisi:
- ✅ Cheat sheet untuk JWT
- ✅ Code snippets siap pakai
- ✅ cURL examples
- ✅ Troubleshooting quick tips

### �🔧 Improvements & Roadmap
📖 **[IMPROVEMENTS.md](IMPROVEMENTS.md)** - Rencana improvement & roadmap

### 🤖 Backend Prompt
📖 **[prompt_backend.md](prompt_backend.md)** - Development context & guidelines

---

## 🧪 Testing

### Testing Guide
📖 **[../tests/README.md](../tests/README.md)** - Panduan testing dengan pytest

Berisi:
- ✅ Setup testing environment
- ✅ Running tests
- ✅ Writing new tests
- ✅ Test coverage

---

## 🗄️ Database

### Database Setup
📖 **[../../database/DOCKER_DATABASE.md](../../database/DOCKER_DATABASE.md)** - Panduan setup database

Berisi:
- ✅ PostgreSQL setup dengan Docker
- ✅ Database schema
- ✅ Initial data seeding
- ✅ Backup & restore

---

## 📋 Quick Links

### Untuk Memulai
| Saya adalah... | Baca dokumentasi ini |
|----------------|---------------------|
| 🆕 Pengguna baru | [QUICK_START.md](QUICK_START.md) |
| 👨‍💼 Administrator | [ADMIN_GUIDE.md](ADMIN_GUIDE.md) |
| 👥 Pegawai/User | [USER_GUIDE.md](USER_GUIDE.md) |
| 👨‍💻 Developer | [CLEAN_ARCHITECTURE_GUIDE.md](CLEAN_ARCHITECTURE_GUIDE.md) |
| 🧪 Tester | [../tests/README.md](../tests/README.md) |

### Untuk Referensi
| Butuh informasi tentang... | Lihat di |
|---------------------------|----------|
| API endpoints | [API_ENDPOINTS.md](API_ENDPOINTS.md) |
| JWT Authentication | [JWT_AUTHENTICATION.md](JWT_AUTHENTICATION.md) |
| JWT Migration (Frontend) | [JWT_MIGRATION_GUIDE.md](JWT_MIGRATION_GUIDE.md) |
| JWT Quick Reference | [JWT_QUICK_REFERENCE.md](JWT_QUICK_REFERENCE.md) |
| Response format | [RESPONSE_FORMAT.md](RESPONSE_FORMAT.md) |
| Database schema | [../../database/DOCKER_DATABASE.md](../../database/DOCKER_DATABASE.md) |
| Testing | [../tests/README.md](../tests/README.md) |

---

## 🎯 Fitur Sistem

### Authentication & Authorization
- ✅ JWT-based authentication with Access & Refresh tokens
- ✅ Role-Based Access Control (RBAC)
- ✅ 2 default roles: `admin` dan `user`
- ✅ Customizable roles & permissions
- ✅ Access Token: 3 hours (localStorage)
- ✅ Refresh Token: 14 days (HTTP-only cookie)
- ✅ Auto-refresh mechanism
- ✅ XSS & CSRF protection

### User Management
- ✅ CRUD users
- ✅ Assign multiple roles to user
- ✅ Link user to pegawai
- ✅ Activate/deactivate user

### Pegawai Management
- ✅ CRUD pegawai (employee data)
- ✅ Photo upload (JPG/PNG)
- ✅ Search by name or NIP
- ✅ Unique NIP & ID validation

### Absensi (Attendance)
- ✅ Dual access pattern:
  - Admin: Full CRUD all records
  - User: Create & view own records
- ✅ Auto-capture IP address
- ✅ Auto-capture pegawai ID from JWT
- ✅ Timestamp tracking
- ✅ Location tracking (id_lokasi)
- ✅ Custom notes (keterangan)

### Device Login Tracking
- ✅ Track device information
- ✅ Support multiple devices per user
- ✅ Player ID for push notifications
- ✅ Device model tracking

---

## 🔧 Teknologi

### Backend
- **Framework**: FastAPI 0.109.0
- **Language**: Python 3.11
- **ORM**: SQLAlchemy 2.0.25
- **Validation**: Pydantic v2 (2.5.3)
- **Authentication**: JWT (python-jose 3.3.0)
- **Password**: bcrypt (passlib 1.7.4)

### Database
- **Database**: PostgreSQL 16
- **Container**: Docker
- **Extensions**: pgvector

### Testing
- **Framework**: pytest 7.4.4
- **Coverage**: pytest-cov 4.1.0
- **HTTP Client**: httpx 0.26.0
- **Fake Data**: faker 22.0.0

### Server
- **ASGI**: uvicorn
- **Host**: 192.168.171.15:8000
- **Platform**: Raspberry Pi (ARM)

---

## 📊 Statistik Sistem

### Endpoints
- **Total**: 30 endpoints
- **Authentication**: 1 endpoint
- **Users**: 5 endpoints
- **Roles**: 5 endpoints
- **Permissions**: 5 endpoints
- **Pegawai**: 5 endpoints
- **Absensi**: 7 endpoints (4 admin + 3 user)
- **Login Absensi**: 3 endpoints (1 user + 2 admin)

### Code Structure
- **Models**: 8 SQLAlchemy models
- **Schemas**: 7 Pydantic modules
- **Repositories**: 6 repository classes
- **Services**: 7 service classes
- **Tests**: 100+ test cases

---

## 🚀 Getting Started

### 1. Akses Sistem

**Swagger UI**: http://192.168.171.15:8000/docs

### 2. Login

**Admin Default:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**⚠️ Ganti password default setelah login pertama!**

### 3. Explore API

Gunakan Swagger UI untuk:
- ✅ Login dan dapatkan token
- ✅ Authorize dengan token
- ✅ Try out semua endpoint
- ✅ Lihat request/response format

### 4. Baca Dokumentasi

- Admin → [ADMIN_GUIDE.md](ADMIN_GUIDE.md)
- User → [USER_GUIDE.md](USER_GUIDE.md)
- Developer → [CLEAN_ARCHITECTURE_GUIDE.md](CLEAN_ARCHITECTURE_GUIDE.md)

---

## 📞 Support

### Dokumentasi
Semua dokumentasi tersedia di folder `/docs`:
```
docs/
├── README.md (file ini)
├── QUICK_START.md
├── ADMIN_GUIDE.md
├── USER_GUIDE.md
├── API_ENDPOINTS.md
├── CLEAN_ARCHITECTURE_GUIDE.md
├── RESPONSE_FORMAT.md
├── IMPROVEMENTS.md
└── prompt_backend.md
```

### Troubleshooting
1. Cek [QUICK_START.md](QUICK_START.md) bagian Troubleshooting
2. Cek [ADMIN_GUIDE.md](ADMIN_GUIDE.md#troubleshooting) untuk admin
3. Cek [USER_GUIDE.md](USER_GUIDE.md#faq) untuk user

### Kontak
- **IT Support**: Hubungi tim IT RSUD Sulfat
- **Developer**: Lihat log di `/backend/logs/`

---

## 📝 Changelog

### Version 2.0.0 (12 Feb 2026) - Current
**Major Release** - Complete System

**New Features:**
- ✅ 30 REST API endpoints
- ✅ JWT authentication with RBAC
- ✅ Complete user & pegawai management
- ✅ Dual access absensi (admin + user)
- ✅ Photo upload support
- ✅ IP address tracking
- ✅ Device login tracking
- ✅ Comprehensive documentation

**Documentation:**
- ✅ Quick Start Guide
- ✅ Admin Guide
- ✅ User Guide
- ✅ Complete API documentation
- ✅ Testing guide

**Testing:**
- ✅ 100+ test cases
- ✅ Full coverage for all endpoints
- ✅ Integration tests

---

## 🎓 Best Practices

### Untuk Admin
1. ✅ Backup database secara rutin
2. ✅ Review permission sebelum assign role
3. ✅ Monitor log dan aktivitas user
4. ✅ Ganti password default
5. ✅ Validasi data sebelum input

### Untuk Developer
1. ✅ Follow Clean Architecture pattern
2. ✅ Write tests untuk setiap feature
3. ✅ Consistent response format
4. ✅ Proper error handling
5. ✅ Document API changes

### Untuk User
1. ✅ Absensi tepat waktu
2. ✅ Isi data dengan benar
3. ✅ Jaga kerahasiaan password
4. ✅ Logout setelah selesai
5. ✅ Laporkan anomali ke admin

---

## 🔐 Keamanan

### Authentication
- JWT token dengan expiration 30 menit
- Password hashing dengan bcrypt
- Role-based access control

### Authorization
- Endpoint protection dengan dependencies
- Admin-only endpoints (users, roles, permissions, pegawai)
- User-scoped data access (hanya lihat data sendiri)

### Data Protection
- IP address tracking untuk audit
- Device tracking untuk monitoring
- Secure password storage (hashed)

---

## 🌟 Fitur Unggulan

### 1. Dual Access Pattern
- Admin: Full control semua data
- User: Scoped access (hanya data sendiri)

### 2. Auto-Capture Data
- IP address otomatis dari request
- Pegawai ID otomatis dari JWT token
- Timestamp otomatis dari server

### 3. Photo Upload
- Support JPG/PNG
- Auto-delete old photos on update
- Organized storage structure

### 4. Comprehensive Documentation
- 3 user guides (Quick Start, Admin, User)
- Complete API documentation
- Testing guide
- Architecture guide

### 5. Production Ready
- ✅ Error handling
- ✅ Input validation
- ✅ Security (JWT + RBAC)
- ✅ Logging
- ✅ Testing
- ✅ Documentation

---

**Sistem Absensi RSUD Sulfat v2.0.0**  
**Environment**: Production  
**Last Updated**: 12 Februari 2026

---

**Terima kasih telah menggunakan Sistem Absensi RSUD Sulfat!** 🎉
