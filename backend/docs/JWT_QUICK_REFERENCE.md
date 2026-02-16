# JWT Quick Reference

Referensi cepat untuk JWT Authentication di RSUD Sulfat Attendance System.

---

## 🎯 Token Summary

| Token | Lifetime | Storage | Usage |
|-------|----------|---------|-------|
| **Access Token** | 3 jam | localStorage | API requests (Authorization header) |
| **Refresh Token** | 14 hari | HTTP-only Cookie | Refresh access token only |

---

## 📡 API Endpoints

```
POST   /api/v1/auth/login      - Login & get tokens
POST   /api/v1/auth/refresh    - Refresh access token
POST   /api/v1/auth/logout     - Logout & clear cookie
```

---

## 💻 Frontend Code Snippets

### Setup Axios
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  withCredentials: true  // Enable cookies
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const { data } = await axios.post('/auth/refresh', {}, { withCredentials: true });
      localStorage.setItem('access_token', data.data.access_token);
      error.config.headers.Authorization = `Bearer ${data.data.access_token}`;
      return api(error.config);
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

### Login
```javascript
const { data } = await api.post('/auth/login', {
  username: 'admin',
  password: 'admin123'
});

localStorage.setItem('access_token', data.data.access_token);
localStorage.setItem('user', JSON.stringify(data.data));
```

---

### Logout
```javascript
await api.post('/auth/logout');
localStorage.removeItem('access_token');
localStorage.removeItem('user');
window.location.href = '/login';
```

---

### Protected Route
```javascript
function ProtectedRoute({ children, requiredRoles = [] }) {
  const token = localStorage.getItem('access_token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token) return <Navigate to="/login" />;
  
  if (requiredRoles.length > 0) {
    const hasRole = requiredRoles.some(r => user.roles?.includes(r));
    if (!hasRole) return <Navigate to="/unauthorized" />;
  }
  
  return children;
}
```

---

## 🔑 JWT Payload

### Access Token
```json
{
  "sub": "user_id",
  "username": "admin",
  "roles": ["user", "admin"],
  "iat": 1739350000,
  "exp": 1739360800,
  "iss": "auth-server",
  "aud": "internal-apps"
}
```

### Refresh Token
```json
{
  "sub": "user_id",
  "type": "refresh",
  "iat": 1739350000,
  "exp": 1739954800
}
```

---

## 🔧 Backend Configuration

```python
# config/settings.py
SECRET_KEY: str = "your-secret-key-change-in-production"
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = 180  # 3 hours
REFRESH_TOKEN_EXPIRE_DAYS: int = 14     # 14 days
JWT_ISSUER: str = "auth-server"
JWT_AUDIENCE: str = "internal-apps"

CORS_ORIGINS = "http://localhost:3000,http://localhost:5173"
CORS_ALLOW_CREDENTIALS = True
```

---

## 🧪 Testing with cURL

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt

# Refresh
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -b cookies.txt

# Logout
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -b cookies.txt

# API Request with token
curl -X GET http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer <access_token>"
```

---

## ⚠️ Important Notes

### Must-Have in Frontend
- ✅ `withCredentials: true` in axios config
- ✅ Auto-refresh interceptor for seamless UX
- ✅ Call `/auth/logout` before clearing localStorage

### Security
- ✅ Never store refresh token in localStorage
- ✅ Always use HTTPS in production
- ✅ Don't expose SECRET_KEY
- ✅ Validate CORS_ORIGINS

### Cookie Configuration
- ✅ `HttpOnly=true` - JavaScript tidak bisa akses
- ✅ `Secure=true` - Hanya via HTTPS (production)
- ✅ `SameSite=Lax` - CSRF protection
- ✅ `Path=/api/v1/auth` - Hanya dikirim ke auth endpoints

---

## 🔄 Token Flow

```
1. User Login
   ↓
2. Backend Return:
   - access_token (response body) → localStorage
   - refresh_token (HTTP-only cookie) → browser auto-save
   ↓
3. API Request
   - Header: Authorization: Bearer <access_token>
   ↓
4. If 401 Unauthorized
   ↓
5. Auto-refresh (interceptor)
   - POST /auth/refresh (cookie auto-sent)
   ↓
6. Get new access_token
   - Update localStorage
   - Retry original request
   ↓
7. Success!
```

---

## 📚 Full Documentation

- [JWT Authentication Guide](./JWT_AUTHENTICATION.md) - Complete guide
- [JWT Migration Guide](./JWT_MIGRATION_GUIDE.md) - Frontend migration
- [API Endpoints](./API_ENDPOINTS.md) - All API details

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Cookie tidak ter-set | Add `withCredentials: true` |
| CORS error | Check `CORS_ALLOW_CREDENTIALS` & `CORS_ORIGINS` |
| 401 loop | Add `_retry` flag in interceptor |
| Refresh 401 | Check cookie exists & `withCredentials: true` |

---

**Last Updated:** 2026-02-16  
**Backend Version:** 2.0.0
