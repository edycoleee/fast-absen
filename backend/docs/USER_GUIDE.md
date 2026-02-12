# Panduan User/Pegawai - Sistem Absensi RSUD Sulfat

Panduan lengkap untuk pegawai dalam menggunakan sistem absensi.

**API Documentation**: http://192.168.171.15:8000/docs

---

## 📋 Daftar Isi

1. [Login User](#1-login-user)
2. [Melakukan Absensi](#2-melakukan-absensi)
3. [Melihat Riwayat Absensi](#3-melihat-riwayat-absensi)
4. [Login Device (Mobile App)](#4-login-device-mobile-app)
5. [FAQ](#5-faq)

---

## 1. Login User

### Langkah 1: Akses API Documentation

Buka browser dan akses: **http://192.168.171.15:8000/docs**

### Langkah 2: Login dengan Akun Pegawai

1. Scroll ke section **Authentication**
2. Klik endpoint **POST /api/v1/auth/login**
3. Klik tombol **"Try it out"**
4. Masukkan kredensial Anda:

```json
{
  "username": "username_anda",
  "password": "password_anda"
}
```

**Contoh:**
```json
{
  "username": "johndoe",
  "password": "pegawai123"
}
```

5. Klik **"Execute"**
6. **Copy** `access_token` dari response

**Response berhasil:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user_id": 2,
    "username": "johndoe",
    "roles": ["user"]
  }
}
```

### Langkah 3: Authorize Swagger UI

1. Klik tombol **"Authorize"** (ikon gembok 🔒) di pojok kanan atas
2. Di kolom "Value", paste token yang sudah di-copy
3. Klik **"Authorize"**
4. Klik **"Close"**

**✅ Anda sekarang sudah login!**

**📌 Catatan:**
- Token berlaku selama **30 menit**
- Setelah 30 menit, harus login ulang
- Jangan share token Anda ke orang lain

---

## 2. Melakukan Absensi

### 2.1 Absensi Harian

**Endpoint**: `POST /api/v1/absensi/create`

1. Scroll ke section **Absensi**
2. Klik **POST /api/v1/absensi/create**
3. Klik **"Try it out"**
4. Isi data absensi:

```json
{
  "id_lokasi": "LOK001",
  "uid": "DEVICE123",
  "keterangan": "Hadir tepat waktu"
}
```

**Penjelasan Field:**
- `id_lokasi`: Kode lokasi kerja (contoh: "LOK001" untuk Ruang IGD)
- `uid`: ID device/kartu RFID Anda
- `keterangan`: Keterangan tambahan (opsional)

5. Klik **"Execute"**

**Response Berhasil:**
```json
{
  "success": true,
  "message": "Absensi created successfully",
  "data": {
    "id": 1,
    "id_pegawai": "P001",
    "id_lokasi": "LOK001",
    "uid": "DEVICE123",
    "tanggal": "2026-02-12T08:30:00",
    "keterangan": "Hadir tepat waktu",
    "ip_address": "192.168.1.100"
  }
}
```

**📌 Otomatis Tercatat:**
- ✅ ID Pegawai Anda (dari token login)
- ✅ Tanggal & waktu absensi (waktu server)
- ✅ IP Address device Anda (untuk keamanan)

### 2.2 Contoh Keterangan Absensi

**Hadir Normal:**
```json
{
  "id_lokasi": "LOK001",
  "uid": "DEVICE123",
  "keterangan": "Hadir tepat waktu"
}
```

**Izin Terlambat:**
```json
{
  "id_lokasi": "LOK001",
  "uid": "DEVICE123",
  "keterangan": "Terlambat 15 menit - macet di jalan"
}
```

**Shift Malam:**
```json
{
  "id_lokasi": "LOK002",
  "uid": "DEVICE123",
  "keterangan": "Shift malam - Ruang ICU"
}
```

---

## 3. Melihat Riwayat Absensi

### 3.1 Lihat Semua Absensi Saya

**Endpoint**: `GET /api/v1/absensi/me`

1. Scroll ke section **Absensi**
2. Klik **GET /api/v1/absensi/me**
3. Klik **"Try it out"**
4. Set pagination (opsional):
   - `skip`: 0 (mulai dari record pertama)
   - `limit`: 100 (maksimal 100 record)
5. Klik **"Execute"**

**Response:**
```json
{
  "success": true,
  "message": "Your absensi retrieved successfully",
  "data": [
    {
      "id": 1,
      "id_pegawai": "P001",
      "id_lokasi": "LOK001",
      "uid": "DEVICE123",
      "tanggal": "2026-02-12T08:30:00",
      "keterangan": "Hadir tepat waktu",
      "ip_address": "192.168.1.100"
    },
    {
      "id": 2,
      "id_pegawai": "P001",
      "id_lokasi": "LOK001",
      "uid": "DEVICE123",
      "tanggal": "2026-02-11T08:25:00",
      "keterangan": "Hadir",
      "ip_address": "192.168.1.100"
    }
  ]
}
```

**📌 Catatan:**
- Anda hanya bisa melihat absensi **ANDA SENDIRI**
- Data diurutkan dari yang terbaru
- Gunakan `skip` dan `limit` untuk pagination

### 3.2 Lihat Detail Absensi Tertentu

**Endpoint**: `GET /api/v1/absensi/me/{id}`

1. Klik **GET /api/v1/absensi/me/{id}**
2. Klik **"Try it out"**
3. Masukkan **ID absensi** yang ingin dilihat
4. Klik **"Execute"**

**Contoh dengan ID = 1:**

**Response:**
```json
{
  "success": true,
  "message": "Your absensi retrieved successfully",
  "data": {
    "id": 1,
    "id_pegawai": "P001",
    "id_lokasi": "LOK001",
    "uid": "DEVICE123",
    "tanggal": "2026-02-12T08:30:00",
    "keterangan": "Hadir tepat waktu",
    "ip_address": "192.168.1.100"
  }
}
```

**❌ Error jika akses absensi orang lain:**
```json
{
  "success": false,
  "message": "Absensi with id 999 not found for your account"
}
```

---

## 4. Login Device (Mobile App)

### 4.1 Catat Device Login

**Endpoint**: `POST /api/v1/login-absensi/`

Endpoint ini digunakan untuk mencatat device yang Anda gunakan (untuk mobile app).

1. Scroll ke section **Login Absensi**
2. Klik **POST /api/v1/login-absensi/**
3. Klik **"Try it out"**
4. Isi data device:

```json
{
  "uid": "DEVICE123ABC",
  "player_id": "PLAYER456XYZ",
  "model": "Samsung Galaxy A52"
}
```

**Penjelasan Field:**
- `uid`: Unique ID device Anda
- `player_id`: Player ID untuk push notification (dari OneSignal/FCM)
- `model`: Model/merek HP Anda

5. Klik **"Execute"**

**Response:**
```json
{
  "success": true,
  "message": "Login absensi created successfully",
  "data": {
    "id": 1,
    "id_pegawai": "P001",
    "uid": "DEVICE123ABC",
    "player_id": "PLAYER456XYZ",
    "model": "Samsung Galaxy A52",
    "created_at": "2026-02-12T08:00:00"
  }
}
```

**📌 Catatan:**
- Device login tercatat otomatis dengan ID pegawai Anda
- Bisa login dari multiple device (HP pribadi, tablet, dll)
- Admin dapat melihat device apa saja yang Anda gunakan

---

## 5. FAQ

### ❓ Bagaimana cara mendapatkan username dan password?

**Jawab**: Username dan password diberikan oleh **Admin/HRD**. Hubungi admin untuk membuat akun Anda.

---

### ❓ Token expired, apa yang harus dilakukan?

**Jawab**: 
1. Login ulang di endpoint `/api/v1/auth/login`
2. Copy token baru
3. Klik "Authorize" dan paste token baru

Token berlaku **30 menit**. Setelah itu harus login ulang.

---

### ❓ Lupa password, bagaimana reset?

**Jawab**: Hubungi **Admin/HRD** untuk reset password. Admin akan memberikan password baru.

---

### ❓ Bisa absensi lebih dari 1x per hari?

**Jawab**: **Bisa**. Sistem tidak membatasi jumlah absensi per hari. Contoh use case:
- Shift pagi: Absen masuk jam 08:00
- Shift siang: Absen masuk jam 14:00
- Lembur: Absen masuk jam 20:00

---

### ❓ Apakah bisa edit absensi sendiri?

**Jawab**: **Tidak bisa**. User hanya bisa:
- ✅ Buat absensi baru
- ✅ Lihat riwayat absensi sendiri

Untuk **koreksi/edit**, hubungi **Admin**.

---

### ❓ Kenapa muncul error 403 Forbidden?

**Jawab**: Error 403 berarti Anda tidak punya akses. Kemungkinan:
1. Anda mencoba akses endpoint admin (hanya untuk admin)
2. Anda mencoba lihat absensi orang lain
3. Token Anda tidak valid

**Solusi**: Pastikan mengakses endpoint yang sesuai role Anda (user).

---

### ❓ Apakah absensi bisa dilakukan dari mana saja?

**Jawab**: **Tergantung kebijakan**. Sistem mencatat:
- ✅ IP Address device
- ✅ Lokasi (id_lokasi)
- ✅ Waktu absensi

Admin dapat memonitor apakah absensi dilakukan dari lokasi yang sesuai berdasarkan IP address.

---

### ❓ Bagaimana cara lihat absensi bulan lalu?

**Jawab**: Gunakan pagination di endpoint `GET /api/v1/absensi/me`:
- Set `limit`: 1000 (untuk mendapatkan banyak data)
- Data diurutkan dari terbaru ke terlama

Atau minta **Admin** untuk export laporan bulanan.

---

### ❓ Apa itu id_lokasi dan uid?

**Jawab**:
- **id_lokasi**: Kode lokasi kerja Anda (contoh: "LOK001" = Ruang IGD, "LOK002" = Ruang ICU)
- **uid**: Unique ID dari device/kartu RFID Anda

Tanyakan ke **Admin** untuk daftar kode lokasi yang berlaku.

---

### ❓ Bagaimana jika salah input saat absensi?

**Jawab**: 
1. Segera hubungi **Admin**
2. Admin dapat:
   - Edit data absensi yang salah
   - Hapus absensi duplikat
   - Koreksi tanggal/lokasi

**Jangan** input absensi ulang tanpa konfirmasi admin.

---

## 📊 Tips Penggunaan

### ✅ DOs (Lakukan)

1. **Login setiap hari** untuk absensi
2. **Isi keterangan** dengan jelas (terutama jika ada kondisi khusus)
3. **Cek riwayat absensi** secara berkala untuk memastikan data benar
4. **Logout** setelah selesai (tutup browser)
5. **Simpan password** dengan aman
6. **Catat id_lokasi** dan **uid** Anda untuk memudahkan input

### ❌ DON'Ts (Jangan)

1. **Jangan share** username dan password ke orang lain
2. **Jangan share** token akses
3. **Jangan absensi** untuk orang lain
4. **Jangan input** data yang tidak sesuai fakta
5. **Jangan akses** endpoint admin (akan error 403)

---

## 🔐 Keamanan

### Proteksi Akun Anda

1. **Password yang kuat**:
   - Minimal 8 karakter
   - Kombinasi huruf dan angka
   - Jangan gunakan tanggal lahir atau nama

2. **Jangan simpan password** di:
   - Note HP yang tidak terproteksi
   - Sticky note di meja kerja
   - Email atau chat

3. **Logout setelah selesai**:
   - Tutup browser
   - Clear cache jika menggunakan komputer publik

4. **Laporkan ke Admin** jika:
   - Akun Anda diakses orang lain
   - Melihat absensi yang tidak Anda buat
   - Lupa password

---

## 📱 Menggunakan di Mobile

### Cara Akses dari HP

1. Buka browser di HP (Chrome/Firefox)
2. Akses: http://192.168.171.15:8000/docs
3. Login seperti biasa
4. Authorize dengan token
5. Lakukan absensi

**📌 Tips Mobile:**
- Gunakan landscape mode untuk tampilan lebih baik
- Bookmark URL untuk akses cepat
- Pastikan terhubung ke WiFi kantor/VPN

---

## 📞 Bantuan

### Hubungi Admin jika:

- ✉️ Belum punya akun
- 🔑 Lupa password
- ❌ Error saat absensi
- 📝 Perlu koreksi data absensi
- ❓ Pertanyaan lainnya

### Self-Service:

- 📖 Baca dokumentasi ini
- 🔍 Cek FAQ di atas
- 💡 Coba troubleshooting sendiri dulu

---

**Version**: 2.0.0  
**Last Updated**: 12 Februari 2026  
**Environment**: Production - RSUD Sulfat  

---

**Selamat menggunakan Sistem Absensi RSUD Sulfat!** 🎉
