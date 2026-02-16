# JWT Authentication Guide

## 📋 Overview

Sistem RSUD Sulfat Attendance menggunakan **JWT (JSON Web Token)** authentication dengan **2 jenis token**:
1. **Access Token** - Token pendek untuk akses API (disimpan di localStorage)
2. **Refresh Token** - Token panjang untuk memperbaharui access token (disimpan di HTTP-only cookie)

---

## 🎯 Spesifikasi Token

### 1. JWT Access Token

**Tujuan:** Autentikasi setiap request API

| Property | Value |
|----------|-------|
| **Masa Berlaku** | 3 jam (180 menit) |
| **Disimpan Di** | `localStorage` (React/Frontend) |
| **Keamanan** | Pendek → aman, mudah dipakai React |

**Payload:**
```json
{
  "sub": "user_id",           // Subject (user identifier)
  "username": "edy",
  "roles": ["user", "admin"],
  "iat": 1739350000,          // Issued at (timestamp)
  "exp": 1739360800,          // Expiration (timestamp)
  "iss": "auth-server",       // Issuer
  "aud": "internal-apps"      // Audience
}
```

**Alasan:**
- ✅ Pendek → Aman (jika dicuri, cepat expired)
- ✅ Mudah dipakai React (localStorage)
- ✅ Tidak berisi data sensitif (password, dll)

---

### 2. Refresh Token

**Tujuan:** Memperbaharui access token tanpa login ulang

| Property | Value |
|----------|-------|
| **Masa Berlaku** | 14 hari |
| **Disimpan Di** | `HTTP-only Secure Cookie` |
| **Keamanan** | Tidak bisa dicuri JavaScript (aman dari XSS) |

**Payload:**
```json
{
  "sub": "user_id",      // Subject (user identifier)
  "type": "refresh",     // Token type
  "iat": 1739350000,     // Issued at
  "exp": 1739954800      // Expiration (14 days later)
}
```

**Alasan:**
- ✅ User jarang login (14 hari)
- ✅ Aman dari XSS (HTTP-only cookie tidak bisa diakses JavaScript)
- ✅ Hanya dipakai untuk refresh access token
- ✅ Auto-sent oleh browser (tidak perlu manual handling)

---

## 🔧 Konfigurasi

File: `backend/config/settings.py`

```python
# Security & JWT
SECRET_KEY: str = "your-secret-key-change-in-production"
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = 180  # 3 hours
REFRESH_TOKEN_EXPIRE_DAYS: int = 14     # 14 days
JWT_ISSUER: str = "auth-server"
JWT_AUDIENCE: str = "internal-apps"
```

**⚠️ PENTING:**
- Ganti `SECRET_KEY` di production dengan nilai yang aman
- Gunakan `openssl rand -hex 32` untuk generate secret key
- Jangan commit secret key ke Git

---

## 📡 API Endpoints

### 1. Login - `POST /api/v1/auth/login`

**Request:**
```json
{
  "username": "edy",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user_id": 1,
    "username": "edy",
    "roles": ["user", "admin"]
  }
}
```

**Cookie Auto-Set:**
```
refresh_token=<token>; HttpOnly; Secure; SameSite=Lax; Max-Age=1209600; Path=/api/v1/auth
```

**HTTP Headers:**
```
Set-Cookie: refresh_token=eyJhbGc...; HttpOnly; Secure; SameSite=Lax; Max-Age=1209600; Path=/api/v1/auth
```

---

### 2. Refresh Token - `POST /api/v1/auth/refresh`

**Request:**
```
Tidak perlu body. Cookie otomatis dikirim oleh browser.
```

**Response:**
```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user_id": 1,
    "username": "edy",
    "roles": ["user", "admin"]
  }
}
```

**Error Responses:**
- **401 Unauthorized:** Refresh token tidak ada, invalid, atau expired
  ```json
  {
    "success": false,
    "message": "Refresh token not found. Please login again."
  }
  ```

---

### 3. Logout - `POST /api/v1/auth/logout`

**Request:**
```
Tidak perlu body
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": null
}
```

**Action:** Cookie `refresh_token` dihapus

---

## 💻 Frontend Implementation (React)

### 1. Setup Axios Instance

```javascript
// src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // PENTING: untuk kirim/terima cookie
});

// Add access token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-refresh when access token expired
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const { data } = await axios.post(
          'http://localhost:8000/api/v1/auth/refresh',
          {},
          { withCredentials: true }
        );

        // Update access token
        localStorage.setItem('access_token', data.data.access_token);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

### 2. Login Component

```javascript
// src/pages/Login.jsx
import { useState } from 'react';
import api from '../api/axios';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const { data } = await api.post('/auth/login', {
        username,
        password,
      });

      if (data.success) {
        // Simpan access token di localStorage
        localStorage.setItem('access_token', data.data.access_token);
        
        // Simpan user info
        localStorage.setItem('user', JSON.stringify({
          user_id: data.data.user_id,
          username: data.data.username,
          roles: data.data.roles,
        }));

        // Refresh token otomatis tersimpan di cookie (HTTP-only)
        
        // Redirect ke dashboard
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit">Login</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

---

### 3. Auto-Refresh Timer (Optional)

**Cara 1: Refresh setiap 2.5 jam (sebelum expired)**
```javascript
// src/utils/tokenRefresh.js
import api from '../api/axios';

let refreshTimer;

export function startTokenRefresh() {
  // Clear existing timer
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  // Refresh every 2.5 hours (before 3 hours expiry)
  refreshTimer = setInterval(async () => {
    try {
      const { data } = await api.post('/auth/refresh');
      
      if (data.success) {
        localStorage.setItem('access_token', data.data.access_token);
        console.log('Token refreshed successfully');
      }
    } catch (error) {
      console.error('Auto-refresh failed:', error);
      // Will be handled by interceptor (logout)
    }
  }, 2.5 * 60 * 60 * 1000); // 2.5 hours
}

export function stopTokenRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
```

**Cara 2: Refresh on-demand (lebih efisien)**
```javascript
// Gunakan interceptor di axios.js (sudah ada di contoh atas)
// Token hanya di-refresh saat benar-benar expired (401)
```

**💡 Rekomendasi:** Gunakan **Cara 2 (on-demand)** karena:
- Lebih efisien (tidak perlu refresh berkala)
- Auto-handle expired token
- Tidak perlu manage timer

---

### 4. Logout Component

```javascript
// src/components/LogoutButton.jsx
import api from '../api/axios';

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      // Call logout endpoint (clear refresh token cookie)
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      
      // Redirect to login
      window.location.href = '/login';
    }
  };

  return (
    <button onClick={handleLogout}>Logout</button>
  );
}
```

---

### 5. Protected Route

```javascript
// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  const token = localStorage.getItem('access_token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Check if user is authenticated
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (requiredRoles.length > 0) {
    const hasRole = requiredRoles.some(role => user.roles?.includes(role));
    if (!hasRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}

// Usage:
// <Route path="/admin" element={
//   <ProtectedRoute requiredRoles={['admin']}>
//     <AdminPage />
//   </ProtectedRoute>
// } />
```

---

### 6. Get Current User

```javascript
// src/utils/auth.js
export function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

export function hasRole(role) {
  const user = getCurrentUser();
  return user?.roles?.includes(role) || false;
}

export function isAdmin() {
  return hasRole('admin');
}

export function isAuthenticated() {
  return !!localStorage.getItem('access_token');
}
```

---

## 🔐 Security Features

| Feature | Status | Keterangan |
|---------|--------|------------|
| **Short-lived Access Token** | ✅ | 3 jam - jika dicuri, cepat expired |
| **HTTP-only Cookie** | ✅ | JavaScript tidak bisa akses refresh token |
| **Secure Cookie** | ✅ | Hanya dikirim via HTTPS (production) |
| **SameSite=Lax** | ✅ | Proteksi CSRF attack |
| **JWT Signature (HS256)** | ✅ | Token tidak bisa diubah/dipalsukan |
| **Issuer & Audience Validation** | ✅ | Validasi tambahan saat decode token |
| **Token Type Validation** | ✅ | Refresh token hanya untuk refresh |
| **User Active Check** | ✅ | Validasi user masih aktif saat refresh |

---

## 🛡️ Best Practices

### 1. **Access Token di localStorage**
✅ **Aman karena:**
- Token pendek (3 jam)
- Tidak berisi data sensitif
- Auto-refresh sebelum expired

⚠️ **Risiko:**
- XSS (Cross-Site Scripting) bisa curi token
- **Mitigasi:** Sanitize user input, CSP headers, trusted dependencies

---

### 2. **Refresh Token di HTTP-only Cookie**
✅ **Aman karena:**
- JavaScript tidak bisa akses
- Auto-sent oleh browser
- Aman dari XSS attack

⚠️ **Risiko:**
- CSRF (Cross-Site Request Forgery)
- **Mitigasi:** SameSite=Lax, CORS configuration

---

### 3. **Production Checklist**

```bash
# 1. Generate strong secret key
openssl rand -hex 32

# 2. Set environment variables
export SECRET_KEY="your-generated-secret-key"
export ENVIRONMENT="production"
export DEBUG="False"

# 3. Enable HTTPS
# - Set secure=True for cookies
# - Use SSL certificate

# 4. Configure CORS
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
```

---

### 4. **Token Expiry Strategy**

| Token Type | Development | Production |
|------------|-------------|------------|
| Access Token | 3 hours | 2-3 hours |
| Refresh Token | 14 days | 7-14 days |

**Adjustment:**
- Backend internal: Access token bisa lebih panjang (6-8 jam)
- Public API: Access token lebih pendek (30-60 menit)
- Mobile app: Refresh token bisa lebih panjang (30 hari)

---

## 🧪 Testing

### Manual Testing dengan cURL

```bash
# 1. Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  -c cookies.txt

# Response akan berisi access_token dan set refresh_token di cookie

# 2. Test Refresh Token
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -b cookies.txt

# 3. Test Logout
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -b cookies.txt
```

---

### Testing dengan Postman/Insomnia

**Setup:**
1. Enable "Send cookies automatically"
2. Login → Cookie refresh_token akan auto-saved
3. Refresh endpoint akan auto-send cookie

---

## 📊 Token Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                        User Login                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
               ┌──────────────────┐
               │  Login Endpoint  │
               └────────┬─────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐              ┌──────────────────┐
│ Access Token  │              │  Refresh Token   │
│   (3 hours)   │              │    (14 days)     │
│ → localStorage│              │ → HTTP-only Cookie│
└───────┬───────┘              └────────┬─────────┘
        │                               │
        │                               │
        ▼                               │
┌────────────────┐                      │
│   API Request  │                      │
│  with Bearer   │                      │
│     Token      │                      │
└───────┬────────┘                      │
        │                               │
    ┌───┴────┐                          │
    │ Valid? │                          │
    └───┬────┘                          │
        │                               │
   ┌────┴────┐                          │
   │   YES   │   NO (401)               │
   ▼         ▼                          │
Success   ┌──────────────┐              │
          │ Auto-Refresh │◄─────────────┘
          └──────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │  New Access   │
         │     Token     │
         └───────────────┘
```

---

## 🔄 Migration dari Token Lama

Jika sebelumnya menggunakan simple token (tanpa refresh):

```python
# Before (OLD)
ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # 30 menit

# After (NEW)
ACCESS_TOKEN_EXPIRE_MINUTES: int = 180  # 3 jam
REFRESH_TOKEN_EXPIRE_DAYS: int = 14     # 14 hari
```

**Frontend Changes:**
1. Update login untuk handle cookie
2. Tambah `withCredentials: true` di axios
3. Implement auto-refresh di interceptor
4. (Optional) Remove manual token expiry check

---

## ❓ FAQ

### Q: Kenapa tidak simpan refresh token di localStorage?
**A:** HTTP-only cookie aman dari XSS. Jika attacker inject malicious script, mereka tidak bisa akses refresh token.

### Q: Kenapa access token di localStorage, bukan cookie?
**A:** Mudah dipakai di React (axios/fetch). Token pendek jadi aman meski di localStorage.

### Q: Bagaimana handle multiple devices/sessions?
**A:** Current implementation allow multiple sessions. Untuk kontrol lebih ketat, simpan refresh token di database.

### Q: Apakah perlu blacklist token saat logout?
**A:** Untuk sistem basic: tidak perlu (refresh token sudah dihapus). Untuk high-security: simpan blacklist di Redis.

### Q: Access token expired di tengah proses?
**A:** Axios interceptor auto-refresh dan retry request. User tidak akan terganggu.

---

## 📚 References

- [JWT.io](https://jwt.io/)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [RFC 7519 - JWT Specification](https://datatracker.ietf.org/doc/html/rfc7519)

---

## 📝 Changelog

- **2026-02-16**: Initial JWT implementation with access & refresh tokens
  - Access token: 3 hours (localStorage)
  - Refresh token: 14 days (HTTP-only cookie)
  - Added `/login`, `/refresh`, `/logout` endpoints
  - Full JWT payload with `sub`, `iat`, `exp`, `iss`, `aud`
