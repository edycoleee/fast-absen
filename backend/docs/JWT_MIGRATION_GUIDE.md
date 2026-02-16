# JWT Migration Guide - Frontend

Panduan migrasi dari authentication lama ke JWT dengan Access & Refresh Token.

---

## 🔄 Perubahan Utama

| Aspek | Before (OLD) | After (NEW) |
|-------|-------------|------------|
| **Token Type** | Simple JWT | Access Token + Refresh Token |
| **Access Token Lifetime** | 30 menit | 3 jam (180 menit) |
| **Refresh Token** | ❌ Tidak ada | ✅ 14 hari (HTTP-only cookie) |
| **Storage** | localStorage only | localStorage + Cookie |
| **Auto-Refresh** | ❌ Manual | ✅ Otomatis via interceptor |
| **Security** | Basic | Enhanced (XSS protection) |

---

## 📝 Checklist Frontend Updates

### ✅ 1. Update Axios Configuration

**Before:**
```javascript
// ❌ OLD
const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1'
});
```

**After:**
```javascript
// ✅ NEW
const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  withCredentials: true  // 🔥 PENTING: untuk cookie
});
```

---

### ✅ 2. Update Login Function

**Before:**
```javascript
// ❌ OLD
async function login(username, password) {
  const { data } = await api.post('/auth/login', {
    username,
    password
  });
  
  localStorage.setItem('access_token', data.data.access_token);
  return data;
}
```

**After:**
```javascript
// ✅ NEW - Tetap sama, tapi cookie otomatis di-set
async function login(username, password) {
  const { data } = await api.post('/auth/login', {
    username,
    password
  });
  
  // Access token tetap di localStorage
  localStorage.setItem('access_token', data.data.access_token);
  
  // Refresh token otomatis di-set di cookie oleh backend
  // TIDAK PERLU manual save cookie
  
  return data;
}
```

**✅ No changes needed!** Cookie otomatis di-handle oleh browser.

---

### ✅ 3. Add Auto-Refresh Interceptor

**Before:**
```javascript
// ❌ OLD - Tidak ada auto-refresh
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Langsung logout
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**After:**
```javascript
// ✅ NEW - Auto-refresh saat 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Jika 401 dan belum pernah retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 🔥 Coba refresh token dulu
        const { data } = await axios.post(
          'http://localhost:8000/api/v1/auth/refresh',
          {},
          { withCredentials: true }  // Cookie auto-sent
        );

        // Update access token baru
        localStorage.setItem('access_token', data.data.access_token);

        // Retry request yang gagal tadi
        originalRequest.headers.Authorization = `Bearer ${data.data.access_token}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        // Refresh gagal, logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

**🎯 Benefit:** User tidak perlu login ulang selama refresh token masih valid!

---

### ✅ 4. Update Logout Function

**Before:**
```javascript
// ❌ OLD - Hanya clear localStorage
async function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}
```

**After:**
```javascript
// ✅ NEW - Panggil endpoint untuk hapus cookie
async function logout() {
  try {
    // 🔥 Call logout endpoint (hapus refresh token cookie)
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    
    // Redirect
    window.location.href = '/login';
  }
}
```

---

### ✅ 5. (Optional) Remove Manual Token Expiry Check

**Before:**
```javascript
// ❌ OLD - Manual check expiry
function isTokenExpired() {
  const token = localStorage.getItem('access_token');
  if (!token) return true;
  
  // Decode JWT
  const payload = JSON.parse(atob(token.split('.')[1]));
  const expiry = payload.exp * 1000; // Convert to milliseconds
  
  return Date.now() > expiry;
}

// Check di setiap route
if (isTokenExpired()) {
  window.location.href = '/login';
}
```

**After:**
```javascript
// ✅ NEW - Tidak perlu manual check!
// Axios interceptor sudah handle auto-refresh

// Cukup check token ada atau tidak
function isAuthenticated() {
  return !!localStorage.getItem('access_token');
}
```

---

## 🚀 Complete Example - axios.js

```javascript
// src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Enable cookies
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

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          'http://localhost:8000/api/v1/auth/refresh',
          {},
          { withCredentials: true }
        );

        localStorage.setItem('access_token', data.data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.data.access_token}`;
        
        return api(originalRequest);
      } catch (refreshError) {
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

## 🚀 Complete Example - Login Component

```javascript
// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', {
        username,
        password,
      });

      if (data.success) {
        // Save access token (localStorage)
        localStorage.setItem('access_token', data.data.access_token);
        
        // Save user info
        localStorage.setItem('user', JSON.stringify({
          user_id: data.data.user_id,
          username: data.data.username,
          roles: data.data.roles,
        }));

        // Refresh token automatic di cookie (HTTP-only)
        
        // Redirect
        navigate('/dashboard');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
          />
        </div>
        
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Login'}
        </button>
        
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
```

---

## 🚀 Complete Example - Logout Component

```javascript
// src/components/LogoutButton.jsx
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function LogoutButton() {
  const navigate = useNavigate();

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
      
      // Redirect
      navigate('/login');
    }
  };

  return (
    <button onClick={handleLogout} className="logout-btn">
      Logout
    </button>
  );
}
```

---

## 🚀 Complete Example - Protected Route

```javascript
// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  // Check authentication
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (requiredRoles.length > 0 && user) {
    const hasRole = requiredRoles.some(role => 
      user.roles?.includes(role)
    );
    
    if (!hasRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}

// Usage in routes:
// <Route path="/admin" element={
//   <ProtectedRoute requiredRoles={['admin', 'super-admin']}>
//     <AdminDashboard />
//   </ProtectedRoute>
// } />
```

---

## 🧪 Testing Migration

### 1. Test Login
```bash
# Login dan check cookie
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  -c cookies.txt \
  -v

# Lihat Set-Cookie header ada refresh_token
```

### 2. Test Refresh
```bash
# Refresh token (gunakan cookie dari login)
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -b cookies.txt \
  -v

# Should return new access_token
```

### 3. Test Logout
```bash
# Logout (hapus cookie)
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -b cookies.txt \
  -v

# Cookie akan di-cleared
```

### 4. Browser DevTools
1. Login di frontend
2. Buka DevTools → Application → Cookies
3. Check ada `refresh_token` dengan HttpOnly=true
4. Buka DevTools → Application → Local Storage
5. Check ada `access_token`

---

## ⚠️ Common Issues & Solutions

### Issue 1: Cookie tidak ter-set
**Problem:** Refresh token tidak tersimpan di cookie

**Solution:**
```javascript
// ✅ Pastikan withCredentials: true
axios.post('/auth/login', data, {
  withCredentials: true
});

// ✅ Atau di axios instance
const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  withCredentials: true
});
```

---

### Issue 2: CORS Error
**Problem:** Browser block request dengan CORS error

**Solution - Backend (settings.py):**
```python
CORS_ORIGINS = "http://localhost:3000,http://localhost:5173"
CORS_ALLOW_CREDENTIALS = True
```

**Solution - Frontend:**
```javascript
axios.defaults.withCredentials = true;
```

---

### Issue 3: Refresh loop (infinite refresh)
**Problem:** Interceptor terus refresh tanpa henti

**Solution:**
```javascript
// ✅ Gunakan flag _retry
if (error.response?.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true;  // 🔥 PENTING
  
  // ... refresh logic
}
```

---

### Issue 4: Cookie tidak dikirim saat refresh
**Problem:** Endpoint /refresh return 401 "Refresh token not found"

**Solution:**
```javascript
// ✅ Pastikan withCredentials di refresh request
await axios.post(
  '/auth/refresh',
  {},
  { withCredentials: true }  // 🔥 PENTING
);
```

---

## 📊 Token Lifecycle

```
User Login
    │
    ▼
┌──────────────────────────┐
│   Backend Response       │
│  - access_token (body)   │
│  - refresh_token (cookie)│
└────────┬─────────────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
  localStorage      HTTP-only Cookie
  access_token      refresh_token
  (3 hours)         (14 days)
         │                 │
         │                 │
         ▼                 │
    API Request            │
    with Bearer            │
    Token                  │
         │                 │
         ▼                 │
    ┌────────┐             │
    │ Valid? │             │
    └───┬────┘             │
        │                  │
   ┌────┴────┐             │
   │   YES   │   NO (401)  │
   ▼         ▼             │
Success   Auto-Refresh◄────┘
          (Interceptor)
              │
              ▼
          New Access
            Token
          (3 hours)
```

---

## ✅ Migration Checklist

Gunakan checklist ini untuk memastikan migrasi sukses:

- [ ] Update axios config dengan `withCredentials: true`
- [ ] Add auto-refresh interceptor
- [ ] Update logout untuk call `/auth/logout` endpoint
- [ ] Test login → check cookie di DevTools
- [ ] Test API request dengan access token
- [ ] Test auto-refresh saat token expired
- [ ] Test logout → check cookie terhapus
- [ ] (Optional) Remove manual token expiry check
- [ ] Update environment variables (CORS settings)
- [ ] Test di berbagai browser (Chrome, Firefox, Safari)
- [ ] Test di mobile browser
- [ ] Update documentation untuk frontend team

---

## 📚 Additional Resources

- [JWT Authentication Guide](./JWT_AUTHENTICATION.md) - Panduan lengkap
- [API Endpoints](./API_ENDPOINTS.md) - Dokumentasi API
- [MDN - HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [Axios - withCredentials](https://axios-http.com/docs/req_config)

---

## 🎉 Benefits After Migration

✅ **User Experience:**
- User tidak perlu sering login (14 hari)
- Auto-refresh seamless (tidak ada interruption)
- Logout lebih secure (cookie cleared)

✅ **Security:**
- Refresh token aman dari XSS (HTTP-only cookie)
- Access token pendek (3 jam)
- Protection dari CSRF (SameSite cookie)

✅ **Developer Experience:**
- Auto-refresh logic terpusat (1 interceptor)
- Tidak perlu manual token expiry check
- Easy to maintain

---

**Date:** 2026-02-16  
**Version:** 1.0.0
