# Update Existing Database

## Masalah
Jika database Anda sudah berjalan SEBELUM update init.sql terbaru, maka:
- ❌ Permissions tidak lengkap (hanya 5, seharusnya 27)
- ❌ Role "user" tidak punya `absensi.read` dan `absensi.update`
- ❌ Role "admin" tidak punya permissions lengkap
- ❌ Constraint `unique_absensi_per_day` belum ada

## Solusi

### Opsi 1: Re-create Database (RECOMMENDED untuk Development)

**⚠️ WARNING: Ini akan HAPUS semua data!**

```bash
cd /home/sultan/fast-absen/database

# Stop database
docker compose down

# Remove volume (hapus semua data)
docker volume rm database_postgres_data

# Start fresh
docker compose up -d

# Database sekarang sudah punya semua permissions lengkap
```

### Opsi 2: Sync Permissions (untuk Production)

Jika Anda sudah punya data dan tidak ingin kehilangan:

```bash
cd /home/sultan/fast-absen/backend
source venv/bin/activate

# Run sync script
PYTHONPATH=/home/sultan/fast-absen/backend python scripts/sync_permissions.py
```

Output yang diharapkan:
```
✅ Permissions: 22 created, 5 updated
✅ Assigned 22 permissions to role 'super-admin'
✅ Assigned 11 permissions to role 'admin'
✅ Assigned 2 permissions to role 'user'
✅ Permissions sync completed successfully.
```

### Opsi 3: Manual SQL Update

Jika sync script tidak bisa dijalankan, eksekusi SQL ini manual:

```sql
-- 1. Add missing permissions
INSERT INTO permissions (name, description) VALUES
('users.read', 'Melihat data user'),
('users.create', 'Membuat user baru'),
('users.update', 'Mengubah data user'),
('users.delete', 'Menghapus user'),
('roles.read', 'Melihat data role'),
('roles.create', 'Membuat role baru'),
('roles.update', 'Mengubah role'),
('roles.delete', 'Menghapus role'),
('permissions.read', 'Melihat data permission'),
('permissions.create', 'Membuat permission baru'),
('permissions.update', 'Mengubah permission'),
('permissions.delete', 'Menghapus permission'),
('pegawai.read', 'Melihat data pegawai'),
('pegawai.create', 'Membuat data pegawai baru'),
('pegawai.update', 'Mengubah data pegawai'),
('pegawai.delete', 'Menghapus data pegawai'),
('user_sessions.read', 'Melihat data session login'),
('user_sessions.create', 'Membuat session login baru'),
('user_sessions.update', 'Mengubah status session'),
('user_sessions.delete', 'Menghapus session'),
('login_absensi.read', '[DEPRECATED] Melihat data login absensi'),
('login_absensi.create', '[DEPRECATED] Membuat login absensi')
ON CONFLICT (name) DO NOTHING;

-- 2. Update existing permission descriptions
UPDATE permissions SET description = 'Login ke aplikasi' WHERE name = 'user.login';
UPDATE permissions SET description = 'Melihat data absensi (history, summary, today)' WHERE name = 'absensi.read';
UPDATE permissions SET description = 'Membuat absensi (check-in)' WHERE name = 'absensi.create';
UPDATE permissions SET description = 'Mengubah absensi (check-out, admin edit)' WHERE name = 'absensi.update';
UPDATE permissions SET description = 'Menghapus absensi (admin only)' WHERE name = 'absensi.delete';

-- 3. Assign missing permissions to role 'user' (CRITICAL!)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, p.id FROM permissions p 
WHERE p.name IN ('absensi.read', 'absensi.update')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = 2 AND rp.permission_id = p.id
  );

-- 4. Assign permissions to role 'admin'
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, p.id FROM permissions p 
WHERE p.name IN (
    'users.read', 'users.create', 'users.update', 'users.delete',
    'pegawai.read', 'pegawai.create', 'pegawai.update', 'pegawai.delete',
    'absensi.read', 'absensi.create', 'absensi.update', 'absensi.delete',
    'user_sessions.read'
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = 1 AND rp.permission_id = p.id
);

-- 5. Assign ALL permissions to role 'super-admin'
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, p.id FROM permissions p
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = 3 AND rp.permission_id = p.id
);

-- 6. Add unique constraint (prevent duplicate check-in per day)
ALTER TABLE absensi 
ADD CONSTRAINT unique_absensi_per_day 
UNIQUE (id_pegawai, tanggal);
```

## Verifikasi

Cek permissions per role:

```sql
-- Check User role permissions
SELECT r.name as role, p.name as permission, p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'user'
ORDER BY p.name;

-- Expected output (4 permissions):
-- user | absensi.create | Membuat absensi (check-in)
-- user | absensi.read   | Melihat data absensi (history, summary, today)
-- user | absensi.update | Mengubah absensi (check-out, admin edit)
-- user | user.login     | Login ke aplikasi
```

```sql
-- Check Admin role permissions
SELECT r.name as role, COUNT(p.id) as total_permissions
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name IN ('user', 'admin', 'super-admin')
GROUP BY r.name;

-- Expected output:
-- user        | 4
-- admin       | 14
-- super-admin | 27
```

## Testing

Setelah update, test dengan user biasa:

1. Login sebagai user dengan role "user"
2. POST /api/v1/absensi/check-in → Should work ✅
3. POST /api/v1/absensi/check-out → Should work ✅ (ini yang sebelumnya error!)
4. GET /api/v1/absensi/today → Should work ✅
5. GET /api/v1/absensi/history → Should work ✅

Jika masih error "Forbidden", cek JWT token user apakah sudah ter-refresh dengan permissions baru.

## Notes

- **init.sql** sekarang sudah lengkap dengan 27 permissions
- **sync_permissions.py** diperbaiki untuk auto-assign ke role "user" dan "admin" juga
- Database baru (docker compose up pertama kali) sudah otomatis benar
- Database lama perlu di-sync manual atau di-recreate
