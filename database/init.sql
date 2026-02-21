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
    kepala_id_pegawai VARCHAR(20) REFERENCES pegawai(id_pegawai) ON DELETE SET NULL,
    jenis_kelamin VARCHAR(10),
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    alamat TEXT,
    id_ruang INTEGER,
    status VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    foto VARCHAR(255),
    CHECK (kepala_id_pegawai IS NULL OR kepala_id_pegawai <> id_pegawai)
);

CREATE INDEX idx_pegawai_kepala ON pegawai(kepala_id_pegawai);

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
-- TABLE: shift_kelompok (Master Kelompok Shift Pegawai)
-- ============================================================
CREATE TABLE shift_kelompok (
    id SERIAL PRIMARY KEY,
    kode VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(100) UNIQUE NOT NULL,
    deskripsi TEXT,
    is_shift_based BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: shift_kelompok_aturan (Aturan evaluasi per kelompok)
-- ============================================================
CREATE TABLE shift_kelompok_aturan (
    id SERIAL PRIMARY KEY,
    shift_kelompok_id INTEGER NOT NULL REFERENCES shift_kelompok(id) ON DELETE CASCADE,
    id_ruang INTEGER,
    grace_telat_menit INTEGER NOT NULL DEFAULT 10 CHECK (grace_telat_menit >= 0),
    toleransi_pulang_cepat_menit INTEGER NOT NULL DEFAULT 0 CHECK (toleransi_pulang_cepat_menit >= 0),
    batas_lembur_menit INTEGER NOT NULL DEFAULT 0 CHECK (batas_lembur_menit >= 0),
    window_mulai_minus_menit INTEGER NOT NULL DEFAULT 120 CHECK (window_mulai_minus_menit >= 0),
    window_selesai_plus_menit INTEGER NOT NULL DEFAULT 240 CHECK (window_selesai_plus_menit >= 0),
    maks_sesi_per_hari INTEGER NOT NULL DEFAULT 1 CHECK (maks_sesi_per_hari > 0),
    fleksibel_masuk_mulai TIME,
    fleksibel_masuk_sampai TIME,
    is_lintas_tanggal BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    effective_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (effective_end_date IS NULL OR effective_end_date >= effective_start_date),
    CHECK (
        fleksibel_masuk_mulai IS NULL
        OR fleksibel_masuk_sampai IS NULL
        OR fleksibel_masuk_sampai >= fleksibel_masuk_mulai
    )
);

CREATE INDEX idx_shift_kelompok_aturan_kelompok ON shift_kelompok_aturan(shift_kelompok_id);

-- ============================================================
-- TABLE: pegawai_shift_kelompok (Assignment Pegawai → Kelompok Shift)
-- ============================================================
CREATE TABLE pegawai_shift_kelompok (
    id SERIAL PRIMARY KEY,
    id_pegawai VARCHAR(20) NOT NULL REFERENCES pegawai(id_pegawai) ON DELETE CASCADE,
    shift_kelompok_id INTEGER NOT NULL REFERENCES shift_kelompok(id),
    effective_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_end_date DATE,
    is_default BOOLEAN DEFAULT TRUE,
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (effective_end_date IS NULL OR effective_end_date >= effective_start_date)
);

CREATE INDEX idx_pegawai_shift_kelompok_pegawai ON pegawai_shift_kelompok(id_pegawai);
CREATE INDEX idx_pegawai_shift_kelompok_shift ON pegawai_shift_kelompok(shift_kelompok_id);
CREATE UNIQUE INDEX uq_pegawai_shift_kelompok_aktif
    ON pegawai_shift_kelompok(id_pegawai)
    WHERE effective_end_date IS NULL;

-- ============================================================
-- APPROVAL MODEL (Sederhana): 1 pegawai → 1 kepala langsung
-- Kepala disimpan pada kolom pegawai.kepala_id_pegawai
-- Super-admin dapat override via workflow approval
-- ============================================================

-- ============================================================
-- TABLE: roster_upload_batch (Tracking upload template Excel)
-- ============================================================
CREATE TABLE roster_upload_batch (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    file_checksum VARCHAR(128),
    period_start DATE,
    period_end DATE,
    uploaded_by_pegawai VARCHAR(20) REFERENCES pegawai(id_pegawai) ON DELETE SET NULL,
    upload_status VARCHAR(20) NOT NULL DEFAULT 'UPLOADED'
        CHECK (upload_status IN ('UPLOADED', 'VALIDATED', 'IMPORTED', 'FAILED')),
    total_rows INTEGER DEFAULT 0,
    valid_rows INTEGER DEFAULT 0,
    invalid_rows INTEGER DEFAULT 0,
    error_summary JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start)
);

CREATE INDEX idx_roster_upload_batch_created_at ON roster_upload_batch(created_at DESC);

-- ============================================================
-- TABLE: roster_shift (Jadwal resmi hasil upload/import)
-- ============================================================
CREATE TABLE roster_shift (
    id BIGSERIAL PRIMARY KEY,
    upload_batch_id UUID REFERENCES roster_upload_batch(id) ON DELETE SET NULL,
    id_pegawai VARCHAR(20) NOT NULL REFERENCES pegawai(id_pegawai) ON DELETE CASCADE,
    shift_kelompok_id INTEGER REFERENCES shift_kelompok(id),
    id_ruang INTEGER,
    tanggal_shift DATE NOT NULL,
    jam_mulai TIMESTAMPTZ NOT NULL,
    jam_selesai TIMESTAMPTZ NOT NULL,
    jenis_shift VARCHAR(20) NOT NULL DEFAULT 'CUSTOM'
        CHECK (jenis_shift IN ('PAGI', 'SORE', 'MALAM', 'ON_CALL', 'CUSTOM')),
    nomor_sesi SMALLINT NOT NULL DEFAULT 1 CHECK (nomor_sesi > 0),
    grace_telat_override_menit INTEGER CHECK (grace_telat_override_menit >= 0),
    toleransi_pulang_cepat_override_menit INTEGER CHECK (toleransi_pulang_cepat_override_menit >= 0),
    status_roster VARCHAR(20) NOT NULL DEFAULT 'AKTIF'
        CHECK (status_roster IN ('AKTIF', 'BATAL', 'DIUBAH')),
    catatan TEXT,
    source_row_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (jam_selesai > jam_mulai)
);

CREATE INDEX idx_roster_shift_pegawai ON roster_shift(id_pegawai);
CREATE INDEX idx_roster_shift_tanggal ON roster_shift(tanggal_shift);
CREATE INDEX idx_roster_shift_kelompok ON roster_shift(shift_kelompok_id);
CREATE UNIQUE INDEX uq_roster_shift_per_sesi
    ON roster_shift(id_pegawai, jam_mulai, jam_selesai, nomor_sesi);

-- ============================================================
-- TABLE: approval_pengajuan_absensi (Workflow approval koreksi)
-- ============================================================
CREATE TABLE approval_pengajuan_absensi (
    id BIGSERIAL PRIMARY KEY,
    id_pegawai VARCHAR(20) NOT NULL REFERENCES pegawai(id_pegawai) ON DELETE CASCADE,
    assigned_approver_id_pegawai VARCHAR(20) REFERENCES pegawai(id_pegawai) ON DELETE SET NULL,
    roster_shift_id BIGINT REFERENCES roster_shift(id) ON DELETE SET NULL,
    tipe_pengajuan VARCHAR(30) NOT NULL
        CHECK (tipe_pengajuan IN (
            'KOREKSI_MASUK',
            'KOREKSI_KELUAR',
            'MISSING_CHECKIN',
            'MISSING_CHECKOUT',
            'ALASAN_TERLAMBAT',
            'ALASAN_PULANG_CEPAT'
        )),
    target_tanggal DATE NOT NULL,
    alasan TEXT NOT NULL,
    status_pengajuan VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status_pengajuan IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    approval_mode VARCHAR(30) NOT NULL DEFAULT 'ATASAN_LANGSUNG'
        CHECK (approval_mode IN ('ATASAN_LANGSUNG', 'SUPER_ADMIN_OVERRIDE')),
    diajukan_pada TIMESTAMPTZ DEFAULT NOW(),
    diputuskan_pada TIMESTAMPTZ,
    approved_by_pegawai VARCHAR(20) REFERENCES pegawai(id_pegawai) ON DELETE SET NULL,
    super_admin_override_by_pegawai VARCHAR(20) REFERENCES pegawai(id_pegawai) ON DELETE SET NULL,
    super_admin_override_reason TEXT,
    catatan_approval TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (assigned_approver_id_pegawai IS NULL OR assigned_approver_id_pegawai <> id_pegawai),
    CHECK (
        approval_mode = 'ATASAN_LANGSUNG'
        OR (
            approval_mode = 'SUPER_ADMIN_OVERRIDE'
            AND super_admin_override_by_pegawai IS NOT NULL
            AND super_admin_override_reason IS NOT NULL
        )
    )
);

CREATE INDEX idx_approval_pengajuan_absensi_pegawai ON approval_pengajuan_absensi(id_pegawai);
CREATE INDEX idx_approval_pengajuan_absensi_assigned_approver ON approval_pengajuan_absensi(assigned_approver_id_pegawai);
CREATE INDEX idx_approval_pengajuan_absensi_status ON approval_pengajuan_absensi(status_pengajuan);
CREATE INDEX idx_approval_pengajuan_absensi_roster ON approval_pengajuan_absensi(roster_shift_id);

-- ============================================================
-- TABLE: approval_pengajuan_absensi_log (Audit trail approval)
-- ============================================================
CREATE TABLE approval_pengajuan_absensi_log (
    id BIGSERIAL PRIMARY KEY,
    pengajuan_id BIGINT NOT NULL REFERENCES approval_pengajuan_absensi(id) ON DELETE CASCADE,
    action_by_pegawai VARCHAR(20) REFERENCES pegawai(id_pegawai) ON DELETE SET NULL,
    action_type VARCHAR(20) NOT NULL
        CHECK (action_type IN ('CREATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMMENTED', 'SUPER_ADMIN_OVERRIDDEN')),
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approval_pengajuan_absensi_log_pengajuan ON approval_pengajuan_absensi_log(pengajuan_id);

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
-- TABLE: penilaian_shift_absensi (Hasil compare roster vs absensi)
-- ============================================================
CREATE TABLE penilaian_shift_absensi (
    id BIGSERIAL PRIMARY KEY,
    roster_shift_id BIGINT NOT NULL UNIQUE REFERENCES roster_shift(id) ON DELETE CASCADE,
    id_pegawai VARCHAR(20) NOT NULL REFERENCES pegawai(id_pegawai) ON DELETE CASCADE,
    matched_absensi_id INTEGER REFERENCES absensi(id) ON DELETE SET NULL,
    checkin_aktual TIMESTAMPTZ,
    checkout_aktual TIMESTAMPTZ,
    menit_telat INTEGER NOT NULL DEFAULT 0 CHECK (menit_telat >= 0),
    menit_pulang_cepat INTEGER NOT NULL DEFAULT 0 CHECK (menit_pulang_cepat >= 0),
    menit_lembur INTEGER NOT NULL DEFAULT 0 CHECK (menit_lembur >= 0),
    status_final VARCHAR(30) NOT NULL
        CHECK (status_final IN (
            'TEPAT_WAKTU',
            'TERLAMBAT',
            'PULANG_CEPAT',
            'TIDAK_ABSEN_MASUK',
            'TIDAK_ABSEN_PULANG',
            'MANGKIR',
            'TIDAK_DIHITUNG'
        )),
    status_detail JSONB,
    evaluated_at TIMESTAMPTZ DEFAULT NOW(),
    evaluation_version INTEGER NOT NULL DEFAULT 1,
    is_manual_override BOOLEAN DEFAULT FALSE,
    override_reason TEXT,
    approved_by_pegawai VARCHAR(20) REFERENCES pegawai(id_pegawai) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_penilaian_shift_absensi_pegawai ON penilaian_shift_absensi(id_pegawai);
CREATE INDEX idx_penilaian_shift_absensi_status ON penilaian_shift_absensi(status_final);
CREATE INDEX idx_penilaian_shift_absensi_evaluated ON penilaian_shift_absensi(evaluated_at DESC);

-- ============================================================
-- NOTE: Multiple absensi records per employee per day are allowed
-- Use application logic to ensure only one ACTIVE session at a time
-- ============================================================

-- ============================================================
-- DEFAULT RBAC SEEDER
-- ============================================================

-- Master kelompok shift default (sesuai kebutuhan RS)
INSERT INTO shift_kelompok (kode, nama, deskripsi, is_shift_based)
VALUES
('DOKTER_SHIFT', 'Dokter Shift', 'Kelompok shift dokter jaga', TRUE),
('PERAWAT_SHIFT', 'Perawat Shift', 'Kelompok shift perawat rawat inap/IGD', TRUE),
('PERAWAT_POLI', 'Perawat Poliklinik', 'Kelompok perawat poliklinik (cenderung non-lintas tanggal)', TRUE),
('TENAGA_GIZI', 'Tenaga Gizi', 'Kelompok petugas gizi', TRUE),
('ADMIN_UMUM', 'Admin Umum', 'Kelompok karyawan administratif umum', FALSE),
('APOTEKER', 'Apoteker', 'Kelompok petugas farmasi/apotek', TRUE)
ON CONFLICT (kode) DO NOTHING;

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
