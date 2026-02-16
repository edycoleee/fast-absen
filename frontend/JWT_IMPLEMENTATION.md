# JWT Implementation - Frontend

Implementasi JWT Authentication dengan Access & Refresh Token di React/Vite.

**Date:** 2026-02-16  
**Version:** 2.0.0

---

## 🎯 Perubahan Implementasi

### Sebelum (OLD)
- Simple JWT token (30 menit)
- Disimpan di localStorage
- Tidak ada auto-refresh
- Langsung logout saat 401

### Sesudah (NEW)
- **Access Token** (3 jam) - localStorage
- **Refresh Token** (14 hari) - HTTP-only cookie
- **Auto-refresh** saat token expired
- **Seamless UX** - user tidak perlu login ulang

---

## 📁 File yang Diupdate

### 1. ✅ `src/services/api.js`

**Perubahan:**
- Added `withCredentials: true` untuk enable cookies
- Implementasi auto-refresh interceptor di response handler
- Token otomatis di-refresh saat 401 error

**Before:**
```javascript
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Simple 401 handler - langsung logout
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**After:**
```javascript
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // 🔥 Enable cookies
});

// Auto-refresh interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Auto-refresh token
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Update token & retry request
        localStorage.setItem('access_token', data.data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.data.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Logout only if refresh failed
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
```

---

### 2. ✅ `src/data/api/client.js`

**Perubahan:** Sama seperti `services/api.js`
- Added `withCredentials: true`
- Auto-refresh interceptor
- Menggunakan `LocalStorage` helper dan `STORAGE_KEYS` constants

---

### 3. ✅ `src/services/index.js`

**Perubahan:** Update `authService.logout()` untuk call API endpoint

**Before:**
```javascript
logout: () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
}
```

**After:**
```javascript
logout: async () => {
  try {
    // Call backend to clear refresh token cookie
    await apiClient.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Always clear localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }
}
```

---

### 4. ✅ `src/data/repositories/AuthRepository.js`

**Perubahan:**
- Update `refreshToken()` - tidak perlu parameter (cookie auto-sent)
- Add `logout()` method baru
- Remove `verifyToken()` (tidak dipakai)

**Before:**
```javascript
async refreshToken(refreshToken) {
  const response = await apiClient.post('/auth/refresh', { 
    refresh_token: refreshToken 
  });
  return response.data;
}
```

**After:**
```javascript
async refreshToken() {
  // Cookie auto-sent by browser
  const response = await apiClient.post('/auth/refresh');
  return response.data;
}

async logout() {
  const response = await apiClient.post('/auth/logout');
  return response.data;
}
```

---

### 5. ✅ `src/domain/contexts/AuthContext.jsx`

**Perubahan:** Update `logout()` menjadi async dan call API

**Before:**
```javascript
const logout = () => {
  LocalStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  LocalStorage.removeItem(STORAGE_KEYS.USER);
  setUser(null);
};
```

**After:**
```javascript
const logout = async () => {
  try {
    await AuthRepository.logout();
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    LocalStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    LocalStorage.removeItem(STORAGE_KEYS.USER);
    setUser(null);
  }
};
```

---

### 6. ✅ `src/utils/AuthContext.jsx`

**Perubahan:** Update `logout()` menjadi async

---

## 🔐 Security Features

| Feature | Status | Keterangan |
|---------|--------|------------|
| **Access Token (localStorage)** | ✅ | 3 jam, pendek untuk security |
| **Refresh Token (HTTP-only cookie)** | ✅ | 14 hari, JavaScript tidak bisa akses |
| **Auto-refresh** | ✅ | Seamless UX, no re-login needed |
| **XSS Protection** | ✅ | Refresh token safe from XSS |
| **CSRF Protection** | ✅ | SameSite cookie |
| **Retry Logic** | ✅ | `_retry` flag prevent infinite loop |

---

## 🚀 Cara Kerja Auto-Refresh

```
1. User Login
   ↓
2. Simpan access_token di localStorage
   Refresh token otomatis di cookie (HTTP-only)
   ↓
3. API Request dengan access_token
   ↓
4. Server return 401 (token expired)
   ↓
5. Interceptor detect 401
   ↓
6. Auto-call /auth/refresh
   Cookie refresh_token auto-sent
   ↓
7. Get new access_token
   Update localStorage
   ↓
8. Retry original request
   ↓
9. Success! ✅
```

---

## 🧪 Testing

### 1. Login Test
```bash
# Buka DevTools → Network → Login
# Check response:
# - Body: access_token
# - Cookies: refresh_token (HttpOnly)
```

### 2. Auto-Refresh Test
```bash
# Cara 1: Manual expire token
# 1. Login
# 2. Edit localStorage access_token (hapus beberapa karakter)
# 3. Klik menu lain (API call)
# Expected: Auto-refresh, tidak redirect ke login

# Cara 2: Wait 3 hours
# 1. Login
# 2. Tunggu 3 jam
# 3. Klik menu (API call)
# Expected: Auto-refresh seamlessly
```

### 3. Logout Test
```bash
# 1. Login
# 2. Check cookie ada refresh_token
# 3. Klik Logout
# 4. Check cookie: refresh_token terhapus
# 5. Check localStorage: kosong
```

---

## ✅ Verification Checklist

- [x] `withCredentials: true` di axios config
- [x] Auto-refresh interceptor implemented
- [x] `_retry` flag untuk prevent infinite loop
- [x] Logout call `/auth/logout` endpoint
- [x] Cookie refresh_token ter-set saat login
- [x] Cookie refresh_token terhapus saat logout
- [x] Auto-refresh work saat 401
- [x] No breaking changes (backward compatible)

---

## 📊 Benefits

### User Experience
- ✅ Login sekali, valid 14 hari
- ✅ Tidak perlu login ulang saat access token expired
- ✅ Seamless navigation (no interruption)

### Security
- ✅ Refresh token safe dari XSS (HTTP-only cookie)
- ✅ Access token pendek (3 jam)
- ✅ CSRF protection (SameSite cookie)
- ✅ Auto-logout saat refresh failed

### Developer Experience
- ✅ Auto-refresh logic terpusat (1 interceptor)
- ✅ No manual token expiry check
- ✅ Easy to maintain

---

## 🐛 Troubleshooting

### Issue 1: Cookie tidak ter-set
**Symptom:** Refresh token tidak ada di DevTools → Cookies

**Solution:**
```javascript
// Check axios config
axios.create({
  withCredentials: true  // ✅ Must be true
});
```

---

### Issue 2: CORS Error
**Symptom:** Browser block request dengan CORS policy error

**Solution:**
- Backend sudah set `CORS_ALLOW_CREDENTIALS = True`
- Frontend sudah set `withCredentials: true`
- Check URL sama (localhost vs 127.0.0.1 vs IP)

---

### Issue 3: Infinite Refresh Loop
**Symptom:** Network tab terus refresh

**Solution:**
```javascript
// ✅ Must have _retry flag
if (error.response?.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true;  // Prevent infinite loop
  // ...
}
```

---

### Issue 4: Logout tidak hapus cookie
**Symptom:** Setelah logout, refresh_token masih ada

**Check:**
1. Endpoint `/auth/logout` dipanggil? (Network tab)
2. Response 200 OK?
3. Backend path cookie sama? (`/api/v1/auth`)

---

## 📚 Related Documentation

- Backend: `/backend/docs/JWT_AUTHENTICATION.md` - Complete JWT guide
- Backend: `/backend/docs/JWT_QUICK_REFERENCE.md` - Quick reference
- Backend: `/backend/docs/API_ENDPOINTS.md` - API documentation

---

## 🔄 Rollback Plan

Jika ada masalah, rollback dengan:

```bash
git checkout <previous-commit>
```

Atau manual revert:
1. Remove `withCredentials: true` dari axios config
2. Restore old response interceptor (simple 401 → logout)
3. Restore old logout (no API call)

---

## 📝 Changelog

### v2.0.0 - 2026-02-16
- ✅ Added JWT with Access & Refresh Token
- ✅ Implemented auto-refresh interceptor
- ✅ Updated logout to call API endpoint
- ✅ Added `withCredentials: true` to axios
- ✅ No breaking changes for existing code

---

**Implemented by:** GitHub Copilot  
**Date:** 2026-02-16
