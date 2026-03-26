# Task DB — Data Growth & Maintenance Plan
## Sistem Absensi 1.000 Pegawai

---

## Proyeksi Pertumbuhan Data

| Tabel | Baris/hari | 1 Tahun | 3 Tahun | Risiko |
|---|---|---|---|---|
| `absensi` | ~1.000 | ~365.000 | ~1.095.000 | 🔴 Tinggi |
| `penilaian_shift_absensi` | ~1.000 | ~365.000 | ~1.095.000 | 🔴 Tinggi |
| `roster_shift` | ~31.000/upload | ~372.000/tahun | ~1.116.000 | 🟡 Sedang |
| `approval_pengajuan_absensi_log` | ~5–10/hari | ~2.000–3.500 | ~10.000 | 🟡 Sedang |
| `user_sessions` | tergantung login | — | — | ✅ Sudah handled |
| `face_embeddings` | statis | ~5.000 max | ~5.000 max | ✅ Aman |
| `roster_upload_batch` | per upload | ~100/tahun | ~300 | ✅ Kecil |

---

## Status Yang Sudah Ada ✅

### 1. Session Cleanup — `scheduler.py`
- APScheduler berjalan setiap `SESSION_CLEANUP_INTERVAL_MINUTES` (default: 60 menit)
- Menghapus sesi idle > `SESSION_EXPIRY_HOURS` (default: 24 jam)
- Log: `[Session Cleanup] Cleaned up N expired sessions`
- **Tidak perlu diubah — sudah cukup**

### 2. Indexes Sudah Optimal (`optimize.sql`)
- Composite index `(id_pegawai, tanggal DESC)` pada `absensi`
- Partial index `WHERE jam_keluar IS NULL` pada `absensi` (checkin aktif)
- Partial index `WHERE status_roster = 'AKTIF'` pada `roster_shift`
- Partial index `WHERE logout_at IS NULL` pada `user_sessions`
- HNSW index pada `face_embeddings` untuk cosine search
- **Sudah dijalankan di server — tidak perlu diulang**

### 3. Backup Manual (`database/DOCKER_DATABASE.md`)
```bash
# Backup harian
docker exec attendance-db-postgres pg_dump -U sultan attendance_db \
  | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```
Sudah terdokumentasi, belum otomatis (lihat task di bawah).

---

## Tasks Yang Perlu Dikerjakan

---

### [ ] 1. Archiving `absensi` — PRIORITAS TINGGI

**Masalah:** Tidak ada retention. Data 3 tahun lalu tetap di tabel utama, memperlambat
query rekap bulanan yang harus scan jutaan baris.

**Solusi best practice (tanpa partisi dulu):**

**Step 1 — Tambah kolom flag (ALTER, aman tanpa rebuild):**
```sql
ALTER TABLE absensi ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_absensi_not_archived
    ON absensi(tanggal DESC)
    WHERE is_archived = FALSE;
```

**Step 2 — Archive script (jalankan manual tiap awal tahun):**
```sql
-- Archive data lebih dari 2 tahun
UPDATE absensi
SET is_archived = TRUE
WHERE tanggal < (CURRENT_DATE - INTERVAL '2 years')
  AND is_archived = FALSE;
-- Cek hasilnya
SELECT COUNT(*) FROM absensi WHERE is_archived = TRUE;
```

**Step 3 — Semua query operasional tambahkan filter:**
```sql
-- Sebelum:
WHERE id_pegawai = $1 AND tanggal BETWEEN $2 AND $3
-- Sesudah:
WHERE id_pegawai = $1 AND tanggal BETWEEN $2 AND $3 AND is_archived = FALSE
```

**Step 4 (opsional, masa depan) — Buat tabel archive terpisah:**
```sql
CREATE TABLE absensi_archive (LIKE absensi INCLUDING ALL);
INSERT INTO absensi_archive SELECT * FROM absensi WHERE is_archived = TRUE;
DELETE FROM absensi WHERE is_archived = TRUE;
```

**Untuk ditambahkan ke `scheduler.py`:**
```python
def archive_old_absensi():
    """Archive absensi lebih dari 2 tahun — jalankan 1x/bulan, hari pertama"""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            UPDATE absensi SET is_archived = TRUE
            WHERE tanggal < (CURRENT_DATE - INTERVAL '2 years')
              AND is_archived = FALSE
        """))
        count = result.rowcount
        db.commit()
        if count > 0:
            logger.info(f"[Archive] Archived {count} old absensi records")
    except Exception as e:
        logger.error(f"[Archive] Error: {e}")
        db.rollback()
    finally:
        db.close()
```

---

### [ ] 2. Cleanup `roster_shift` BATAL/DIUBAH — PRIORITAS SEDANG

**Masalah:** Baris `status_roster IN ('BATAL', 'DIUBAH')` tidak pernah dihapus.
Setelah 1 tahun ada ratusan ribu baris stale.

**Solusi — Script cleanup (jalankan tiap 3 bulan):**
```sql
-- Hapus roster batal/diubah yang lebih dari 6 bulan
DELETE FROM roster_shift
WHERE status_roster IN ('BATAL', 'DIUBAH')
  AND tanggal_shift < (CURRENT_DATE - INTERVAL '6 months');

-- Cek sebelum hapus:
SELECT status_roster, COUNT(*), MIN(tanggal_shift), MAX(tanggal_shift)
FROM roster_shift
GROUP BY status_roster;
```

**Tambahkan ke `scheduler.py` (interval: monthly):**
```python
def cleanup_stale_roster():
    """Hapus roster BATAL/DIUBAH lebih dari 6 bulan — jalankan tiap 1 bulan"""
    db = SessionLocal()
    try:
        result = db.execute(text("""
            DELETE FROM roster_shift
            WHERE status_roster IN ('BATAL', 'DIUBAH')
              AND tanggal_shift < (CURRENT_DATE - INTERVAL '6 months')
        """))
        count = result.rowcount
        db.commit()
        if count > 0:
            logger.info(f"[Cleanup] Deleted {count} stale roster_shift rows")
    except Exception as e:
        logger.error(f"[Cleanup] Error: {e}")
        db.rollback()
    finally:
        db.close()
```

---

### [ ] 3. Retention `approval_pengajuan_absensi_log` — PRIORITAS SEDANG

**Masalah:** Audit log tidak ada retention. Setiap pengajuan menghasilkan 3–5 log.
Tidak ada yang membersihkan.

**Solusi — Retensi 1 tahun:**
```sql
-- Hapus log pengajuan yang sudah APPROVED/REJECTED/CANCELLED lebih dari 1 tahun
DELETE FROM approval_pengajuan_absensi_log
WHERE created_at < (NOW() - INTERVAL '1 year')
  AND pengajuan_id IN (
      SELECT id FROM approval_pengajuan_absensi
      WHERE status_pengajuan IN ('APPROVED', 'REJECTED', 'CANCELLED')
        AND diputuskan_pada < (NOW() - INTERVAL '1 year')
  );
```

**Catatan penting:** Jangan hapus log pengajuan yang masih PENDING atau baru diputuskan.
Hanya log dari pengajuan yang sudah final & lebih dari 1 tahun.

---

### [ ] 4. Archiving `penilaian_shift_absensi` — BISA IKUT `absensi`

Tumbuh beriringan dengan `absensi`. Solusinya sama — tambah `is_archived` flag dan
archive data > 2 tahun berbarengan dengan step archiving `absensi`.

```sql
ALTER TABLE penilaian_shift_absensi ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_penilaian_not_archived
    ON penilaian_shift_absensi(evaluated_at DESC)
    WHERE is_archived = FALSE;
```

---

### [ ] 5. Otomasi Backup Harian — PRIORITAS TINGGI

**Masalah:** Backup sudah terdokumentasi tapi manual. Risiko lupa.

**Solusi — Crontab di server 151 (DB server):**
```bash
# Edit crontab: crontab -e
# Backup setiap hari jam 02:00 WIB, simpan 30 hari terakhir
0 19 * * * docker exec attendance-db-postgres pg_dump -U sultan attendance_db \
  | gzip > /backup/attendance_$(date +\%Y\%m\%d).sql.gz \
  && find /backup -name "attendance_*.sql.gz" -mtime +30 -delete
```

**Verifikasi backup:**
```bash
# Cek ukuran backup terakhir
ls -lh /backup/attendance_*.sql.gz | tail -5

# Test restore ke database test (jangan ke production)
gunzip -c /backup/attendance_$(date +%Y%m%d).sql.gz \
  | psql -U sultan -d attendance_test
```

---

### [ ] 6. Autovacuum Tuning untuk Tabel Sibuk — PRIORITAS SEDANG

**Masalah:** `absensi` sering di-UPDATE (update `jam_keluar`). Dead tuples menumpuk
cepat dan query planner bisa salah memilih query plan.

**Tambahkan ke postgresql.conf di server 151:**
```
# Umum (uncomment dan sesuaikan)
shared_buffers = 1GB                   # 25% dari RAM jika 4GB
effective_cache_size = 3GB             # 75% dari RAM
work_mem = 32MB
random_page_cost = 1.5                 # Jika storage SSD

# Autovacuum agresif untuk tabel absensi
autovacuum_vacuum_scale_factor = 0.05  # Vacuum setiap 5% dead tuples (default: 20%)
autovacuum_analyze_scale_factor = 0.02 # Analyze setiap 2% (default: 10%)
```

**Atau set per-tabel (lebih presisi, tanpa restart postgres):**
```sql
-- Set autovacuum agresif khusus tabel absensi
ALTER TABLE absensi SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE penilaian_shift_absensi SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);
```

**Cek dead tuples saat ini:**
```sql
SELECT relname, n_dead_tup, n_live_tup,
       ROUND(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 1) AS dead_ratio_pct,
       last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
WHERE relname IN ('absensi', 'roster_shift', 'penilaian_shift_absensi', 'user_sessions')
ORDER BY n_dead_tup DESC;
```

---

### [ ] 7. Monitoring Ukuran Tabel — Rutin Bulanan

**Query untuk pantau pertumbuhan — jalankan tiap awal bulan:**
```sql
SELECT
    relname AS tabel,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS data_size,
    pg_size_pretty(pg_indexes_size(relid)) AS index_size,
    TO_CHAR(pg_total_relation_size(relid) / 1024.0 / 1024.0, 'FM999,990.00') AS total_mb
FROM pg_statio_user_tables
WHERE relname IN (
    'absensi', 'roster_shift', 'penilaian_shift_absensi',
    'user_sessions', 'approval_pengajuan_absensi_log',
    'approval_pengajuan_absensi', 'face_embeddings'
)
ORDER BY pg_total_relation_size(relid) DESC;
```

**Simpan hasil ini tiap bulan** untuk tracking tren pertumbuhan.

---

### [ ] 8. Partisi Tabel `absensi` by Year — MASA DEPAN (> 3 Tahun Data)

Ini hanya perlu dilakukan kalau data sudah melewati 1 juta baris dan query rekap tahunan
terasa lambat. Tidak urgent sekarang.

**Strategi migrasi kalau saatnya tiba:**
```sql
-- 1. Rename tabel lama
ALTER TABLE absensi RENAME TO absensi_old;

-- 2. Buat tabel baru dengan partisi by year
CREATE TABLE absensi (
    LIKE absensi_old INCLUDING DEFAULTS INCLUDING CONSTRAINTS
) PARTITION BY RANGE (tanggal);

-- 3. Buat partisi per tahun
CREATE TABLE absensi_2024 PARTITION OF absensi
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE absensi_2025 PARTITION OF absensi
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE absensi_2026 PARTITION OF absensi
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- 4. Migrate data
INSERT INTO absensi SELECT * FROM absensi_old;

-- 5. Buat index pada setiap partisi (otomatis inherit dari parent)
```

---

## Urutan Eksekusi

1. **Segera** → [ ] Task 5 (Otomasi backup) — risiko paling tinggi jika diabaikan
2. **Bulan ini** → [ ] Task 1 (Archive flag `absensi`) — ALTER TABLE, zero downtime
3. **Bulan ini** → [ ] Task 4 (Archive flag `penilaian`) — berbarengan dengan task 1
4. **Bulan ini** → [ ] Task 6 (Autovacuum tuning) — satu perintah SQL, tanpa restart
5. **Kuartal ini** → [ ] Task 2 (Cleanup roster BATAL)
6. **Kuartal ini** → [ ] Task 3 (Retention approval log)
7. **Setiap bulan** → [ ] Task 7 (Monitoring ukuran tabel)
8. **> 3 tahun data** → [ ] Task 8 (Partisi tabel)

---

---

## Integrasi ke `/system-settings`

### Kondisi Halaman Saat Ini

`SystemSettingsPage.jsx` (221 baris) sekarang hanya berisi **2 section**:
1. Slider Face Threshold (0.30–0.90)
2. Toggle Kunci Threshold

Halaman ini cocok dijadikan **pusat monitoring & maintenance** karena sudah ada
infrastrukturnya (SectionCard, alert system, akses super-admin only).

---

### Yang Sudah Bisa Langsung Dipanggil dari Frontend

| Aksi | Endpoint yang sudah ada | Keterangan |
|---|---|---|
| Cleanup session expired | `POST /user-sessions/cleanup-expired` | ✅ Ada, perlu tambah tombol UI |
| Lihat statistik session | `GET /user-sessions/stats` | ✅ Ada di `user_sessions.py` |

---

### Backend Endpoints yang Perlu Dibuat

Untuk mendukung monitoring di `/system-settings`, perlu tambah endpoint baru di backend.
Tambahkan ke file baru `backend/api/v1/endpoints/maintenance.py`:

```python
# GET /maintenance/db-stats
# Mengembalikan ukuran tabel + row count untuk monitoring bulanan
@router.get("/db-stats", dependencies=[Depends(require_permission(PermissionKeys.SUPER_ADMIN))])
def get_db_stats(db: Session = Depends(get_db)):
    result = db.execute(text("""
        SELECT
            relname AS tabel,
            n_live_tup AS baris_aktif,
            n_dead_tup AS baris_mati,
            pg_size_pretty(pg_total_relation_size(relid)) AS ukuran_total,
            last_autovacuum,
            last_autoanalyze
        FROM pg_stat_user_tables
        WHERE relname IN (
            'absensi', 'roster_shift', 'penilaian_shift_absensi',
            'user_sessions', 'approval_pengajuan_absensi_log',
            'approval_pengajuan_absensi', 'face_embeddings'
        )
        ORDER BY n_live_tup DESC
    """)).fetchall()
    ...

# POST /maintenance/cleanup-stale-roster
# Hapus roster BATAL/DIUBAH > 6 bulan
@router.post("/cleanup-stale-roster", ...)

# POST /maintenance/cleanup-approval-logs
# Hapus approval log dari pengajuan final > 1 tahun
@router.post("/cleanup-approval-logs", ...)

# POST /maintenance/archive-absensi
# Flag is_archived=TRUE untuk absensi > 2 tahun
@router.post("/archive-absensi", ...)

# GET /maintenance/scheduler-status
# Cek apakah APScheduler berjalan + kapan terakhir cleanup session
@router.get("/scheduler-status", ...)
```

---

### [ ] 9. Tambah Section "DB Maintenance" di `/system-settings`

**Tampilan yang direncanakan (3 sub-section baru):**

#### Section A — Statistik Tabel (Read-only, auto-refresh setiap kunjungan)
```
📊 Statistik Database

| Tabel                          | Baris Aktif | Ukuran Total | Last Vacuum |
|-------------------------------|-------------|--------------|-------------|
| absensi                       | 45,231      | 18 MB        | 2 jam lalu  |
| penilaian_shift_absensi       | 44,980      | 22 MB        | 2 jam lalu  |
| roster_shift                  | 31,240      | 8 MB         | kemarin     |
| approval_pengajuan_absensi_log| 1,840       | 512 KB       | 3 hari lalu |
| user_sessions                 | 98          | 128 KB       | 1 jam lalu  |
```

#### Section B — Cleanup Manual (Tombol dengan konfirmasi)
```
🧹 Cleanup & Archiving

[ 🗑 Cleanup Session Expired ]    → POST /user-sessions/cleanup-expired
[ 🗑 Cleanup Roster Batal/Diubah ] → POST /maintenance/cleanup-stale-roster
[ 🗑 Cleanup Approval Log Lama ]   → POST /maintenance/cleanup-approval-logs
[ 📦 Archive Absensi > 2 Tahun ]   → POST /maintenance/archive-absensi

Setiap tombol:
  - Tampilkan konfirmasi dialog sebelum eksekusi
  - Tampilkan hasil: "N baris dihapus / diarsipkan"
  - Catat waktu eksekusi terakhir (simpan di app_settings tabel)
```

#### Section C — Status Scheduler (Read-only)
```
⏱ Status Background Scheduler

Session Cleanup:  🟢 Aktif | Interval: 60 menit | Terakhir: 14 menit lalu
Archive Job:      🔴 Belum dikonfigurasi
```

---

### Urutan Implementasi Section Baru di `/system-settings`

1. **Backend dulu** — buat `maintenance.py` endpoint + register di `api/v1/__init__.py`
2. **Tambah permission** `maintenance.read` dan `maintenance.execute` ke DB
3. **Frontend** — tambah 3 SectionCard baru di `SystemSettingsPage.jsx`
4. **Test manual** — klik tiap tombol, verify log backend
5. **Build & deploy**

**Catatan penting:** Section ini hanya tampil untuk role `super-admin` dan `admin`.
Gunakan guard yang sama dengan yang sudah ada di halaman.

---

## Referensi

- `database/optimize.sql` — Index yang sudah dijalankan
- `backend/utils/scheduler.py` — Background job session cleanup
- `backend/config/settings.py` — `SESSION_EXPIRY_HOURS=24`, `SESSION_CLEANUP_INTERVAL_MINUTES=60`
- `database/DOCKER_DATABASE.md` — Cara backup manual
- `frontend/src/presentation/pages/admin/SystemSettingsPage.jsx` — 221 baris, siap diperluas
- `backend/api/v1/endpoints/user_sessions.py` — `POST /cleanup-expired` sudah ada
