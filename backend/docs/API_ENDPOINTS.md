# API Endpoints Documentation

API untuk sistem Attendance RSUD Sulfat dengan RBAC (Role-Based Access Control)

**Base URL**: `http://192.168.171.15:8000/api/v1`

**Swagger Documentation**: `http://192.168.171.15:8000/docs`

---

## 🔐 Authentication

Semua endpoint (kecuali `/auth/login`) memerlukan JWT token di header:

```
Authorization: Bearer <your_jwt_token>
```

### Test Super Admin Account (Jika Tersedia)

Gunakan kredensial dari env `ADMIN_USERNAME` dan `ADMIN_PASSWORD`.

```
Username: <ADMIN_USERNAME>
Password: <ADMIN_PASSWORD>
```

---

## 📋 API Endpoints Summary

### 1. Authentication

| Method | Endpoint | Deskripsi | Auth | Role |

### 2. Users (Implemented ✅)

| Method | Endpoint | Deskripsi | Auth | Permission |
|--------|----------|-----------|------|------------|
| GET | `/users/` | List user | ✔️ | `users.read` |
| POST | `/users/` | Buat user | ✔️ | `users.create` |
| GET | `/users/{id}` | Detail user | ✔️ | `users.read` |
| PUT | `/users/{id}` | Update user | ✔️ | `users.update` |
| DELETE | `/users/{id}` | Hapus user | ✔️ | `users.delete` |

### 3. Roles (Implemented ✅)

| GET | `/roles/` | List role | ✔️ | super-admin |
| POST | `/roles/` | Buat role | ✔️ | super-admin |
| GET | `/roles/{id}` | Detail role | ✔️ | super-admin |
| PUT | `/roles/{id}` | Update role | ✔️ | super-admin |
| DELETE | `/roles/{id}` | Hapus role | ✔️ | super-admin |

### 4. Permissions (Implemented ✅)

| Method | Endpoint | Deskripsi | Auth | Role |
|--------|----------|-----------|------|------|
| GET | `/permissions/` | List permission | ✔️ | super-admin |
| POST | `/permissions/` | Buat permission | ✔️ | super-admin |
| GET | `/permissions/{id}` | Detail permission | ✔️ | super-admin |
| PUT | `/permissions/{id}` | Update permission | ✔️ | super-admin |
| DELETE | `/permissions/{id}` | Hapus permission | ✔️ | super-admin |

### 5. Pegawai (Implemented ✅)

| Method | Endpoint | Deskripsi | Auth | Permission |
|--------|----------|-----------|------|------------|
| GET | `/pegawai/` | List/search pegawai | ✔️ | `pegawai.read` |
| POST | `/pegawai/` | Tambah pegawai | ✔️ | `pegawai.create` |
| GET | `/pegawai/{id}` | Detail pegawai | ✔️ | `pegawai.read` |
# ===== Privileged Endpoints =====
| DELETE | `/pegawai/{id}` | Hapus pegawai | ✔️ | `pegawai.delete` |

### 6. Absensi (Implemented ✅)

**Privileged Endpoints**

| Method | Endpoint | Deskripsi | Auth | Permission |
|--------|----------|-----------|------|------|
| GET | `/absensi/` | List semua absensi | ✔️ | `absensi.read` |
| GET | `/absensi/{id}` | Detail absensi | ✔️ | `absensi.read` |
| PUT | `/absensi/{id}` | Update absensi | ✔️ | `absensi.update` |
| DELETE | `/absensi/{id}` | Hapus absensi | ✔️ | `absensi.delete` |

**User Dashboard Endpoints**

| Method | Endpoint | Deskripsi | Auth | Permission |
|--------|----------|-----------|------|------|
| POST | `/absensi/create` | User melakukan absensi | ✔️ | `absensi.create` |
| GET | `/absensi/me` | List absensi milik user | ✔️ | `absensi.read` |
| GET | `/absensi/me/{id}` | Detail absensi milik user | ✔️ | `absensi.read` |

### 7. Login Absensi (Implemented ✅)

| Method | Endpoint | Deskripsi | Auth | Permission |
|--------|----------|-----------|------|------------|
| POST | `/login-absensi/` | Catat login absensi | ✔️ | `login_absensi.create` |
| GET | `/login-absensi/` | List login absensi | ✔️ | `login_absensi.read` |
| GET | `/login-absensi/{id}` | Detail login absensi | ✔️ | `login_absensi.read` |

---

## 📖 API Details

### 1. Authentication

#### POST `/auth/login`

Login dan mendapatkan JWT token.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user_id": 1,
    "username": "admin",
    "roles": ["super-admin"]
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Incorrect username or password"
}
```

---

### 2. Users Management

#### GET `/users/`

Get list semua users (with pagination).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "username": "admin",
        "id_pegawai": null,
        "is_active": true,
        "created_at": "2026-02-12T09:00:00",
        "roles": ["admin"],
        "pegawai_nama": null
      }
    ],
    "page": 1,
    "limit": 10
  }
}
```

#### POST `/users/`

Create user baru.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "username": "user1",
  "password": "password123",
  "id_pegawai": "P001",
  "is_active": true,
  "role_ids": [2]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": 2,
    "username": "user1",
    "id_pegawai": "P001",
    "is_active": true,
    "created_at": "2026-02-12T09:30:00",
    "roles": ["user"]
  }
}
```

#### GET `/users/{user_id}`

Get detail user by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": 1,
    "username": "admin",
    "id_pegawai": null,
    "is_active": true,
    "created_at": "2026-02-12T09:00:00",
    "roles": ["admin"],
    "pegawai_nama": null
  }
}
```

#### PUT `/users/{user_id}`

Update user data.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body (all fields optional):**
```json
{
  "username": "newusername",
  "password": "newpassword123",
  "id_pegawai": "P002",
  "is_active": false,
  "role_ids": [1, 2]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": 2,
    "username": "newusername",
    "id_pegawai": "P002",
    "is_active": false,
    "created_at": "2026-02-12T09:30:00",
    "roles": ["admin", "user"]
  }
}
```

#### DELETE `/users/{user_id}`

Delete user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User with id 2 deleted successfully",
  "data": null
}
```

---

### 3. Roles Management

#### GET `/roles/`

Get list semua roles (with pagination).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Roles retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "admin",
        "description": "Administrator role with full access",
        "permissions": ["user.login", "absensi.create", "absensi.read", "absensi.update", "absensi.delete"]
      },
      {
        "id": 2,
        "name": "user",
        "description": "Standard user role",
        "permissions": ["user.login", "absensi.create", "absensi.read"]
      }
    ],
    "page": 1,
    "limit": 10
  }
}
```

#### POST `/roles/`

Create role baru.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "manager",
  "description": "Manager role",
  "permission_ids": [1, 2, 3]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "id": 3,
    "name": "manager",
    "description": "Manager role",
    "permissions": ["user.login", "absensi.create", "absensi.read"]
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Role with name 'manager' already exists"
}
```

#### GET `/roles/{role_id}`

Get detail role by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Role retrieved successfully",
  "data": {
    "id": 1,
    "name": "admin",
    "description": "Administrator role with full access",
    "permissions": ["user.login", "absensi.create", "absensi.read", "absensi.update", "absensi.delete"]
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Role with id 999 not found"
}
```

#### PUT `/roles/{role_id}`

Update role data.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body (all fields optional):**
```json
{
  "name": "supervisor",
  "description": "Updated description",
  "permission_ids": [1, 2, 3, 4]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Role updated successfully",
  "data": {
    "id": 3,
    "name": "supervisor",
    "description": "Updated description",
    "permissions": ["user.login", "absensi.create", "absensi.read", "absensi.update"]
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Role with name 'supervisor' already exists"
}
```

#### DELETE `/roles/{role_id}`

Delete role.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Role with id 3 deleted successfully",
  "data": null
}
```

**Error Response (400 Bad Request - System Role):**
```json
{
  "success": false,
  "message": "Cannot delete system role 'admin'"
}
```

**Note:** System roles (`admin` and `user`) cannot be deleted.

---

### 4. Permissions Management

#### GET `/permissions/`

Get list semua permissions (with pagination).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Permissions retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "user.login",
        "description": "Login to application"
      },
      {
        "id": 2,
        "name": "absensi.create",
        "description": "Create attendance"
      },
      {
        "id": 3,
        "name": "absensi.read",
        "description": "Read attendance"
      }
    ],
    "page": 1,
    "limit": 10
  }
}
```

#### POST `/permissions/`

Create permission baru.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "pegawai.create",
  "description": "Create employee"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Permission created successfully",
  "data": {
    "id": 6,
    "name": "pegawai.create",
    "description": "Create employee"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Permission with name 'pegawai.create' already exists"
}
```

#### GET `/permissions/{permission_id}`

Get detail permission by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Permission retrieved successfully",
  "data": {
    "id": 1,
    "name": "user.login",
    "description": "Login to application"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Permission with id 999 not found"
}
```

#### PUT `/permissions/{permission_id}`

Update permission data.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body (all fields optional):**
```json
{
  "name": "pegawai.update",
  "description": "Updated description"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Permission updated successfully",
  "data": {
    "id": 6,
    "name": "pegawai.update",
    "description": "Updated description"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Permission with name 'pegawai.update' already exists"
}
```

#### DELETE `/permissions/{permission_id}`

Delete permission.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Permission with id 6 deleted successfully",
  "data": null
}
```

**Error Response (400 Bad Request - System Permission):**
```json
{
  "success": false,
  "message": "Cannot delete system permission 'user.login'"
}
```

**Note:** System permissions (`user.login`, `absensi.create`, `absensi.read`, `absensi.update`, `absensi.delete`) cannot be deleted.

---

### 5. Pegawai Management

#### GET `/pegawai/`

Get list pegawai or search by name/NIP (with pagination).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page
- `search` (optional): Search query for name or NIP

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Pegawai retrieved successfully",
  "data": {
    "items": [
      {
        "id_pegawai": "P001",
        "nip": "123456789",
        "nama": "John Doe",
        "jenis_kelamin": "L",
        "tempat_lahir": "Jakarta",
        "tanggal_lahir": "1990-01-01",
        "alamat": "Jl. Test No. 123",
        "id_ruang": 1,
        "status": "Aktif",
        "foto": "P001.jpg",
        "created_at": "2026-02-12T10:00:00"
      }
    ],
    "page": 1,
    "limit": 10,
    "search": null
  }
}
```

#### POST `/pegawai/`

Create pegawai baru (with optional photo upload).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `id_pegawai` (required): Employee ID
- `nip` (optional): NIP number
- `nama` (optional): Name
- `jenis_kelamin` (optional): Gender (L/P)
- `tempat_lahir` (optional): Place of birth
- `tanggal_lahir` (optional): Date of birth (YYYY-MM-DD)
- `alamat` (optional): Address
- `id_ruang` (optional): Room ID
- `status` (optional): Status
- `foto` (optional): Photo file (JPG/PNG)

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Pegawai created successfully",
  "data": {
    "id_pegawai": "P001",
    "nip": "123456789",
    "nama": "John Doe",
    "jenis_kelamin": "L",
    "tempat_lahir": "Jakarta",
    "tanggal_lahir": "1990-01-01",
    "alamat": "Jl. Test No. 123",
    "id_ruang": null,
    "status": "Aktif",
    "foto": "P001.jpg",
    "created_at": "2026-02-12T10:00:00"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Pegawai with id 'P001' already exists"
}
```

#### GET `/pegawai/{pegawai_id}`

Get detail pegawai by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Pegawai retrieved successfully",
  "data": {
    "id_pegawai": "P001",
    "nip": "123456789",
    "nama": "John Doe",
    "jenis_kelamin": "L",
    "tempat_lahir": "Jakarta",
    "tanggal_lahir": "1990-01-01",
    "alamat": "Jl. Test No. 123",
    "id_ruang": 1,
    "status": "Aktif",
    "foto": "P001.jpg",
    "created_at": "2026-02-12T10:00:00"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Pegawai with id P999 not found"
}
```

#### PUT `/pegawai/{pegawai_id}`

Update pegawai data (with optional new photo).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data (all optional):**
- `nip`: NIP number
- `nama`: Name
- `jenis_kelamin`: Gender (L/P)
- `tempat_lahir`: Place of birth
- `tanggal_lahir`: Date of birth (YYYY-MM-DD)
- `alamat`: Address
- `id_ruang`: Room ID
- `status`: Status
- `foto`: New photo file (JPG/PNG)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Pegawai updated successfully",
  "data": {
    "id_pegawai": "P001",
    "nip": "123456789",
    "nama": "John Doe Updated",
    "jenis_kelamin": "L",
    "tempat_lahir": "Jakarta",
    "tanggal_lahir": "1990-01-01",
    "alamat": "Jl. Updated No. 456",
    "id_ruang": 2,
    "status": "Aktif",
    "foto": "P001.jpg",
    "created_at": "2026-02-12T10:00:00"
  }
}
```

#### DELETE `/pegawai/{pegawai_id}`

Delete pegawai.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Pegawai with id P001 deleted successfully",
  "data": null
}
```

**Note:** Deleting pegawai will also delete associated photo file from server.

---

### 6. Absensi Management

Absensi endpoints implement **dual access pattern**:
- **Privileged**: Full CRUD access (requires `absensi.read/update/delete`)
- **User**: Create and view own records (requires `absensi.create/read`)

#### Privileged Endpoints

##### GET `/absensi/`

Get all absensi records with employee information (requires `absensi.read`).

**Headers:**
```
Authorization: Bearer <token_with_permission>
```

**Query Parameters:**
- `skip` (optional, default: 0): Number of records to skip
- `limit` (optional, default: 100): Maximum records to return

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Absensi retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "id_pegawai": "P001",
        "id_lokasi": "LOK001",
        "uid": "ABC123",
        "tanggal": "2026-02-15T08:30:00",
        "keterangan": "Hadir tepat waktu",
        "ip_address": "192.168.1.100",
        "pegawai_nama": "John Doe",
        "pegawai_nip": "123456"
      }
    ]
  }
}
```

##### GET `/absensi/{id}`

Get specific absensi by ID (requires `absensi.read`).

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Absensi retrieved successfully",
  "data": {
    "id": 1,
    "id_pegawai": "P001",
    "id_lokasi": "LOK001",
    "uid": "ABC123",
    "tanggal": "2026-02-15T08:30:00",
    "keterangan": "Hadir tepat waktu",
    "ip_address": "192.168.1.100",
    "pegawai_nama": "John Doe",
    "pegawai_nip": "123456"
  }
}
```

##### PUT `/absensi/{id}`

Update absensi record (requires `absensi.update`).

**Request Body:**
```json
{
  "id_lokasi": "LOK002",
  "keterangan": "Hadir dengan izin terlambat",
  "tanggal": "2026-02-15T09:00:00"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Absensi updated successfully",
  "data": {
    "id": 1,
    "id_pegawai": "P001",
    "id_lokasi": "LOK002",
    "keterangan": "Hadir dengan izin terlambat",
    "tanggal": "2026-02-15T09:00:00"
  }
}
```

##### DELETE `/absensi/{id}`

Delete absensi record (requires `absensi.delete`).

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Absensi deleted successfully"
}
```

#### User Dashboard Endpoints

##### POST `/absensi/create`

User creates absensi (automatically captures IP address and pegawai from JWT token).

**Headers:**
```
Authorization: Bearer <user_token>
```

**Request Body:**
```json
{
  "id_lokasi": "LOK001",
  "uid": "ABC123",
  "keterangan": "Hadir tepat waktu"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Absensi created successfully",
  "data": {
    "id": 1,
    "id_pegawai": "P001",
    "id_lokasi": "LOK001",
    "uid": "ABC123",
    "tanggal": "2026-02-15T08:30:00",
    "keterangan": "Hadir tepat waktu",
    "ip_address": "192.168.1.100"
  }
}
```

**Note:** `id_pegawai` and `ip_address` are automatically captured from JWT token and HTTP request.

##### GET `/absensi/me`

Get user's own absensi records.

**Headers:**
```
Authorization: Bearer <user_token>
```

**Query Parameters:**
- `skip` (optional, default: 0): Number of records to skip
- `limit` (optional, default: 100): Maximum records to return

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Your absensi retrieved successfully",
  "data": {
    "items": [
      {
        "id": 1,
        "id_pegawai": "P001",
        "id_lokasi": "LOK001",
        "uid": "ABC123",
        "tanggal": "2026-02-15T08:30:00",
        "keterangan": "Hadir tepat waktu",
        "ip_address": "192.168.1.100"
      }
    ]
  }
}
```

##### GET `/absensi/me/{id}`

Get specific user's own absensi by ID.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Your absensi retrieved successfully",
  "data": {
    "id": 1,
    "id_pegawai": "P001",
    "id_lokasi": "LOK001",
    "uid": "ABC123",
    "tanggal": "2026-02-15T08:30:00",
    "keterangan": "Hadir tepat waktu",
    "ip_address": "192.168.1.100"
  }
}
```

**Error (404 Not Found):**
```json
{
  "success": false,
  "message": "Absensi with id 999 not found for your account"
}
```

**Note:** Users can only access their own absensi records.

---

### 7. Login Absensi (Device Login Tracking)

Tracks device login information for the mobile attendance app.

##### POST `/login-absensi/`

User creates device login record (automatically captures pegawai from JWT token).

**Headers:**
```
Authorization: Bearer <user_token>
```

**Request Body:**
```json
{
  "uid": "DEVICE123",
  "player_id": "PLAYER456",
  "model": "Samsung Galaxy A52"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Login absensi created successfully",
  "data": {
    "id": 1,
    "id_pegawai": "P001",
    "uid": "DEVICE123",
    "player_id": "PLAYER456",
    "model": "Samsung Galaxy A52",
    "created_at": "2026-02-15T08:00:00"
  }
}
```

##### GET `/login-absensi/`

Get all device login records (requires `login_absensi.read`).

**Headers:**
```
Authorization: Bearer <token_with_permission>
```

**Query Parameters:**
- `skip` (optional, default: 0): Number of records to skip
- `limit` (optional, default: 100): Maximum records to return

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login absensi retrieved successfully",
  "data": [
    {
      "id": 1,
      "id_pegawai": "P001",
      "uid": "DEVICE123",
      "player_id": "PLAYER456",
      "model": "Samsung Galaxy A52",
      "created_at": "2026-02-15T08:00:00",
      "pegawai_nama": "John Doe"
    }
  ]
}
```

##### GET `/login-absensi/{id}`

Get specific device login record (requires `login_absensi.read`).

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login absensi retrieved successfully",
  "data": {
    "id": 1,
    "id_pegawai": "P001",
    "uid": "DEVICE123",
    "player_id": "PLAYER456",
    "model": "Samsung Galaxy A52",
    "created_at": "2026-02-15T08:00:00",
    "pegawai_nama": "John Doe"
  }
}
```

---

## 🧪 Testing dengan cURL

### 1. Login
```bash
curl -X POST http://192.168.171.15:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### 2. Get Users (dengan token)
```bash
TOKEN="your_jwt_token_here"

curl -X GET "http://192.168.171.15:8000/api/v1/users/?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Create User
```bash
TOKEN="your_jwt_token_here"

curl -X POST http://192.168.171.15:8000/api/v1/users/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123",
    "id_pegawai": null,
    "is_active": true,
    "role_ids": [2]
  }'
```

### 4. Get User by ID
```bash
TOKEN="your_jwt_token_here"

curl -X GET http://192.168.171.15:8000/api/v1/users/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Update User
```bash
TOKEN="your_jwt_token_here"

curl -X PUT http://192.168.171.15:8000/api/v1/users/2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "updateduser",
    "is_active": false
  }'
```

### 6. Delete User
```bash
TOKEN="your_jwt_token_here"

curl -X DELETE http://192.168.171.15:8000/api/v1/users/2 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🧪 Testing dengan Python requests

```python
import requests

BASE_URL = "http://192.168.171.15:8000/api/v1"

# 1. Login
login_response = requests.post(
    f"{BASE_URL}/auth/login",
    json={"username": "admin", "password": "admin123"}
)
token = login_response.json()["data"]["access_token"]

# Headers untuk request selanjutnya
headers = {"Authorization": f"Bearer {token}"}

# 2. Get Users
users_response = requests.get(f"{BASE_URL}/users/", headers=headers)
print(users_response.json())

# 3. Create User
new_user = {
    "username": "testuser",
    "password": "test123",
    "is_active": True,
    "role_ids": [2]
}
create_response = requests.post(f"{BASE_URL}/users/", json=new_user, headers=headers)
print(create_response.json())

# 4. Get User by ID
user_id = create_response.json()["data"]["id"]
user_response = requests.get(f"{BASE_URL}/users/{user_id}", headers=headers)
print(user_response.json())

# 5. Update User
update_data = {"is_active": False}
update_response = requests.put(f"{BASE_URL}/users/{user_id}", json=update_data, headers=headers)
print(update_response.json())

# 6. Delete User
delete_response = requests.delete(f"{BASE_URL}/users/{user_id}", headers=headers)
print(delete_response.json())
```

---

## 📊 Response Format

Semua endpoint menggunakan format response standar:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

**Catatan koleksi (list):**
- Untuk list yang dipaginasi, data dibungkus dalam `data.items`.
- Untuk list non-paginasi tertentu (contoh: `GET /login-absensi/`), response menggunakan array langsung di `data`.

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## 🔒 Error Codes

| Status Code | Deskripsi |
|-------------|-----------|
| 200 | OK - Request berhasil |
| 201 | Created - Resource berhasil dibuat |
| 400 | Bad Request - Input tidak valid |
| 401 | Unauthorized - Token tidak valid/expired |
| 403 | Forbidden - Tidak punya permission |
| 404 | Not Found - Resource tidak ditemukan |
| 500 | Internal Server Error - Error di server |

---

## 🚀 Next Steps

All endpoints have been implemented! ✅

Completed endpoints:
- ✅ Auth & Users
- ✅ Roles
- ✅ Permissions
- ✅ Pegawai
- ✅ Absensi (Privileged & User Dashboard)
- ✅ Login Absensi

The attendance system API is now complete with:
- Full RBAC (Role-Based Access Control)
- JWT authentication
- Dual access patterns (Privileged + User)
- File upload support (Pegawai photos)
- IP address tracking (Absensi)
- Device login tracking (Login Absensi)
- Comprehensive test coverage

---

## 📝 Database Schema

### Roles (Default)
- `super-admin` - Full system access (roles & permissions management)
- `admin` - Privileged access (depends on assigned permissions)
- `user` - Pegawai yang melakukan absensi

### Permissions (Default)
- `user.login` - Login aplikasi
- `users.read` - Melihat data user
- `users.create` - Membuat user
- `users.update` - Mengubah user
- `users.delete` - Menghapus user
- `roles.read` - Melihat data role
- `roles.create` - Membuat role
- `roles.update` - Mengubah role
- `roles.delete` - Menghapus role
- `permissions.read` - Melihat data permission
- `permissions.create` - Membuat permission
- `permissions.update` - Mengubah permission
- `permissions.delete` - Menghapus permission
- `pegawai.read` - Melihat data pegawai
- `pegawai.create` - Membuat pegawai
- `pegawai.update` - Mengubah pegawai
- `pegawai.delete` - Menghapus pegawai
- `absensi.read` - Melihat data absensi
- `absensi.create` - Membuat absensi
- `absensi.update` - Mengubah data absensi
- `absensi.delete` - Menghapus data absensi
- `login_absensi.read` - Melihat data login absensi
- `login_absensi.create` - Membuat login absensi

---

## 🔧 Development

### Start Server
```bash
cd /home/sultan/fast-absen/backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Access API
- **API**: http://192.168.171.15:8000
- **Swagger Docs**: http://192.168.171.15:8000/docs
- **ReDoc**: http://192.168.171.15:8000/redoc
