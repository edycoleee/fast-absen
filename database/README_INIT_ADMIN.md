# Init Admin Super - Panduan Penggunaan

Script untuk membuat admin super dan pegawai pertama kali pada sistem absensi.

## Prerequisites

1. **Database PostgreSQL** sudah running:
   ```bash
   cd /home/sultan/fast-absen/database
   docker-compose up -d
   ```

2. **Python3 dengan passlib** terinstall:
   ```bash
   pip install passlib[bcrypt] --break-system-packages
   # atau
   sudo apt install python3-passlib python3-bcrypt
   ```

3. **Docker** (script menggunakan `docker exec`, tidak perlu psql client di host)

## Cara Menggunakan

### 1. Pastikan Database Running

```bash
cd /home/sultan/fast-absen/database
docker-compose up -d
```

Tunggu beberapa detik sampai PostgreSQL siap (cek dengan `docker-compose ps`).

### 2. Jalankan Script Init Admin

```bash
cd /home/sultan/fast-absen/database
./init-admin.sh
```

### 3. Input Data yang Diminta

Script akan menanyakan:

**Data Pegawai:**
- ID Pegawai (contoh: `P001`)
- NIP (contoh: `199001012020121001`)
- Nama Lengkap
- Jenis Kelamin (`L` atau `P`)
- Tempat Lahir
- Tanggal Lahir (format: `YYYY-MM-DD`, contoh: `1990-01-01`)
- Alamat
- Status (`PNS`, `CPNS`, atau `Honorer`)

**Data User (Login Credentials):**
- Username (untuk login ke sistem)
- Password (minimal 6 karakter, maksimal 72 karakter)
- Konfirmasi Password

### 4. Konfirmasi Data

Script akan menampilkan ringkasan data yang Anda input. Ketik `y` untuk konfirmasi.

### 5. Selesai!

Jika berhasil, Anda akan melihat pesan sukses beserta credentials untuk login.

## Contoh Penggunaan

```bash
sultan@raspberrypi:~/fast-absen/database$ ./init-admin.sh
============================================================
  INIT ADMIN SUPER - Sistem Absensi RSUD Sulfat
============================================================

✓ Loaded .env configuration

Database Configuration:
  Host: localhost
  Port: 5432
  Database: attendance_db
  User: postgres

Checking database connection...
✓ Database connection OK

============================================================
  DATA PEGAWAI (Admin Super)
============================================================

ID Pegawai (contoh: P001): ADM001
NIP (contoh: 199001012020121001): 198501012010011001
Nama Lengkap: Dr. Ahmad Yani
Jenis Kelamin (L/P): L
Tempat Lahir: Jakarta
Tanggal Lahir (YYYY-MM-DD): 1985-01-01
Alamat: Jl. Kesehatan No. 123, Jakarta
Status (PNS/CPNS/Honorer): PNS

============================================================
  DATA USER (Login Credentials)
============================================================

Username: admin
Password: ********
Konfirmasi Password: ********

============================================================
  KONFIRMASI DATA
============================================================

Data Pegawai:
  ID Pegawai    : ADM001
  NIP           : 198501012010011001
  Nama          : Dr. Ahmad Yani
  Jenis Kelamin : L
  Tempat Lahir  : Jakarta
  Tanggal Lahir : 1985-01-01
  Alamat        : Jl. Kesehatan No. 123, Jakarta
  Status        : PNS

Data User:
  Username      : admin
  Password      : ********
  Role          : admin

Apakah data sudah benar? (y/n): y

Hashing password...
✓ Password hashed

Inserting data to database...

============================================================
  ✓ ADMIN SUPER BERHASIL DIBUAT!
============================================================

Credentials untuk login:
  Username: admin
  Password: admin123
  Role: admin

Akses aplikasi:
  Frontend: http://192.168.171.15:3000
  Backend API: http://192.168.171.15:8000
  API Docs: http://192.168.171.15:8000/docs

Selamat! Anda sekarang dapat login sebagai admin.
```

## Fitur Script

### ✅ Validasi Database Connection
Script akan mengecek koneksi ke PostgreSQL sebelum memulai input data.

### ✅ Password Confirmation
Password diminta dua kali untuk memastikan tidak ada typo.

### ✅ Secure Password Hashing
Password di-hash menggunakan bcrypt (sama dengan backend).

### ✅ Preview Data
Data ditampilkan untuk konfirmasi sebelum disimpan.

### ✅ Upsert (Insert or Update)
Jika pegawai/user dengan ID/username sama sudah ada, data akan di-update.

### ✅ Auto Role Assignment
User otomatis diberi role `admin` dengan semua permissions.

### ✅ Colored Output
Output berwarna untuk kemudahan membaca.

## Troubleshooting

### Error: "Tidak dapat connect ke database"

**Penyebab:** PostgreSQL belum running atau konfigurasi salah.

**Solusi:**
```bash
# 1. Check Docker containers
docker-compose ps

# 2. Start database
docker-compose up -d

# 3. Check logs
docker-compose logs postgres

# 4. Verify .env file
cat .env
```

### Error: "Gagal hash password"

**Penyebab:** Python passlib belum terinstall.

**Solusi:**
```bash
# Install passlib dengan bcrypt
pip install passlib[bcrypt] --break-system-packages

# Atau gunakan apt (Debian/Ubuntu)
sudo apt install python3-passlib python3-bcrypt
```

### Password Terlalu Panjang

**Penyebab:** bcrypt memiliki limit 72 bytes untuk password.

**Solusi:** Gunakan password maksimal 72 karakter. Script akan otomatis truncate jika lebih panjang.

### Error: "psql: command not found"

**Penyebab:** PostgreSQL client belum terinstall.

**Solusi:**
```bash
# Install PostgreSQL client
sudo apt update
sudo apt install postgresql-client
```

### Error: "Password tidak cocok"

**Penyebab:** Password dan konfirmasi password tidak sama.

**Solusi:** Ketik ulang password dengan hati-hati.

### Password Terlupa

Jika Anda lupa password, jalankan script ini lagi dengan username yang sama. Password akan di-update dengan yang baru.

## Security Notes

⚠️ **PENTING:**
- Script ini menyimpan password di memory sementara (untuk hashing)
- Pastikan tidak ada orang yang melihat saat Anda mengetik password
- File `.env` berisi credentials database, jangan commit ke git
- Gunakan password yang kuat (min 8 karakter, kombinasi huruf, angka, simbol)

## File yang Digunakan

- **init-admin.sh** - Script utama
- **.env** - Konfigurasi database (auto-created jika belum ada)
- **init.sql** - Database schema (sudah dijalankan oleh docker-compose)

## Setelah Berhasil

Setelah admin super berhasil dibuat, Anda dapat:

1. **Login ke Frontend:**
   - URL: http://192.168.171.15:3000
   - Gunakan username & password yang baru dibuat

2. **Tambah User/Pegawai Lain:**
   - Melalui UI frontend (menu Users & Pegawai)
   - Atau jalankan script ini lagi untuk user lain

3. **Kelola Sistem:**
   - Assign roles ke user lain
   - Manage permissions
   - Monitor absensi

## Logs

Script tidak menyimpan log file. Semua output ditampilkan di terminal.

Jika perlu menyimpan log, redirect output saat menjalankan:
```bash
./init-admin.sh 2>&1 | tee init-admin.log
```

## Uninstall / Reset

Untuk reset database dan mulai dari awal:

```bash
# Stop containers
docker-compose down

# Hapus volumes (DATA AKAN HILANG!)
docker volume rm database_postgres_data database_pgadmin_data

# Start fresh
docker-compose up -d

# Tunggu 10 detik, lalu jalankan init-admin.sh lagi
./init-admin.sh
```

## Support

Jika ada masalah, check:
1. Docker containers running: `docker-compose ps`
2. PostgreSQL logs: `docker-compose logs postgres`
3. Database connection: `psql -h localhost -U postgres -d attendance_db`
4. Python bcrypt: `python3 -c "import bcrypt; print('OK')"`

---

**© 2024 RSUD Sulfat - Sistem Absensi**
