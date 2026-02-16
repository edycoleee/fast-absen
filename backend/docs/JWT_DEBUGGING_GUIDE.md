# JWT Authentication Debugging Guide

**Dokumen:** Panduan Debugging JWT Authentication  
**Tanggal:** 16 Februari 2026  
**Status:** ✅ Resolved

---

## 📋 Executive Summary

Sistem mengalami masalah autentikasi JWT dimana frontend berhasil login tetapi semua request ke protected endpoints menghasilkan error 401 Unauthorized. Setelah debugging, ditemukan 4 masalah utama yang telah diperbaiki.

---

## 🔍 Gejala Masalah

### Frontend Error Logs
```javascript
:8000/api/v1/stats/:1  Failed to load resource: the server responded with a status of 401 (Unauthorized)
:8000/api/v1/users/:1  Failed to load resource: the server responded with a status of 401 (Unauthorized)
:8000/api/v1/roles/:1  Failed to load resource: the server responded with a status of 401 (Unauthorized)
:8000/api/v1/permissions/:1  Failed to load resource: the server responded with a status of 401 (Unauthorized)

Dashboard.jsx:23 Failed to load stats: AxiosError: Request failed with status code 401
useUsers.js:44 Error fetching users: AxiosError: Request failed with status code 401
```

### Backend Error Logs
```log
2026-02-16 07:20:29 - WARNING - [exception_handlers.py:27] - HTTP Exception: 401 - Invalid authentication credentials Path: /api/v1/permissions/
2026-02-16 07:20:29 - INFO - Response: GET /api/v1/permissions/ Status: 401 Time: 0.003s
```

### Observasi
- ✅ Login berhasil (status 200)
- ✅ Access token diterima oleh frontend
- ✅ Refresh token berhasil (status 200)
- ❌ Semua protected endpoints mengembalikan 401
- ❌ Token refresh tidak memperbaiki masalah

---

## 🐛 Root Cause Analysis

### Masalah 1: JWT Payload Mismatch (PRIMARY ISSUE)

**Lokasi:** `backend/utils/dependencies.py` line 62

**Masalah:**
```python
# ❌ SALAH - Membaca key yang tidak ada
user_id: int = payload.get("user_id")
```

**Penjelasan:**
- JWT token dibuat dengan claim `"sub"` (standard JWT untuk user identifier)
- Tetapi saat decode, code mencoba membaca `"user_id"` 
- Hasil: `user_id = None` → memicu error 401

**Token Payload Sebenarnya:**
```json
{
  "sub": "1",              // ← User ID ada di sini
  "username": "admin",
  "roles": ["super-admin"],
  "iat": 1771176749,
  "exp": 1771187549,
  "iss": "auth-server",
  "aud": "internal-apps"
}
```

**Solusi:**
```python
# ✅ BENAR - Membaca dari "sub" claim (JWT standard)
user_id_str = payload.get("sub")
if user_id_str is None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token payload",
        headers={"WWW-Authenticate": "Bearer"},
    )

try:
    user_id = int(user_id_str)
except (ValueError, TypeError):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid user ID in token",
        headers={"WWW-Authenticate": "Bearer"},
    )
```

---

### Masalah 2: Timezone Issue dengan datetime.utcnow()

**Lokasi:** `backend/utils/auth.py` line 47

**Masalah:**
```python
# ❌ SALAH - Tidak timezone-aware
now = datetime.utcnow()
```

**Penjelasan:**
- System time: `Mon 16 Feb 07:36 WIB 2026` (UTC+7)
- `datetime.utcnow()` mengembalikan waktu lokal tanpa timezone info
- Token `iat` (issued at) timestamp salah karena timezone offset
- JWT library menganggap token sudah expired

**Debug Output:**
```log
[DEBUG CREATE] Payload: iat=1771177027, exp=1771187827, diff=180min
[DEBUG DECODE] Current UTC timestamp: 1771202227
# ↑ Selisih 7 jam (25200 detik) = UTC+7 timezone issue
```

**Solusi:**
```python
# ✅ BENAR - Timezone-aware UTC datetime
from datetime import datetime, timedelta, timezone

now = datetime.now(timezone.utc)
```

---

### Masalah 3: Inconsistent SECRET_KEY

**Lokasi:** `backend/.env` dan `backend/config/settings.py`

**Masalah:**
- `.env` file: `SECRET_KEY=your-secret-key-here-change-in-production`
- `settings.py` default: `SECRET_KEY=your-secret-key-change-in-production`
- Server reload kadang menggunakan yang berbeda → signature verification failed

**Debug Output:**
```log
[DEBUG] JWT decode error: JWTError: Signature verification failed.
```

**Solusi:**
```bash
# Generate secure random key
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Update .env
SECRET_KEY=WfWzwN-1b_XnBeYIzmvqYUxlYw2nauegoT9xek4PTdg
```

---

### Masalah 4: Short Token Expiration

**Lokasi:** `backend/.env`

**Masalah:**
```env
# ❌ Terlalu pendek - hanya 30 menit
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**Solusi:**
```env
# ✅ Sesuai best practice - 3 jam
ACCESS_TOKEN_EXPIRE_MINUTES=180
```

---

## 🔧 Proses Debugging

### Step 1: Verifikasi Token Diterima Frontend
```javascript
// Check localStorage
localStorage.getItem('access_token')
// ✅ Token ada
```

### Step 2: Test Backend dengan cURL
```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Extract token dan test protected endpoint
TOKEN="eyJhbGciOiJIUzI1N..."
curl -X GET http://localhost:8000/api/v1/stats/ \
  -H "Authorization: Bearer $TOKEN"
# ❌ 401 Unauthorized
```

### Step 3: Add Debug Logging
```python
# Di utils/auth.py - decode_access_token()
logger.warning(f"[DEBUG] Token payload: {payload}")

# Di utils/dependencies.py - get_current_user()
logger.warning(f"[DEBUG] user_id from payload: {payload.get('user_id')}")
logger.warning(f"[DEBUG] sub from payload: {payload.get('sub')}")
```

**Output:**
```log
[DEBUG] Token payload: {'sub': '1', 'username': 'admin', ...}
[DEBUG] user_id from payload: None  # ← AHA! Ini masalahnya
[DEBUG] sub from payload: 1
```

### Step 4: Check JWT Creation vs Decode
```python
# Creating token
import hashlib
key_hash = hashlib.md5(settings.SECRET_KEY.encode()).hexdigest()
logger.warning(f"[CREATE] SECRET_KEY hash={key_hash}")

# Decoding token
key_hash = hashlib.md5(settings.SECRET_KEY.encode()).hexdigest()
logger.warning(f"[DECODE] SECRET_KEY hash={key_hash}")
```

**Output:**
```log
[CREATE] SECRET_KEY hash=9dcd7b2e4667eda0fac38a10e681d65c
[DECODE] SECRET_KEY hash=9dcd7b2e4667eda0fac38a10e681d65c
# ✅ Match - bukan masalah SECRET_KEY
```

### Step 5: Disable Expiration Check (Temporary)
```python
# Test jika masalahnya exp verification
payload = jwt.decode(
    token, 
    settings.SECRET_KEY, 
    algorithms=[settings.ALGORITHM],
    audience=settings.JWT_AUDIENCE,
    issuer=settings.JWT_ISSUER,
    options={"verify_exp": False}  # Disable sementara
)
# ✅ SUCCESS - berarti ada masalah timezone
```

### Step 6: Check Timestamp Values
```python
import time
logger.warning(f"[DEBUG] Current UTC: {int(time.time())}")
logger.warning(f"[DEBUG] Token iat: {payload['iat']}, exp: {payload['exp']}")
```

**Output:**
```log
[DEBUG] Current UTC: 1771202227
[DEBUG] Token iat: 1771177027, exp: 1771187827
# Difference: 25200 seconds = 7 hours = WIB timezone offset
```

---

## ✅ Solusi yang Diterapkan

### File 1: `backend/utils/dependencies.py`

```python
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # ✅ FIX: Baca dari "sub" claim (JWT standard)
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # ... rest of the function
```

### File 2: `backend/utils/auth.py`

```python
from datetime import datetime, timedelta, timezone  # ✅ Import timezone

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    
    # ✅ FIX: Gunakan timezone-aware UTC datetime
    now = datetime.now(timezone.utc)
    
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload = {
        "sub": str(data.get("user_id")),  # Standard JWT claim
        "username": data.get("username"),
        "roles": data.get("roles", []),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE
    }
    
    encoded_jwt = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(user_id: int) -> str:
    # ✅ FIX: Timezone-aware UTC datetime
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    }
    
    encoded_jwt = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
```

### File 3: `backend/.env`

```env
# ✅ FIX: Secure SECRET_KEY yang konsisten
SECRET_KEY=WfWzwN-1b_XnBeYIzmvqYUxlYw2nauegoT9xek4PTdg

# ✅ FIX: Token expiration sesuai best practice
ACCESS_TOKEN_EXPIRE_MINUTES=180  # 3 hours
REFRESH_TOKEN_EXPIRE_DAYS=14      # 14 days
```

---

## 🧪 Testing & Verification

### Test 1: Backend cURL Test
```bash
# Login dan dapatkan token
LOGIN_RESP=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# Test protected endpoint
curl -X GET http://localhost:8000/api/v1/stats/ \
  -H "Authorization: Bearer $TOKEN"

# ✅ Expected: {"success":true,"message":"Stats retrieved successfully",...}
```

### Test 2: Multiple Endpoints Test
```bash
# Test users endpoint
curl -X GET "http://localhost:8000/api/v1/users/?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
# ✅ Status 200

# Test roles endpoint
curl -X GET "http://localhost:8000/api/v1/roles/?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
# ✅ Status 200

# Test permissions endpoint
curl -X GET "http://localhost:8000/api/v1/permissions/?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
# ✅ Status 200
```

### Test 3: Frontend Test
```javascript
// 1. Clear localStorage
localStorage.clear()

// 2. Login kembali
// Username: admin
// Password: admin123

// 3. Check console - tidak boleh ada 401 errors
// ✅ Semua request berhasil
```

### Verification Logs
```log
2026-02-16 07:37:07 - INFO - Request: POST /api/v1/auth/login from 127.0.0.1
2026-02-16 07:37:07 - INFO - Response: POST /api/v1/auth/login Status: 200 Time: 0.378s

2026-02-16 07:37:07 - INFO - Request: GET /api/v1/stats/ from 127.0.0.1
2026-02-16 07:37:07 - INFO - Response: GET /api/v1/stats/ Status: 200 Time: 0.024s
# ✅ SUCCESS - Status 200, bukan 401 lagi
```

---

## 📚 Lessons Learned

### 1. JWT Standard Claims
- Selalu gunakan standard claims: `sub`, `iat`, `exp`, `iss`, `aud`
- `sub` (subject) adalah standard untuk user identifier
- Jangan buat custom claims seperti `user_id` untuk data standard

### 2. Timezone Awareness
- **JANGAN** gunakan `datetime.utcnow()` - deprecated dan tidak timezone-aware
- **GUNAKAN** `datetime.now(timezone.utc)` untuk UTC yang benar
- Penting di sistem dengan server di timezone non-UTC (WIB, etc)

### 3. Secret Management
- SECRET_KEY harus konsisten di semua environment
- Generate dengan crypto-secure random: `secrets.token_urlsafe(32)`
- Store di `.env`, jangan di code
- Rotate secara periodik di production

### 4. Token Expiration Strategy
- Access Token: 2-4 jam (kita pakai 3 jam)
- Refresh Token: 7-30 hari (kita pakai 14 hari)
- Balance antara security dan user experience

### 5. Debugging Techniques
- Tambah temporary logging untuk inspect token payload
- Check MD5 hash untuk verify SECRET_KEY consistency
- Disable individual verificat ions (exp, aud, iss) untuk isolate masalah
- Compare timestamp values untuk detect timezone issues

---

## 🔐 Security Best Practices

### 1. Token Storage
```javascript
// ✅ GOOD - Access token di localStorage
localStorage.setItem('access_token', token)

// ✅ GOOD - Refresh token di HTTP-only cookie
Set-Cookie: refresh_token=xxx; HttpOnly; Secure; SameSite=Lax
```

### 2. Token Verification
```python
# ✅ Verify semua JWT claims
payload = jwt.decode(
    token,
    settings.SECRET_KEY,
    algorithms=[settings.ALGORITHM],
    audience=settings.JWT_AUDIENCE,  # Verify audience
    issuer=settings.JWT_ISSUER        # Verify issuer
)
```

### 3. Error Messages
```python
# ✅ Generic error message - jangan expose detail
raise HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid authentication credentials",  # Generic
    headers={"WWW-Authenticate": "Bearer"},
)

# ❌ JANGAN expose detail ke client
# detail="Token expired at 2026-02-16 07:30:00"  # ← Information leakage
```

---

## 📖 References

- [RFC 7519 - JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Python Jose Documentation](https://python-jose.readthedocs.io/)

---

## 🆘 Troubleshooting Guide

### Jika masih dapat 401 setelah fix:

1. **Restart server completely**
   ```bash
   # Kill all uvicorn processes
   pkill -f "uvicorn main:app"
   
   # Start fresh
   cd /home/sultan/fast-absen/backend
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Clear frontend cache**
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   // Hard refresh: Ctrl+Shift+R
   ```

3. **Verify .env loaded**
   ```python
   # Add to main.py startup
   from config.settings import settings
   print(f"SECRET_KEY length: {len(settings.SECRET_KEY)}")
   print(f"ACCESS_TOKEN_EXPIRE: {settings.ACCESS_TOKEN_EXPIRE_MINUTES}")
   ```

4. **Check system time**
   ```bash
   date -u  # Should show correct UTC time
   # If wrong, sync: sudo ntpdate -s time.nist.gov
   ```

---

**Document Version:** 1.0  
**Last Updated:** 16 February 2026  
**Author:** System Administrator
