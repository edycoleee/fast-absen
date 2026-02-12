# Docker Database Management

Panduan lengkap untuk mengelola PostgreSQL database menggunakan Docker Compose.

## 📋 Informasi Container

- **PostgreSQL**: `attendance-db-postgres` (Port: 5432)
- **pgAdmin**: `attendance-db-pgadmin` (Port: 5050)
- **Network**: `pg_network`
- **Volumes**: `postgres_data`, `pgadmin_data`

---

## 🚀 Setting Up Database

### 1. First Time Setup (dengan init.sql otomatis)

```bash
cd /home/sultan/fast-absen/database
docker compose up -d
```

**Yang terjadi:**
- Container PostgreSQL dan pgAdmin akan dijalankan
- File `init.sql` akan otomatis dieksekusi saat pertama kali container dibuat
- Database `attendance_db` dan semua tabel akan dibuat otomatis
- Data sample akan di-insert

**Verifikasi:**
```bash
# Cek container running
docker ps

# Cek database dan tabel
docker exec attendance-db-postgres psql -U sultan -d attendance_db -c "\dt"

# Cek data di tabel roles
docker exec attendance-db-postgres psql -U sultan -d attendance_db -c "SELECT * FROM roles;"
```

### 2. Akses pgAdmin

- URL: `http://localhost:5050` atau `http://192.168.30.14:5050`
- Email: `admin@admin.com`
- Password: `admin`

**Tambah Server di pgAdmin:**
- Name: `Attendance DB`
- Host: `attendance-db-postgres` (nama container)
- Port: `5432`
- Database: `attendance_db`
- Username: `sultan`
- Password: `Sulfat123#!`

---

## 🔄 Restart Database

### Restart Container (data tetap ada)

```bash
cd /home/sultan/fast-absen/database
docker compose restart
```

atau restart service tertentu:

```bash
# Restart PostgreSQL saja
docker compose restart postgres

# Restart pgAdmin saja
docker compose restart pgadmin
```

---

## 🛑 Down Database

### Stop dan Remove Container (volume tetap ada)

```bash
cd /home/sultan/fast-absen/database
docker compose down
```

**Yang terjadi:**
- Container PostgreSQL dan pgAdmin dihapus
- Network dihapus
- **Volume TIDAK dihapus** (data tetap aman)

### Stop Container (tanpa remove)

```bash
docker compose stop
```

---

## 🔄 Init Baru / Reset Database

### Opsi 1: Reset dengan menghapus volume (SEMUA DATA HILANG)

```bash
cd /home/sultan/fast-absen/database

# Stop dan hapus container + volume
docker compose down -v

# Start ulang (init.sql akan dieksekusi lagi)
docker compose up -d
```

### Opsi 2: Drop database dan recreate (dalam container yang running)

```bash
# Drop database
docker exec attendance-db-postgres psql -U sultan -d postgres -c "DROP DATABASE IF EXISTS attendance_db;"

# Create database baru
docker exec attendance-db-postgres psql -U sultan -d postgres -c "CREATE DATABASE attendance_db OWNER sultan;"

# Jalankan init.sql
docker exec -i attendance-db-postgres psql -U sultan -d attendance_db < /home/sultan/fast-absen/database/init.sql
```

### Opsi 3: Drop dan recreate hanya tabel tertentu

```bash
# Drop semua tabel
docker exec attendance-db-postgres psql -U sultan -d attendance_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Jalankan init.sql
docker exec -i attendance-db-postgres psql -U sultan -d attendance_db < /home/sultan/fast-absen/database/init.sql
```

---

## 🗑️ Delete Volume

### Hapus semua volume (SEMUA DATA HILANG PERMANEN)

```bash
cd /home/sultan/fast-absen/database

# Stop dan hapus container terlebih dahulu
docker compose down

# Hapus volume
docker volume rm postgres_data pgadmin_data
```

### Hapus hanya volume PostgreSQL

```bash
docker compose down
docker volume rm postgres_data
```

### Hapus hanya volume pgAdmin

```bash
docker compose down
docker volume rm pgadmin_data
```

### List semua volume

```bash
docker volume ls | grep postgres
```

---

## 🔄 Reset Data (Truncate Tables)

### Reset semua data (struktur tabel tetap ada)

```bash
# Truncate semua tabel sekaligus
docker exec attendance-db-postgres psql -U sultan -d attendance_db -c "
TRUNCATE TABLE 
    absensi, 
    login_absensi, 
    user_roles, 
    users, 
    role_permissions, 
    permissions, 
    roles, 
    pegawai 
RESTART IDENTITY CASCADE;
"
```

### Reset data dan insert ulang data sample

```bash
# Truncate dan jalankan init.sql
docker exec attendance-db-postgres psql -U sultan -d attendance_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec -i attendance-db-postgres psql -U sultan -d attendance_db < /home/sultan/fast-absen/database/init.sql
```

### Reset data tabel tertentu

```bash
# Reset hanya tabel absensi
docker exec attendance-db-postgres psql -U sultan -d attendance_db -c "TRUNCATE TABLE absensi RESTART IDENTITY CASCADE;"

# Reset hanya tabel users
docker exec attendance-db-postgres psql -U sultan -d attendance_db -c "TRUNCATE TABLE users RESTART IDENTITY CASCADE;"
```

---

## 📊 Monitoring & Troubleshooting

### Cek Status Container

```bash
docker ps -a
```

### Cek Logs

```bash
# Logs PostgreSQL
docker logs attendance-db-postgres

# Logs pgAdmin
docker logs attendance-db-pgadmin

# Follow logs real-time
docker logs -f attendance-db-postgres
```

### Cek Resource Usage

```bash
docker stats attendance-db-postgres attendance-db-pgadmin
```

### Masuk ke PostgreSQL Shell

```bash
docker exec -it attendance-db-postgres psql -U sultan -d attendance_db
```

**Perintah dalam PostgreSQL:**
```sql
-- List semua database
\l

-- List semua tabel
\dt

-- Describe tabel
\d users

-- List semua schema
\dn

-- Quit
\q
```

### Backup Database

```bash
# Backup database
docker exec attendance-db-postgres pg_dump -U sultan attendance_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup dengan kompresi
docker exec attendance-db-postgres pg_dump -U sultan attendance_db | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore Database

```bash
# Restore dari file backup
docker exec -i attendance-db-postgres psql -U sultan -d attendance_db < backup_20260212_091000.sql

# Restore dari compressed backup
gunzip -c backup_20260212_091000.sql.gz | docker exec -i attendance-db-postgres psql -U sultan -d attendance_db
```

---

## ⚙️ Konfigurasi

### File Konfigurasi

- **docker-compose.yml**: Konfigurasi Docker services
- **.env**: Environment variables (database credentials)
- **init.sql**: SQL script untuk inisialisasi database

### Environment Variables (.env)

```bash
DOCKER_HOST_IP=0.0.0.0
POSTGRES_DB=attendance_db
POSTGRES_USER=sultan
POSTGRES_PASSWORD=Sulfat123#!
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
PGADMIN_DEFAULT_EMAIL=admin@admin.com
PGADMIN_DEFAULT_PASSWORD=admin
PGADMIN_PORT=5050
```

---

## 🔒 Keamanan

### Production Checklist

- [ ] Ganti default password PostgreSQL
- [ ] Ganti default email & password pgAdmin
- [ ] Ubah `DOCKER_HOST_IP` ke IP spesifik (bukan 0.0.0.0)
- [ ] Aktifkan SSL untuk PostgreSQL
- [ ] Batasi akses network menggunakan firewall
- [ ] Backup database secara berkala
- [ ] Gunakan secrets management untuk credentials

### Ganti Password PostgreSQL

```bash
docker exec -it attendance-db-postgres psql -U sultan -d postgres -c "ALTER USER sultan WITH PASSWORD 'NewPassword123!';"
```

**Jangan lupa update di `.env` dan `/backend/config/settings.py`**

---

## 📝 Quick Reference

```bash
# Start database
docker compose up -d

# Stop database
docker compose down

# Restart database
docker compose restart

# Reset database (hapus semua data)
docker compose down -v && docker compose up -d

# Backup database
docker exec attendance-db-postgres pg_dump -U sultan attendance_db > backup.sql

# Restore database
docker exec -i attendance-db-postgres psql -U sultan -d attendance_db < backup.sql

# View logs
docker logs -f attendance-db-postgres

# PostgreSQL shell
docker exec -it attendance-db-postgres psql -U sultan -d attendance_db
```

---

## 🆘 Troubleshooting

### Container tidak bisa start

```bash
# Cek logs
docker logs attendance-db-postgres

# Cek port sudah dipakai
sudo netstat -tulpn | grep 5432

# Restart Docker
sudo systemctl restart docker
```

### Init.sql tidak dieksekusi

Init.sql hanya dieksekusi saat **first-time setup**. Jika volume sudah ada, script tidak akan dijalankan.

**Solusi:**
```bash
# Hapus volume dan start ulang
docker compose down -v
docker compose up -d
```

### Connection refused dari backend

Cek:
1. Container PostgreSQL running: `docker ps`
2. Port 5432 terbuka: `docker port attendance-db-postgres`
3. Credentials benar di `.env` backend
4. Network connectivity: `docker network inspect pg_network`

### Tidak bisa akses pgAdmin

```bash
# Cek container running
docker ps | grep pgadmin

# Cek port
docker port attendance-db-pgadmin

# Restart pgAdmin
docker compose restart pgadmin
```

---

## 📚 Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
- [pgvector Extension](https://github.com/pgvector/pgvector)
