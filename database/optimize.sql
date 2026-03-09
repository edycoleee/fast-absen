-- ============================================================
-- OPTIMIZE.SQL — Patch Performa untuk Server 151
-- Jalankan SATU KALI pada database yang sudah berjalan.
-- Aman dijalankan berulang (IF NOT EXISTS / IF EXISTS).
--
-- Cara pakai:
--   psql -U sultan -d attendance_db -f database/optimize.sql
--
-- Estimasi waktu eksekusi: 1–5 menit (tergantung ukuran data)
-- Semua CREATE INDEX berjalan CONCURRENTLY = tidak lock tabel
-- CATATAN: CONCURRENT tidak bisa di dalam transaction block
-- ============================================================

\echo ''
\echo '======================================================'
\echo '  OPTIMASI DATABASE — Sistem Absensi 800 Karyawan'
\echo '======================================================'
\echo ''

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
\echo '[1/6] Mengaktifkan Extensions...'

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS vector;

\echo '      OK: pg_stat_statements, vector'

-- ============================================================
-- 2. INDEX: absensi
-- Tabel yang paling berat — 800 record/hari, query harian/bulanan
-- ============================================================
\echo ''
\echo '[2/6] Membuat indexes pada tabel absensi...'

-- Filter by date (laporan harian, rekap bulanan)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_absensi_tanggal
    ON absensi(tanggal DESC);

-- Paling sering: cek absensi hari ini per pegawai
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_absensi_pegawai_tanggal
    ON absensi(id_pegawai, tanggal DESC);

-- Rekap status per periode (HADIR, ALPHA, TERLAMBAT, dll)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_absensi_status_tanggal
    ON absensi(status, tanggal DESC);

-- Sort by created_at untuk audit log
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_absensi_created_at
    ON absensi(created_at DESC);

-- Partial index: sesi aktif (belum checkout) — query check-out sangat cepat
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_absensi_aktif
    ON absensi(id_pegawai, tanggal)
    WHERE jam_keluar IS NULL;

\echo '      OK: 5 indexes pada absensi'

-- ============================================================
-- 3. INDEX: roster_shift
-- Query join pegawai+tanggal paling sering saat penilaian shift
-- ============================================================
\echo ''
\echo '[3/6] Membuat indexes pada tabel roster_shift...'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_roster_shift_pegawai_tanggal
    ON roster_shift(id_pegawai, tanggal_shift);

-- Partial index: hanya roster AKTIF — filter default hampir semua query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_roster_shift_aktif
    ON roster_shift(tanggal_shift, id_pegawai)
    WHERE status_roster = 'AKTIF';

\echo '      OK: 2 indexes pada roster_shift'

-- ============================================================
-- 4. INDEX: penilaian_shift_absensi
-- Query rekap KPI per pegawai
-- ============================================================
\echo ''
\echo '[4/6] Membuat indexes pada tabel penilaian_shift_absensi...'

-- Composite: rekap KPI per pegawai per bulan
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_penilaian_pegawai_evaluated
    ON penilaian_shift_absensi(id_pegawai, evaluated_at DESC);

-- Partial: yang belum di-match (untuk background job evaluator)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_penilaian_pending
    ON penilaian_shift_absensi(roster_shift_id)
    WHERE matched_absensi_id IS NULL;

\echo '      OK: 2 indexes pada penilaian_shift_absensi'

-- ============================================================
-- 5. INDEX: user_sessions
-- Sesi aktif karyawan saat jam sibuk
-- ============================================================
\echo ''
\echo '[5/6] Membuat indexes pada tabel user_sessions...'

-- Partial: hanya session yang masih aktif (logout_at IS NULL)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_aktif
    ON user_sessions(id_pegawai, last_activity DESC)
    WHERE logout_at IS NULL;

\echo '      OK: 1 index pada user_sessions'

-- ============================================================
-- 6. INDEX: approval_pengajuan_absensi
-- Antrian approval PENDING untuk atasan
-- ============================================================
\echo ''
\echo '[5/6] Membuat indexes pada tabel approval_pengajuan_absensi...'

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_pending
    ON approval_pengajuan_absensi(assigned_approver_id_pegawai, diajukan_pada DESC)
    WHERE status_pengajuan = 'PENDING';

\echo '      OK: 1 index pada approval_pengajuan_absensi'

-- ============================================================
-- 7. FACE EMBEDDINGS — Ganti IVFFlat → HNSW
-- HNSW lebih cepat untuk < 100k vectors, tidak perlu VACUUM dulu
-- ============================================================
\echo ''
\echo '[6/6] Upgrade face_embeddings: IVFFlat → HNSW...'

-- Hapus index lama jika ada
DROP INDEX CONCURRENTLY IF EXISTS idx_face_embeddings_vector;

-- Buat HNSW (lebih optimal untuk 800–5000 embeddings)
-- m=16: koneksi per node, ef_construction=64: akurasi saat build
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_face_embeddings_vector
    ON face_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

\echo '      OK: HNSW index aktif pada face_embeddings'

-- ============================================================
-- 8. POSTGRESQL RUNTIME SETTINGS
-- Rekomendasi untuk server dengan RAM >= 4GB
-- Sesuaikan shared_buffers di postgresql.conf untuk perubahan permanen
-- ============================================================
\echo ''
\echo '[Bonus] Optimasi runtime settings sesi ini...'

-- Naikkan work_mem untuk query sort/hash join (berlaku per sesi)
SET work_mem = '32MB';

-- Tingkatkan efektivitas query planner untuk index scan
SET random_page_cost = 1.5;  -- Rekomendasi untuk SSD

\echo '      OK: work_mem=32MB, random_page_cost=1.5 (sesi ini saja)'
\echo '      CATATAN: Tambahkan ke postgresql.conf untuk permanen:'
\echo '        shared_buffers = 1GB          # 25% dari RAM server'
\echo '        effective_cache_size = 3GB    # 75% dari RAM server'
\echo '        work_mem = 32MB'
\echo '        random_page_cost = 1.5        # Jika storage SSD'
\echo '        max_connections = 100'
\echo '        pg_stat_statements.track = all'

-- ============================================================
-- VERIFIKASI: Tampilkan semua index yang baru dibuat
-- ============================================================
\echo ''
\echo '======================================================'
\echo '  VERIFIKASI — Daftar Index yang Aktif'
\echo '======================================================'

SELECT
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS ukuran
FROM pg_indexes
WHERE tablename IN (
    'absensi',
    'face_embeddings',
    'roster_shift',
    'penilaian_shift_absensi',
    'user_sessions',
    'approval_pengajuan_absensi'
)
AND schemaname = 'public'
ORDER BY tablename, indexname;

\echo ''
\echo '======================================================'
\echo '  SELESAI — Database siap untuk 800 karyawan'
\echo '======================================================'
