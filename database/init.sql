-- ============================================================
-- INIT DATABASE SCHEMA FOR ATTENDANCE SYSTEM (RBAC + ABSENSI)
-- PostgreSQL 16
-- ============================================================

-- ============================================================
-- EXTENSIONS (optional but recommended)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: roles
-- ============================================================
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- ============================================================
-- TABLE: permissions
-- ============================================================
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- ============================================================
-- TABLE: role_permissions (RBAC many-to-many)
-- ============================================================
CREATE TABLE role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- TABLE: pegawai
-- ============================================================
CREATE TABLE pegawai (
    id_pegawai VARCHAR(20) PRIMARY KEY,
    nip VARCHAR(50),
    nama VARCHAR(255),
    jenis_kelamin VARCHAR(10),
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    alamat TEXT,
    id_ruang INTEGER,
    status VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    foto VARCHAR(255)
);

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    id_pegawai VARCHAR(20) REFERENCES pegawai(id_pegawai),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: user_roles (user ↔ role)
-- ============================================================
CREATE TABLE user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- TABLE: user_sessions (Login Tracking untuk Web & Mobile)
-- ============================================================
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    id_pegawai VARCHAR(20) NOT NULL REFERENCES pegawai(id_pegawai),
    
    -- Session Management
    session_id VARCHAR(255) UNIQUE,  -- UUID untuk track session
    
    -- Device & Browser Info
    device_type VARCHAR(20) CHECK (device_type IN ('web', 'mobile', 'tablet')),
    user_agent TEXT,  -- Full user agent string
    browser VARCHAR(100),  -- Parsed: Chrome, Firefox, Safari, dll
    os VARCHAR(100),      -- Parsed: Windows, Linux, Android, iOS
    device_model VARCHAR(250),  -- Untuk mobile
    
    -- Network Info
    ip_address INET NOT NULL,  -- IP address user
    country VARCHAR(100),      -- Deteksi dari IP (opsional)
    city VARCHAR(100),         -- Deteksi dari IP (opsional)
    
    -- Mobile-specific (opsional, NULL untuk web)
    uid VARCHAR(50),           -- Device UID mobile
    player_id VARCHAR(50),     -- Push notification ID
    
    -- Session Lifecycle
    login_at TIMESTAMPTZ DEFAULT NOW(),
    logout_at TIMESTAMPTZ,  -- NULL = masih aktif
    last_activity TIMESTAMPTZ DEFAULT NOW(),  -- Update setiap request
    
    -- Security
    login_status VARCHAR(20) DEFAULT 'success' 
        CHECK (login_status IN ('success', 'failed', 'blocked')),
    failed_reason TEXT,  -- Jika login gagal
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX idx_sessions_pegawai ON user_sessions(id_pegawai);
CREATE INDEX idx_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_sessions_ip ON user_sessions(ip_address);
CREATE INDEX idx_sessions_login_at ON user_sessions(login_at DESC);

-- ============================================================
-- TABLE: absensi
-- ============================================================
-- Schema yang disarankan
CREATE TABLE absensi (
    id SERIAL PRIMARY KEY,
    id_pegawai VARCHAR(20) NOT NULL REFERENCES pegawai(id_pegawai),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_masuk TIMESTAMPTZ,
    jam_keluar TIMESTAMPTZ,
    
    -- Data terstruktur
    status VARCHAR(20) DEFAULT 'HADIR' 
        CHECK (status IN ('HADIR', 'IZIN', 'SAKIT', 'ALPHA', 'TERLAMBAT', 'CUTI')),
    
    -- Data freetext untuk alasan/catatan
    keterangan TEXT,  -- ✅ Diisi user untuk jelaskan alasan
    
    -- Dokumen pendukung (opsional)
    dokumen_pendukung VARCHAR(255),  -- Path ke file (surat dokter, dll)
    
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UNIQUE CONSTRAINT: One absensi per employee per day
-- ============================================================
ALTER TABLE absensi ADD CONSTRAINT unique_absensi_per_day 
    UNIQUE (id_pegawai, tanggal);

-- ============================================================
-- DEFAULT RBAC SEEDER
-- ============================================================

-- Roles
INSERT INTO roles (name, description) VALUES
('admin', 'Administrator dengan akses penuh ke CRUD'),
('user', 'Pegawai yang melakukan absensi harian'),
('super-admin', 'Super Administrator dengan akses penuh sistem');

-- Permissions (lengkap sesuai permission_registry.py)
INSERT INTO permissions (name, description) VALUES
-- Authentication
('user.login', 'Login ke aplikasi'),

-- User Management
('users.read', 'Melihat data user'),
('users.create', 'Membuat user baru'),
('users.update', 'Mengubah data user'),
('users.delete', 'Menghapus user'),

-- Role Management
('roles.read', 'Melihat data role'),
('roles.create', 'Membuat role baru'),
('roles.update', 'Mengubah role'),
('roles.delete', 'Menghapus role'),

-- Permission Management
('permissions.read', 'Melihat data permission'),
('permissions.create', 'Membuat permission baru'),
('permissions.update', 'Mengubah permission'),
('permissions.delete', 'Menghapus permission'),

-- Pegawai Management
('pegawai.read', 'Melihat data pegawai'),
('pegawai.create', 'Membuat data pegawai baru'),
('pegawai.update', 'Mengubah data pegawai'),
('pegawai.delete', 'Menghapus data pegawai'),

-- Absensi Management
('absensi.read', 'Melihat data absensi (history, summary, today)'),
('absensi.create', 'Membuat absensi (check-in)'),
('absensi.update', 'Mengubah absensi (check-out, admin edit)'),
('absensi.delete', 'Menghapus absensi (admin only)'),

-- User Sessions Management
('user_sessions.read', 'Melihat data session login'),
('user_sessions.create', 'Membuat session login baru'),
('user_sessions.update', 'Mengubah status session'),
('user_sessions.delete', 'Menghapus session'),

-- Deprecated (backward compatibility)
('login_absensi.read', '[DEPRECATED] Melihat data login absensi'),
('login_absensi.create', '[DEPRECATED] Membuat login absensi');

-- ============================================================
-- ROLE-PERMISSION ASSIGNMENTS
-- ============================================================

-- Super-Admin: Gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions;  -- role_id 3 = super-admin

-- Admin: Gets most permissions (manage users, pegawai, absensi)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, p.id FROM permissions p WHERE p.name IN (
    'user.login',
    'users.read', 'users.create', 'users.update', 'users.delete',
    'pegawai.read', 'pegawai.create', 'pegawai.update', 'pegawai.delete',
    'absensi.read', 'absensi.create', 'absensi.update', 'absensi.delete',
    'user_sessions.read'
);

-- User/Pegawai: Gets permissions for daily attendance
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, p.id FROM permissions p WHERE p.name IN (
    'user.login',           -- Login
    'absensi.read',         -- View own attendance (today, history, summary)
    'absensi.create',       -- Check-in
    'absensi.update'        -- Check-out (IMPORTANT!)
);
