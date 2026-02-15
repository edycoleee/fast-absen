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
-- TABLE: login_absensi
-- ============================================================
CREATE TABLE login_absensi (
    id SERIAL PRIMARY KEY,
    id_pegawai VARCHAR(20) REFERENCES pegawai(id_pegawai),
    uid VARCHAR(50),
    player_id VARCHAR(50),
    model VARCHAR(250),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: absensi
-- ============================================================
CREATE TABLE absensi (
    id SERIAL PRIMARY KEY,
    id_lokasi INTEGER,
    id_pegawai VARCHAR(20) REFERENCES pegawai(id_pegawai),
    uid VARCHAR(50),
    tanggal TIMESTAMPTZ DEFAULT NOW(),
    keterangan VARCHAR(100),
    ip_address INET
);

-- ============================================================
-- DEFAULT RBAC SEEDER
-- ============================================================

-- Roles
INSERT INTO roles (name, description) VALUES
('admin', 'Full system access'),
('user', 'Pegawai yang melakukan absensi'),
('super-admin', 'Full system access');

-- Permissions
INSERT INTO permissions (name, description) VALUES
('user.login', 'Login aplikasi'),
('absensi.create', 'Melakukan absensi'),
('absensi.read', 'Melihat data absensi'),
('absensi.update', 'Mengubah data absensi'),
('absensi.delete', 'Menghapus data absensi');

-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- User gets limited permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
(2, 1), -- user.login
(2, 2); -- absensi.create
