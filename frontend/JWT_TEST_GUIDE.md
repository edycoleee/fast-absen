# JWT Frontend - Quick Test Guide

Panduan cepat testing JWT implementation di frontend.

---

## 🧪 Test 1: Login & Cookie Check

### Steps:
1. Buka browser DevTools (F12)
2. Buka tab **Application** → **Cookies**
3. Login ke aplikasi
4. Check ada cookie `refresh_token` dengan properties:
   - ✅ HttpOnly: `true`
   - ✅ Secure: `true` (production) / `false` (development)
   - ✅ SameSite: `Lax`
   - ✅ Path: `/api/v1/auth`
   - ✅ Expires: ~14 hari dari sekarang

### Expected Result:
```
Name: refresh_token
Value: eyJhbGc... (JWT token)
Domain: localhost (atau IP server)
Path: /api/v1/auth
Expires: <14 days from now>
HttpOnly: ✓
Secure: ✓ (production only)
SameSite: Lax
```

---

## 🧪 Test 2: Auto-Refresh (Manual)

### Steps:
1. Login successfully
2. Buka **DevTools** → **Application** → **Local Storage**
3. Copy nilai `access_token`
4. Paste ke [jwt.io](https://jwt.io) untuk decode
5. Check `exp` (expiration timestamp)
6. Edit `access_token` di localStorage (hapus beberapa karakter terakhir)
7. Navigate ke halaman lain (trigger API call)
8. Check **Network** tab → ada request ke `/auth/refresh`
9. Check localStorage → `access_token` ter-update dengan nilai baru

### Expected Result:
- ✅ Request `/auth/refresh` otomatis dipanggil
- ✅ Response 200 OK dengan access_token baru
- ✅ localStorage ter-update
- ✅ Original request di-retry dan sukses
- ✅ Tidak ada redirect ke login

---

## 🧪 Test 3: Auto-Refresh (Real Expiry)

### Option A: Wait 3 Hours (Natural)
1. Login
2. Tunggu 3 jam
3. Klik menu / API request
4. Check auto-refresh works

### Option B: Modify Backend (Fast Test)
**Temporary change backend for testing:**

```python
# backend/config/settings.py
# Change temporarily for testing
ACCESS_TOKEN_EXPIRE_MINUTES: int = 1  # 1 minute instead of 180
```

**Steps:**
1. Restart backend dengan config di atas
2. Login di frontend
3. Tunggu 1 menit
4. Klik menu / API request
5. Check auto-refresh works

**⚠️ IMPORTANT:** Revert config ke 180 setelah testing!

---

## 🧪 Test 4: Logout & Cookie Clear

### Steps:
1. Login successfully
2. Check cookie `refresh_token` ada
3. Klik **Logout**
4. Check **Network** tab:
   - Ada request `POST /auth/logout`
   - Response 200 OK
5. Check **Application** → **Cookies**:
   - Cookie `refresh_token` hilang / expired
6. Check **Local Storage**:
   - `access_token` hilang
   - `user` hilang

### Expected Result:
- ✅ `/auth/logout` endpoint dipanggil
- ✅ Cookie `refresh_token` terhapus
- ✅ localStorage cleared
- ✅ Redirect ke `/login`

---

## 🧪 Test 5: Refresh Failed → Logout

### Steps:
1. Login successfully
2. Check cookie `refresh_token` ada
3. **Manual delete cookie** `refresh_token` dari DevTools
4. Wait 3 hours (or modify access token to invalid)
5. Klik menu / API request
6. Check auto-refresh attempt failed
7. Check redirect ke `/login`

### Expected Result:
- ✅ Request `/auth/refresh` dipanggil
- ✅ Response 401 Unauthorized (cookie not found)
- ✅ localStorage cleared
- ✅ Redirect ke `/login`
- ✅ No infinite loop

---

## 🧪 Test 6: Multiple Tabs/Windows

### Steps:
1. Login di tab 1
2. Buka tab 2 (same app)
3. Tab 2 check localStorage → ada `access_token`
4. Navigate di tab 2 → works
5. Logout di tab 1
6. Refresh tab 2
7. Tab 2 redirect ke `/login`

### Expected Result:
- ✅ Both tabs share localStorage
- ✅ Cookie shared across tabs
- ✅ Logout di 1 tab affect all tabs

---

## 🧪 Test 7: JWT Payload Verification

### Steps:
1. Login successfully
2. Copy `access_token` dari localStorage
3. Paste ke [jwt.io](https://jwt.io)
4. Verify payload:

```json
{
  "sub": "1",
  "username": "admin",
  "roles": ["super-admin"],
  "iat": 1771172251,
  "exp": 1771174051,
  "iss": "auth-server",
  "aud": "internal-apps"
}
```

### Expected Result:
- ✅ `sub`: user_id as string
- ✅ `username`: correct username
- ✅ `roles`: array of roles
- ✅ `iat`: issued at timestamp
- ✅ `exp`: expiration (iat + 3 hours)
- ✅ `iss`: "auth-server"
- ✅ `aud`: "internal-apps"

---

## 🧪 Test 8: Network Request Headers

### Steps:
1. Login
2. Navigate to any page with API calls
3. Open **DevTools** → **Network**
4. Click any API request (not `/auth/login`)
5. Check **Request Headers**:

```
Authorization: Bearer eyJhbGc...
Cookie: refresh_token=eyJhbGc...
```

### Expected Result:
- ✅ Every API request has `Authorization: Bearer <token>`
- ✅ Requests to `/auth/*` include cookie

---

## 🧪 Test 9: CORS & Credentials

### Steps:
1. Check browser console
2. Login
3. No CORS errors

### Common CORS Errors:
```
❌ Access to fetch at 'http://...' from origin 'http://...' has been blocked by CORS policy
❌ The value of the 'Access-Control-Allow-Credentials' header is '' which must be 'true'
```

### If CORS error:
**Backend check:**
```python
# backend/config/settings.py
CORS_ORIGINS = "http://localhost:5173,http://localhost:3000"
CORS_ALLOW_CREDENTIALS = True
```

**Frontend check:**
```javascript
// axios config
axios.create({
  withCredentials: true  // Must be true
});
```

---

## ✅ Test Summary Checklist

Quick checklist untuk verify semua works:

- [ ] Login successful
- [ ] Cookie `refresh_token` ter-set (HttpOnly)
- [ ] localStorage `access_token` tersimpan
- [ ] API requests include Authorization header
- [ ] Auto-refresh works (saat token expired)
- [ ] Logout clears cookie & localStorage
- [ ] Logout calls `/auth/logout` endpoint
- [ ] No CORS errors
- [ ] No infinite refresh loop
- [ ] JWT payload correct (sub, iat, exp, iss, aud)

---

## 🐛 Common Issues

### Issue: Cookie tidak ter-set
**Check:**
- [ ] `withCredentials: true` di axios config
- [ ] Backend CORS: `CORS_ALLOW_CREDENTIALS = True`
- [ ] URL sama (tidak mix localhost & IP)

### Issue: Auto-refresh tidak jalan
**Check:**
- [ ] Interceptor response handler ada
- [ ] `_retry` flag implemented
- [ ] `/auth/refresh` endpoint accessible

### Issue: Infinite loop
**Check:**
- [ ] `_retry` flag prevents multiple retry
- [ ] Logout on refresh error

---

## 📊 Success Metrics

Setelah semua test pass:
- ✅ User experience smooth (no re-login every 30 min)
- ✅ Security enhanced (HTTP-only cookie)
- ✅ No breaking changes (backward compatible)
- ✅ Auto-refresh transparent to user

---

**Testing Completed:** _____________  
**Tester:** _____________  
**Result:** PASS ☐ / FAIL ☐  
**Notes:** _____________________________________________
