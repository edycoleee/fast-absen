# Panduan Sistem Shift - RSUD Sulfat

Dokumen ini menjelaskan konsep dan konfigurasi shift: mulai dari perbedaan tipe pegawai, struktur Shift Kelompok, hingga detail setiap field pada form Aturan Shift.

---

## 1. Varian Tipe Pegawai: Non-Shift vs Shift

Sistem membedakan dua tipe pegawai berdasarkan flag `is_shift_based` pada entitas **Shift Kelompok**.

### 1.1 Pegawai Shift (`is_shift_based = true`)

Pegawai yang jadwalnya ditentukan oleh **roster per hari**, dengan jam mulai dan jam selesai yang berbeda-beda tergantung giliran (pagi, sore, malam, on-call).

**Contoh:** Perawat ICU, dokter jaga, tenaga gizi.

Karakteristik:
- Jadwal di-upload via Excel → disimpan ke tabel `roster_shift`.
- Setiap baris roster mewakili 1 sesi shift (tanggal, jam mulai, jam selesai).
- Evaluasi absensi mengacu ke jam roster, bukan jam kantor tetap.
- Mendukung **shift lintas tanggal** (misal 19:00 — 07:00 keesokan harinya).
- Bisa ada **multi-sesi dalam 1 hari** (misal split shift atau on-call tambahan).

### 1.2 Pegawai Non-Shift (`is_shift_based = false`)

Pegawai dengan jam kerja tetap yang tidak berganti-ganti, atau jam kerja fleksibel dalam rentang resmi.

**Contoh:** Staf administrasi, kasir, apoteker reguler.

Karakteristik:
- Jam kerja cenderung tetap (misal 07:00–15:00 setiap hari kerja) atau fleksibel dalam `window` yang telah ditentukan.
- Tetap menggunakan struktur roster agar penilaian konsisten, namun jadwalnya statis/repetitif.
- Jika ada **fleksibilitas jam masuk**, rentang resmi dikonfigurasi lewat field `fleksibel_masuk_mulai` dan `fleksibel_masuk_sampai` pada Aturan Shift.
- Evaluasi telat/tidak masuk tetap dari perbandingan roster vs absensi aktual — **tidak disamaratakan** dengan pegawai shift.

> **Catatan:** Tipe ini ditentukan di level **Shift Kelompok**, bukan di level individu pegawai. Artinya semua anggota kelompok yang sama mengikuti aturan yang sama.

---

## 2. Shift Kelompok

**Shift Kelompok** adalah pengelompokan pegawai berdasarkan pola kerja dan aturan evaluasi yang sama. Ini adalah "mesin aturan" dasar sebelum jadwal dan absensi diproses.

### Endpoint
- `GET /api/v1/shift-kelompok/`
- `POST /api/v1/shift-kelompok/`
- `GET /api/v1/shift-kelompok/{id}`
- `PUT /api/v1/shift-kelompok/{id}`
- `DELETE /api/v1/shift-kelompok/{id}`

### Field Shift Kelompok

| Field | Tipe | Keterangan |
|---|---|---|
| `kode` | `string` (max 50) | Kode unik kelompok, misal `SHIFT-PERAWAT`, `ADMIN-UMUM` |
| `nama` | `string` (max 100) | Nama kelompok, misal `Perawat Shift`, `Staf Admin` |
| `deskripsi` | `string` opsional | Penjelasan tambahan |
| `is_shift_based` | `boolean` | `true` = pegawai shift (roster berganti); `false` = non-shift (jam tetap/fleksibel) |
| `is_active` | `boolean` | Status aktif kelompok |

### Contoh Payload `POST /api/v1/shift-kelompok/`

```json
{
  "kode": "SHIFT-PERAWAT",
  "nama": "Perawat Shift Rotasi",
  "deskripsi": "Perawat rawat inap dengan jadwal pagi/sore/malam",
  "is_shift_based": true,
  "is_active": true
}
```

```json
{
  "kode": "NON-SHIFT-ADMIN",
  "nama": "Staf Administrasi",
  "deskripsi": "Pegawai admin dengan jam kerja tetap 07:00-15:00",
  "is_shift_based": false,
  "is_active": true
}
```

### Relasi Shift Kelompok

```
ShiftKelompok
  │
  ├── ShiftKelompokAturan[]   ← aturan evaluasi (grace telat, window, dll.)
  ├── PegawaiShiftKelompok[]  ← daftar pegawai yang tergabung
  └── RosterShift[]           ← jadwal harian aktual
```

### Menugaskan Pegawai ke Kelompok (Assignment Shift)

**Assignment Shift** adalah rekaman bahwa seorang pegawai tertentu adalah anggota sebuah Shift Kelompok, untuk periode waktu tertentu. Satu pegawai bisa memiliki beberapa assignment (misalnya rotasi antar kelompok), tetapi hanya **satu yang berstatus default** pada satu waktu.

#### Endpoint
- `GET /api/v1/pegawai-shift-kelompok/`
- `POST /api/v1/pegawai-shift-kelompok/`
- `GET /api/v1/pegawai-shift-kelompok/{id}`
- `PUT /api/v1/pegawai-shift-kelompok/{id}`
- `DELETE /api/v1/pegawai-shift-kelompok/{id}`

---

#### Form: Tambah Assignment Shift — Penjelasan Setiap Field

| Field di Form | Field di Sistem | Keterangan |
|---|---|---|
| **Pegawai** | `id_pegawai` | *(required)* ID atau nama pegawai yang akan ditugaskan. Nilai yang dikirim ke API adalah `id_pegawai` (bukan nama). |
| **Shift Kelompok** | `shift_kelompok_id` | *(required)* Kelompok shift yang akan diikuti pegawai ini. |
| **Mulai** | `effective_start_date` | *(required)* Tanggal mulai berlakunya assignment. Sistem hanya akan mempertimbangkan assignment ini untuk roster/absensi pada tanggal ≥ nilai ini. Format: `YYYY-MM-DD`. |
| **Selesai** | `effective_end_date` | *(opsional)* Tanggal berakhirnya assignment. Jika dikosongkan, assignment berlaku tanpa batas waktu. Isi jika pegawai hanya sementara bergabung di kelompok ini (misal rotasi 3 bulan). |
| **Catatan** | `catatan` | *(opsional)* Keterangan bebas untuk keperluan audit, misal "Rotasi ke tim ICU" atau "Penggantian sementara cuti panjang". |
| **Jadikan Default** | `is_default` | Tandai `true` jika ini adalah kelompok utama pegawai. **Hanya satu assignment aktif per pegawai yang boleh bernilai `true`** pada satu waktu. Default digunakan sistem saat ada ambiguitas (misalnya roster tidak menyertakan `shift_kelompok_id` secara eksplisit). |

---

#### Aturan `is_default`

- Setiap pegawai sebaiknya memiliki tepat **1 assignment aktif** dengan `is_default = true`.
- Jika pegawai punya assignment lama yang belum di-close (`effective_end_date = null`) dan Anda membuat assignment baru sebagai default, pastikan menutup assignment lama dengan mengisi `effective_end_date`-nya terlebih dahulu.
- Jika tidak ada assignment default, sistem tidak dapat me-resolve kelompok aturan pegawai secara otomatis → evaluasi penilaian bisa gagal atau menggunakan aturan generik.

---

#### Contoh Payload `POST /api/v1/pegawai-shift-kelompok/`

**Penugasan tetap (tanpa batas waktu):**

```json
{
  "id_pegawai": "P001",
  "shift_kelompok_id": 3,
  "effective_start_date": "2026-03-01",
  "effective_end_date": null,
  "is_default": true,
  "catatan": "Penugasan awal masuk tim ICU"
}
```

**Penugasan sementara (rotasi 3 bulan):**

```json
{
  "id_pegawai": "P045",
  "shift_kelompok_id": 5,
  "effective_start_date": "2026-03-01",
  "effective_end_date": "2026-05-31",
  "is_default": false,
  "catatan": "Rotasi sementara ke unit poliklinik selama 3 bulan"
}
```

- `is_default = true` → kelompok ini yang dipakai jika ada ambiguitas penugasan.
- `effective_end_date = null` → tidak ada batas waktu (berlaku terus).

---

## 3. Shift Aturan (Shift Kelompok Aturan)

**Shift Aturan** menentukan *bagaimana sistem mengevaluasi* absensi aktual terhadap jadwal roster untuk kelompok tertentu. Satu Shift Kelompok bisa memiliki beberapa aturan dengan periode efektif berbeda, atau aturan berbeda per unit.

### Endpoint
- `GET /api/v1/shift-kelompok-aturan/`
- `POST /api/v1/shift-kelompok-aturan/`
- `GET /api/v1/shift-kelompok-aturan/{id}`
- `PUT /api/v1/shift-kelompok-aturan/{id}`
- `DELETE /api/v1/shift-kelompok-aturan/{id}`

---

### 3.1 Form: Tambah Aturan Shift — Penjelasan Detail Setiap Field

#### Ringkasan Cepat

| Field di Form | Fungsi Singkat | Wajib? | Default |
|---|---|:---:|:---:|
| **Shift Kelompok** | Kelompok mana yang aturan ini berlaku | ✅ | — |
| **Unit** | Batasi aturan ke unit tertentu saja; kosong = semua unit | — | Semua unit |
| **Grace Telat** | Menit toleransi terlambat masuk sebelum dihitung terlambat | — | 10 |
| **Tol. Pulang Cepat** | Menit toleransi pulang lebih awal sebelum dihitung pulang cepat | — | 0 |
| **Batas Lembur** | Minimum menit kelebihan jam selesai agar terhitung lembur | — | 0 |
| **Window Mulai (−)** | Seberapa jauh ke belakang sistem mencari data check-in | — | 120 |
| **Window Selesai (+)** | Seberapa jauh ke depan sistem mencari data check-out | — | 240 |
| **Maks Sesi/Hari** | Berapa shift yang bisa dievaluasi dalam 1 hari kalender | — | 1 |
| **Jam Fleksibel: Mulai** | Jam paling awal rentang masuk resmi (khusus non-shift) | — | — |
| **Jam Fleksibel: Sampai** | Jam paling akhir rentang masuk resmi; lewat ini = terlambat | — | — |
| **Periode Efektif: Mulai** | Tanggal aturan ini mulai berlaku | ✅ | Hari ini |
| **Periode Efektif: Selesai** | Tanggal aturan ini berhenti berlaku; kosong = tanpa batas | — | — |
| **Lintas Tanggal** | Aktifkan jika shift melewati tengah malam (mis. 21:00–07:00) | — | Mati |
| **Aktif** | Aturan dipakai dalam evaluasi hanya jika ini aktif | — | Aktif |

---

#### `Shift Kelompok` *(required)* — `shift_kelompok_id`

Kelompok shift yang akan dikenai aturan ini. Dipilih dari daftar Shift Kelompok yang sudah dibuat sebelumnya.

- **Wajib diisi.** Aturan tidak bisa berdiri sendiri tanpa kelompok induk.
- Satu kelompok boleh punya **banyak aturan**, selama masing-masing memiliki kombinasi `id_unit` dan `effective_start_date` yang berbeda.
- Saat evaluasi berjalan, sistem mencocokkan roster pegawai ke aturan yang paling spesifik dan paling mutakhir dari kelompok ini.

---

#### `Unit` *(opsional)* — `id_unit`

Membatasi aturan ini agar hanya berlaku untuk unit/ruangan tertentu.

- **Kosong ("Semua unit")** → aturan berlaku sebagai **default kelompok**. Dipakai oleh semua unit yang tidak punya aturan spesifik.
- **Diisi** → aturan hanya aktif untuk roster dari unit tersebut. Unit lain dalam kelompok yang sama tetap memakai aturan default (tanpa `id_unit`).

**Prioritas resolusi saat evaluasi:**
```
1. Cari aturan: shift_kelompok_id == X  AND  id_unit == unit_roster  AND  periode aktif
2. Jika tidak ada → fallback ke aturan: shift_kelompok_id == X  AND  id_unit IS NULL  AND  periode aktif
3. Jika tidak ada keduanya → evaluasi pakai nilai default sistem (grace 10, window 120/240)
```

**Kapan perlu aturan per unit?**
Contoh: Kelompok "Perawat Shift" berlaku di seluruh RS, tetapi unit ICU memiliki kebijakan grace telat lebih longgar (15 menit) karena serah terima pasien lebih kompleks. Buat dua aturan: satu tanpa `id_unit` (default semua unit, grace 10) dan satu khusus `id_unit = ICU` (grace 15).

---

#### `Grace Telat` — `grace_telat_menit` | Default: `10`

Batas toleransi keterlambatan masuk **setelah** `jam_mulai` shift, dalam menit. Keterlambatan dalam rentang ini tidak dicatat sebagai terlambat.

**Formula evaluasi:**
```
menit_telat = max(0, (checkin_aktual − jam_mulai) − grace_telat_menit)

Jika menit_telat > 0  →  status = TERLAMBAT
Jika menit_telat = 0  →  status = TEPAT_WAKTU (dari sisi masuk)
```

**Contoh dengan grace = 10:**

| Check-in | Jam Mulai | Selisih | Hasil |
|---|---|---|---|
| 07:05 | 07:00 | +5 menit | Tepat waktu (dalam grace) |
| 07:10 | 07:00 | +10 menit | Tepat waktu (batas grace) |
| 07:11 | 07:00 | +11 menit | **Terlambat 1 menit** |
| 07:30 | 07:00 | +30 menit | **Terlambat 20 menit** |

> **Catatan:** Nilai ini bisa di-override per baris roster menggunakan field `grace_telat_override_menit` di tabel `roster_shift`. Override di roster lebih prioritas dari aturan kelompok.

---

#### `Tol. Pulang Cepat` — `toleransi_pulang_cepat_menit` | Default: `0`

Batas toleransi check-out **sebelum** `jam_selesai` shift, dalam menit. Check-out dalam rentang ini tidak dicatat sebagai pulang cepat.

**Formula evaluasi:**
```
menit_pulang_cepat = max(0, (jam_selesai − checkout_aktual) − toleransi_pulang_cepat_menit)

Jika menit_pulang_cepat > 0  →  status = PULANG_CEPAT
```

**Contoh dengan toleransi = 5:**

| Check-out | Jam Selesai | Selisih | Hasil |
|---|---|---|---|
| 15:03 | 15:00 | +3 menit (lebih) | Tepat waktu |
| 14:57 | 15:00 | −3 menit (lebih awal) | Tepat waktu (dalam toleransi) |
| 14:54 | 15:00 | −6 menit (lebih awal) | **Pulang cepat 1 menit** |

> Default `0` artinya tidak ada toleransi sama sekali — check-out 1 menit sebelum jam selesai sudah dihitung pulang cepat. Untuk kelompok shift IGD/darurat, pertimbangkan memberi toleransi 5–10 menit.

---

#### `Batas Lembur` — `batas_lembur_menit` | Default: `0`

Minimum durasi kelebihan waktu di atas `jam_selesai` agar dicatat sebagai **lembur**. Kelebihan di bawah nilai ini diabaikan (dianggap selesai normal).

**Formula evaluasi:**
```
kelebihan = checkout_aktual − jam_selesai   (dalam menit)

Jika kelebihan >= batas_lembur_menit  →  menit_lembur = kelebihan
Jika kelebihan <  batas_lembur_menit  →  menit_lembur = 0 (tidak dihitung)
```

**Contoh dengan batas = 30:**

| Check-out | Jam Selesai | Kelebihan | Lembur Dicatat |
|---|---|---|---|
| 15:20 | 15:00 | 20 menit | 0 (di bawah batas) |
| 15:30 | 15:00 | 30 menit | **30 menit** |
| 16:00 | 15:00 | 60 menit | **60 menit** |

> Default `0` = setiap kelebihan sekecil apapun terhitung lembur. Naikkan nilainya untuk menghindari pencatatan lembur dari keterlambatan pulang yang tidak disengaja (misal antre absen).

---

#### `Window Mulai (−)` — `window_mulai_minus_menit` | Default: `120`

Berapa menit **sebelum** `jam_mulai` shift, sistem mulai mencari data check-in yang valid. Ini mendefinisikan batas kiri dari "jendela pencarian" absensi.

```
window_start = jam_mulai − window_mulai_minus_menit
```

**Contoh:**
- Shift mulai 07:00, Window Mulai = 120 → sistem cari check-in mulai **05:00**
- Shift mulai 14:00, Window Mulai = 60  → sistem cari check-in mulai **13:00**

**Kapan perlu dikecilkan?**
Jika dalam satu hari ada dua shift berurutan (misal pagi 07:00–15:00 dan sore 15:00–23:00), window yang terlalu besar bisa menyebabkan check-out shift pagi "tercuri" oleh shift sore. Kecilkan window agar tidak tumpang tindih dengan shift sebelumnya.

**Kapan perlu diperbesar?**
Jika pegawai sering check-in jauh sebelum shift dimulai (misal dokter yang hadir 3 jam sebelum jaga).

---

#### `Window Selesai (+)` — `window_selesai_plus_menit` | Default: `240`

Berapa menit **setelah** `jam_selesai` shift, sistem masih menganggap check-out sebagai milik shift tersebut. Ini mendefinisikan batas kanan dari "jendela pencarian" absensi.

```
window_end = jam_selesai + window_selesai_plus_menit
```

**Contoh:**
- Shift selesai 15:00, Window Selesai = 240 → sistem masih cari check-out sampai **19:00**
- Shift malam selesai 07:00, Window Selesai = 120 → sistem cari checkout sampai **09:00**

**Ilustrasi Lengkap Window:**
```
Shift pagi: 07:00 — 15:00
Window Mulai  (-120): batas kiri  = 05:00
Window Selesai (+240): batas kanan = 19:00

┌─────────────────────────────────────────────────────┐
│  05:00          07:00    15:00          19:00        │
│    │               │       │               │         │
│  [window_start]  [mulai] [selesai]   [window_end]   │
│    ←─ cari check-in ─→   ←── cari check-out ──→    │
└─────────────────────────────────────────────────────┘
```

Sistem memilih absensi yang paling dekat ke `jam_mulai` shift di antara semua kandidat dalam window.

> **Perhatian shift lintas tanggal:** Untuk shift malam (misal 21:00–07:00), jika `window_selesai_plus_menit` tidak cukup besar, check-out di pagi hari berikutnya bisa tidak tertangkap. Pastikan dikombinasikan dengan `is_lintas_tanggal = true`.

---

#### `Maks Sesi/Hari` — `maks_sesi_per_hari` | Default: `1`

Jumlah maksimal **entri roster** yang bisa dievaluasi untuk seorang pegawai pada satu tanggal kalender yang sama.

- **Nilai `1`** (default): Pegawai hanya punya satu slot shift per hari. Jika ada lebih dari 1 roster di tanggal yang sama, sistem hanya evaluasi 1 (terbaru atau terprioritaskan).
- **Nilai `2` atau lebih**: Pegawai bisa punya **split shift** atau **tambahan on-call** dalam 1 hari. Contoh: dokter jaga pagi (07:00–14:00) sekaligus on-call malam (20:00–24:00) di tanggal yang sama.

> Nilai ini adalah pembatas evaluasi, bukan pembatas input roster. Anda tetap bisa upload roster dengan 2+ sesi per pegawai per hari; field ini hanya menentukan berapa yang akan dievaluasi penilaiannya.

---

#### `Jam Fleksibel Masuk: Mulai & Sampai` — `fleksibel_masuk_mulai` / `fleksibel_masuk_sampai`

Pasangan field ini **hanya relevan untuk kelompok non-shift** (`is_shift_based = false`). Mendefinisikan rentang jam masuk yang sah sehingga check-in di mana saja dalam rentang ini tidak dihitung terlambat.

| Field | Keterangan |
|---|---|
| **Mulai** (`fleksibel_masuk_mulai`) | Jam paling awal yang masih dianggap "tepat waktu". Check-in sebelum jam ini dianggap terlalu awal tetapi tetap tidak terlambat. Format: `HH:MM`. |
| **Sampai** (`fleksibel_masuk_sampai`) | Jam batas akhir. Check-in **setelah** jam ini dihitung terlambat, terlepas dari nilai `grace_telat_menit`. Format: `HH:MM`. |

**Contoh:**
```
fleksibel_masuk_mulai = 08:00
fleksibel_masuk_sampai = 09:00

Check-in 07:45  →  Tepat waktu (sebelum mulai, tapi tidak dihitung terlambat)
Check-in 08:30  →  Tepat waktu (dalam rentang fleksibel)
Check-in 09:00  →  Tepat waktu (batas akhir)
Check-in 09:05  →  TERLAMBAT 5 menit
```

**Interaksi dengan `grace_telat_menit`:**
Jika `fleksibel_masuk_sampai` diisi, nilai `grace_telat_menit` **tidak digunakan** sebagai referensi keterlambatan — yang dipakai adalah `fleksibel_masuk_sampai`. Grace telat hanya relevan ketika kedua field ini **kosong**.

> Kosongkan kedua field ini untuk kelompok shift berbasis roster (pagi/sore/malam), karena jam referensi sudah ada di `jam_mulai` tiap baris roster.

---

#### `Periode Efektif: Mulai` *(required)* — `effective_start_date`

Tanggal mulai berlakunya aturan ini. Sistem hanya menggunakan aturan ini untuk mengevaluasi roster yang `tanggal_shift >= effective_start_date`.

- **Wajib diisi.** Tidak ada aturan yang berlaku tanpa tanggal mulai.
- Jika ada dua aturan dengan `id_unit` yang sama, sistem memilih yang `effective_start_date`-nya **paling baru** di antara yang sudah aktif pada tanggal roster.
- Nilai default di form adalah tanggal hari ini, tapi bisa diubah ke tanggal di masa depan untuk mempersiapkan perubahan kebijakan.

---

#### `Periode Efektif: Selesai` *(opsional)* — `effective_end_date`

Tanggal berakhirnya aturan. Aturan hanya dipertimbangkan jika `tanggal_shift <= effective_end_date`.

- **Kosong** = aturan berlaku tanpa batas waktu (paling umum).
- **Diisi** = aturan otomatis berhenti berlaku setelah tanggal ini, berguna untuk perubahan kebijakan musiman atau sementara.

**Skenario pergantian kebijakan tanpa hapus data lama:**
```
Aturan A: grace=10, mulai=2026-01-01, selesai=2026-06-30
Aturan B: grace=5,  mulai=2026-07-01, selesai=null

Roster tanggal 2026-05-15 → pakai Aturan A (grace 10)
Roster tanggal 2026-08-01 → pakai Aturan B (grace 5)
```

---

#### `Lintas Tanggal` — `is_lintas_tanggal` | Default: `false`

Tandai **aktif** jika shift ini melewati tengah malam (jam selesai di tanggal berikutnya).

**Kapan wajib diaktifkan:**
- Shift malam: mulai 21:00, selesai 07:00 keesokan harinya
- Shift dini hari: mulai 23:00, selesai 06:00
- On-call panjang yang melewati midnight

**Apa yang terjadi jika TIDAK diaktifkan untuk shift malam:**
Sistem menganggap `jam_selesai` ada di hari yang sama dengan `jam_mulai`. Check-out pukul 07:00 keesokan paginya akan jatuh di luar window → status evaluasi menjadi `TIDAK_ABSEN_PULANG` meskipun pegawai benar-benar hadir dan pulang.

**Apa yang terjadi jika DIAKTIFKAN:**
Sistem memahami bahwa `jam_selesai < jam_mulai` berarti selesai di hari berikutnya, dan window pencarian absensi disesuaikan melewati tengah malam.

> Untuk shift yang **seluruhnya berada di tanggal yang sama** (misal 07:00–15:00 atau 14:00–22:00), biarkan nilai ini `false`.

---

#### `Aktif` — `is_active` | Default: `true`

Menentukan apakah aturan ini diikutsertakan dalam proses evaluasi.

- **Aktif (`true`)**: Aturan dipakai saat `evaluate` berjalan, selama periode efektifnya sesuai.
- **Nonaktif (`false`)**: Aturan diabaikan sepenuhnya oleh engine evaluasi, meskipun periode efektifnya masih berlaku.

**Kapan perlu dinonaktifkan (bukan dihapus):**
- Aturan lama yang sudah digantikan tetapi perlu dipertahankan sebagai catatan historis.
- Aturan percobaan/draft yang belum siap diterapkan ke produksi.
- Suspend sementara aturan unit tertentu tanpa mengubah `effective_end_date`.

> Menghapus aturan akan menghilangkan jejak audit. Lebih aman nonaktifkan jika aturan pernah dipakai untuk data real.

---

### 3.2 Contoh Payload `POST /api/v1/shift-kelompok-aturan/`

**Aturan untuk shift malam perawat ICU (lintas tanggal):**

```json
{
  "shift_kelompok_id": 1,
  "id_unit": 5,
  "grace_telat_menit": 15,
  "toleransi_pulang_cepat_menit": 10,
  "batas_lembur_menit": 30,
  "window_mulai_minus_menit": 60,
  "window_selesai_plus_menit": 120,
  "maks_sesi_per_hari": 1,
  "fleksibel_masuk_mulai": null,
  "fleksibel_masuk_sampai": null,
  "is_lintas_tanggal": true,
  "is_active": true,
  "effective_start_date": "2026-03-01",
  "effective_end_date": null
}
```

**Aturan untuk staf admin non-shift dengan jam fleksibel:**

```json
{
  "shift_kelompok_id": 4,
  "id_unit": null,
  "grace_telat_menit": 0,
  "toleransi_pulang_cepat_menit": 0,
  "batas_lembur_menit": 0,
  "window_mulai_minus_menit": 30,
  "window_selesai_plus_menit": 60,
  "maks_sesi_per_hari": 1,
  "fleksibel_masuk_mulai": "08:00:00",
  "fleksibel_masuk_sampai": "09:00:00",
  "is_lintas_tanggal": false,
  "is_active": true,
  "effective_start_date": "2026-02-23",
  "effective_end_date": null
}
```

---

### 3.3 Use Case: Staf Admin Jam Kerja Tetap Berbeda Per Hari

**Skenario:** Pegawai administrasi masuk setiap hari dengan jam kerja yang berbeda tergantung hari:

| Hari | Jam Masuk | Jam Pulang | Durasi |
|---|---|---|---|
| Senin – Kamis | 07:15 | 12:00 | 4 jam 45 menit |
| Jumat | 07:15 | 11:00 | 3 jam 45 menit |
| Sabtu | 07:15 | 13:00 | 5 jam 45 menit |

Karena jam masuk selalu sama (07:15) tapi jam pulang berbeda per hari, konfigurasi yang tepat:
- **Shift Kelompok**: `is_shift_based = false` (non-shift, bukan rotasi)
- **Aturan Shift**: satu aturan global untuk toleransi dan window
- **Roster**: masing-masing hari di-upload dengan `jam_selesai` yang berbeda

---

#### Langkah 1 — Buat Shift Kelompok

`POST /api/v1/shift-kelompok/`

```json
{
  "kode": "ADMIN-KANTOR",
  "nama": "Staf Administrasi Kantor",
  "deskripsi": "Pegawai admin dengan jam tetap 07:15, jam pulang berbeda per hari",
  "is_shift_based": false,
  "is_active": true
}
```

---

#### Langkah 2 — Buat Aturan Shift

`POST /api/v1/shift-kelompok-aturan/`

```json
{
  "shift_kelompok_id": 1,
  "id_unit": null,
  "grace_telat_menit": 10,
  "toleransi_pulang_cepat_menit": 5,
  "batas_lembur_menit": 0,
  "window_mulai_minus_menit": 30,
  "window_selesai_plus_menit": 30,
  "maks_sesi_per_hari": 1,
  "fleksibel_masuk_mulai": null,
  "fleksibel_masuk_sampai": null,
  "is_lintas_tanggal": false,
  "is_active": true,
  "effective_start_date": "2026-02-23",
  "effective_end_date": null
}
```

**Penjelasan pilihan nilai:**

| Field | Nilai | Alasan |
|---|---|---|
| `grace_telat_menit` | `10` | Toleransi 10 menit → check-in sampai 07:25 masih tepat waktu |
| `toleransi_pulang_cepat_menit` | `5` | Boleh pulang 5 menit lebih awal dari jadwal |
| `batas_lembur_menit` | `0` | Setiap kelebihan waktu terhitung lembur |
| `window_mulai_minus_menit` | `30` | Cari check-in dari 06:45 (30 menit sebelum 07:15) |
| `window_selesai_plus_menit` | `30` | Cari check-out sampai 30 menit setelah jam pulang |
| `fleksibel_masuk_mulai/sampai` | `null` | Tidak diisi — jam masuk tetap 07:15, gunakan `grace_telat` saja |
| `is_lintas_tanggal` | `false` | Semua shift selesai di hari yang sama |

> **Kapan pakai `fleksibel_masuk` vs `grace_telat`?**
> - `grace_telat`: jam masuk **tetap** di satu waktu, tapi ada toleransi beberapa menit setelahnya. **(cocok untuk kasus ini)**
> - `fleksibel_masuk`: jam masuk boleh **dalam rentang**, misal boleh datang antara 07:00–08:00. Tidak ada satu titik acuan tetap.

---

#### Langkah 3 — Tugaskan Pegawai ke Kelompok

`POST /api/v1/pegawai-shift-kelompok/`

```json
{
  "id_pegawai": "A001",
  "shift_kelompok_id": 1,
  "effective_start_date": "2026-02-23",
  "effective_end_date": null,
  "is_default": true,
  "catatan": "Staf TU - jam kerja tetap berbeda per hari"
}
```

---

#### Langkah 4 — Upload Roster Bulanan

Roster untuk pegawai ini berbeda `jam_selesai`-nya tergantung hari. Contoh isi kolom Excel untuk **minggu pertama Maret 2026**:

| id_pegawai | tanggal_shift | jam_mulai | jam_selesai | jenis_shift |
|---|---|---|---|---|
| A001 | 2026-03-02 (Senin) | 07:15 | 12:00 | PAGI |
| A001 | 2026-03-03 (Selasa) | 07:15 | 12:00 | PAGI |
| A001 | 2026-03-04 (Rabu) | 07:15 | 12:00 | PAGI |
| A001 | 2026-03-05 (Kamis) | 07:15 | 12:00 | PAGI |
| A001 | 2026-03-06 (Jumat) | 07:15 | 11:00 | PAGI |
| A001 | 2026-03-07 (Sabtu) | 07:15 | 13:00 | PAGI |

Upload via:
```
GET  /api/v1/roster-upload-batch/template/download
POST /api/v1/roster-upload-batch/import
```

> Hari Minggu tidak ada baris roster → sistem tidak akan mengevaluasi absensi hari Minggu untuk pegawai ini. Ini sudah sesuai — pegawai yang tidak punya roster di tanggal tertentu tidak dievaluasi, bukan dianggap mangkir.

---

#### Langkah 5 — Contoh Evaluasi Harian

Setelah `POST /penilaian-shift-absensi/evaluate` dijalankan:

**Hari Senin (roster: 07:15–12:00, grace=10, tol.pulang=5):**

| Check-in | Check-out | Status | Keterangan |
|---|---|---|---|
| 07:10 | 12:05 | `TEPAT_WAKTU` | Masuk sebelum jadwal, pulang sesuai |
| 07:20 | 11:58 | `TEPAT_WAKTU` | Masuk masih dalam grace (07:15+10=07:25), pulang dalam toleransi (12:00-5=11:55) |
| 07:26 | 12:00 | `TERLAMBAT` | Masuk melebihi batas grace (07:15+10=07:25) |
| 07:15 | 11:50 | `PULANG_CEPAT` | Pulang lebih dari 5 menit sebelum 12:00 |
| — | — | `MANGKIR` | Tidak ada check-in maupun check-out dalam window 06:45–12:30 |

**Hari Jumat (roster: 07:15–11:00, aturan sama):**

| Check-in | Check-out | Status |
|---|---|---|
| 07:20 | 11:05 | `TEPAT_WAKTU` |
| 07:20 | 10:52 | `PULANG_CEPAT` (3 menit dari batas toleransi 11:00-5=10:55) |
| 07:30 | 11:00 | `TERLAMBAT` (lewat grace 07:25) |

---

#### Ringkasan Konfigurasi Use Case Ini

```
Shift Kelompok : ADMIN-KANTOR (is_shift_based=false)
Aturan         : grace 10 menit, tol.pulang 5 menit, window ±30 menit
Roster         : per hari, jam_mulai tetap 07:15, jam_selesai beda per hari
Assignment     : A001 → ADMIN-KANTOR, mulai 2026-02-23, is_default=true
```

---

### 3.4 Use Case: Perawat Bangsal — 3 Shift Rotasi (Pagi / Siang / Malam)

**Skenario:** Perawat bangsal bekerja dengan 3 jenis shift bergilir:

| Jenis Shift | Jam Mulai | Jam Selesai | Lintas Tanggal? |
|---|---|---|:---:|
| Pagi | 07:00 | 14:00 | Tidak |
| Siang | 14:00 | 21:00 | Tidak |
| Malam | 21:00 | 07:00 (+1 hari) | **Ya** |

Karena ada shift malam yang melewati tengah malam, konfigurasi memerlukan perhatian khusus pada `is_lintas_tanggal` dan ukuran window. Shift pagi dan siang bisa memakai 1 aturan yang sama; shift malam perlu aturan terpisah atau aturan yang mencakup ketiganya dengan window yang cukup besar.

**Strategi yang disarankan:** Buat **1 Shift Kelompok** dengan **2 Aturan**:
- Aturan A (default semua shift): berlaku untuk pagi & siang
- Aturan B (override shift malam): `is_lintas_tanggal = true`, window lebih besar

> Karena sistem memilih aturan berdasarkan `id_unit` bukan berdasarkan jenis shift, cara paling praktis adalah membuat **1 aturan yang cukup longgar** untuk menangkap semua skenario, lalu gunakan `grace_telat_override` per baris roster jika butuh pengecualian individual.

Untuk use case ini, kita pakai **1 aturan universal** yang aman untuk ketiga shift:

---

#### Langkah 1 — Buat Shift Kelompok

`POST /api/v1/shift-kelompok/`

```json
{
  "kode": "PERAWAT-BANGSAL",
  "nama": "Perawat Bangsal Rotasi",
  "deskripsi": "Perawat rawat inap 3 shift: pagi 07-14, siang 14-21, malam 21-07",
  "is_shift_based": true,
  "is_active": true
}
```

---

#### Langkah 2 — Buat Aturan Shift

`POST /api/v1/shift-kelompok-aturan/`

```json
{
  "shift_kelompok_id": 2,
  "id_unit": null,
  "grace_telat_menit": 15,
  "toleransi_pulang_cepat_menit": 10,
  "batas_lembur_menit": 30,
  "window_mulai_minus_menit": 60,
  "window_selesai_plus_menit": 120,
  "maks_sesi_per_hari": 1,
  "fleksibel_masuk_mulai": null,
  "fleksibel_masuk_sampai": null,
  "is_lintas_tanggal": true,
  "is_active": true,
  "effective_start_date": "2026-03-01",
  "effective_end_date": null
}
```

**Penjelasan pilihan nilai:**

| Field | Nilai | Alasan |
|---|---|---|
| `grace_telat_menit` | `15` | Serah terima pasien antar shift perlu waktu — toleransi lebih longgar dari admin |
| `toleransi_pulang_cepat_menit` | `10` | Perawat tidak bisa langsung pulang jika serah terima belum selesai; toleransi cukup besar |
| `batas_lembur_menit` | `30` | Lembur baru dicatat jika > 30 menit setelah jam selesai, hindari noise |
| `window_mulai_minus_menit` | `60` | Cari check-in dari 1 jam sebelum shift — perawat kadang datang jauh sebelum giliran |
| `window_selesai_plus_menit` | `120` | Cari check-out sampai 2 jam setelah jam selesai — terutama penting untuk shift malam yang selesai 07:00 |
| `is_lintas_tanggal` | `true` | **Wajib** karena shift malam mulai 21:00 dan selesai 07:00 keesokan harinya |
| `maks_sesi_per_hari` | `1` | Normalnya 1 shift per hari; naikkan ke 2 jika ada on-call tambahan |

> **Mengapa `is_lintas_tanggal = true` untuk semua, bukan hanya shift malam?**
> Aturan ini berlaku di level kelompok, bukan per baris roster. Mengaktifkan `is_lintas_tanggal` untuk seluruh kelompok aman untuk shift pagi dan siang — sistem tetap bekerja benar karena window-nya selesai jauh sebelum tengah malam. Yang penting: shift malam **harus** mendapat flag ini agar tidak salah hitung.

---

#### Langkah 3 — Tugaskan Pegawai ke Kelompok

`POST /api/v1/pegawai-shift-kelompok/`

```json
{
  "id_pegawai": "P101",
  "shift_kelompok_id": 2,
  "effective_start_date": "2026-03-01",
  "effective_end_date": null,
  "is_default": true,
  "catatan": "Perawat Bangsal Anggrek - rotasi 3 shift"
}
```

---

#### Langkah 4 — Upload Roster Bulanan

Setiap baris roster mencerminkan satu sesi shift yang dijadwalkan. Contoh isi Excel untuk satu perawat dalam satu minggu:

| id_pegawai | tanggal_shift | jam_mulai | jam_selesai | jenis_shift |
|---|---|---|---|---|
| P101 | 2026-03-02 | 07:00 | 14:00 | PAGI |
| P101 | 2026-03-03 | 14:00 | 21:00 | SIANG |
| P101 | 2026-03-04 | 21:00 | 07:00 | MALAM |
| P101 | 2026-03-05 | 21:00 | 07:00 | MALAM |
| P101 | 2026-03-06 | 07:00 | 14:00 | PAGI |
| P101 | 2026-03-08 | 14:00 | 21:00 | SIANG |

> **Catatan penting untuk baris shift malam:**
> - `tanggal_shift` diisi dengan **tanggal shift dimulai** (misal 2026-03-04), bukan tanggal selesai.
> - `jam_selesai` diisi `07:00` — sistem akan memahami ini sebagai 07:00 keesokan harinya karena `is_lintas_tanggal = true`.
> - Tanggal 2026-03-07 kosong = libur perawat ini, tidak dievaluasi.

---

#### Langkah 5 — Contoh Evaluasi Per Jenis Shift

**Shift Pagi (roster: 07:00–14:00, grace=15, tol.pulang=10):**

| Check-in | Check-out | Status | Keterangan |
|---|---|---|---|
| 06:50 | 14:05 | `TEPAT_WAKTU` | Check-in 10 mnt sebelum shift, check-out sesuai |
| 07:10 | 14:00 | `TEPAT_WAKTU` | Masuk dalam grace 15 mnt (batas 07:15), check-out tepat |
| 07:16 | 14:00 | `TERLAMBAT` | Ke dalam grace batas 07:15, lewat 1 menit |
| 07:00 | 13:52 | `PULANG_CEPAT` | Pulang 8 mnt lebih awal, masih dalam toleransi 10 mnt |
| 07:00 | 13:49 | `PULANG_CEPAT` | Pulang 11 mnt lebih awal, melebihi toleransi 10 mnt |

**Shift Siang (roster: 14:00–21:00, aturan sama):**

| Check-in | Check-out | Status | Keterangan |
|---|---|---|---|
| 13:30 | 21:15 | `TEPAT_WAKTU` | Datang 30 mnt lebih awal (dalam window 60 mnt), lembur 15 mnt (< batas 30, tidak dicatat) |
| 14:10 | 21:00 | `TEPAT_WAKTU` | Masuk dalam grace 15 mnt |
| 14:20 | 21:45 | `TERLAMBAT` | Masuk melebihi grace; lembur 45 mnt > 30 → dicatat 45 mnt |
| — | 21:00 | `TIDAK_ABSEN_MASUK` | Ada check-out tapi tidak ada check-in dalam window 13:00–23:00 |

**Shift Malam (roster: 21:00–07:00 keesokan hari, lintas tanggal):**

```
tanggal_shift = 2026-03-04
jam_mulai     = 21:00 (2026-03-04)
jam_selesai   = 07:00 (2026-03-05) ← sistem hitung +1 hari karena is_lintas_tanggal=true

window_start  = 21:00 - 60 mnt  = 20:00 (2026-03-04)
window_end    = 07:00 + 120 mnt = 09:00 (2026-03-05)
```

| Check-in | Check-out | Status | Keterangan |
|---|---|---|---|
| 20:50 (tgl 4) | 07:15 (tgl 5) | `TEPAT_WAKTU` | Check-in 10 mnt sebelum shift, check-out 15 mnt setelah selesai (lembur < 30 mnt, tidak dicatat) |
| 20:55 (tgl 4) | 06:55 (tgl 5) | `TEPAT_WAKTU` | Pulang 5 mnt lebih awal, dalam toleransi 10 mnt |
| 21:20 (tgl 4) | 07:00 (tgl 5) | `TERLAMBAT` | Masuk 20 mnt dari 21:00, melebihi grace 15 mnt → terlambat 5 mnt |
| 21:00 (tgl 4) | — | `TIDAK_ABSEN_PULANG` | Ada check-in tapi tidak ada check-out dalam window s.d. 09:00 tgl 5 |
| — | — | `MANGKIR` | Tidak ada check-in maupun check-out dalam window 20:00 tgl 4 – 09:00 tgl 5 |

---

#### Ringkasan Konfigurasi Use Case Ini

```
Shift Kelompok : PERAWAT-BANGSAL (is_shift_based=true)
Aturan         : grace 15 mnt, tol.pulang 10 mnt, batas lembur 30 mnt
                 window -60/+120 mnt, is_lintas_tanggal=true
Roster         : 3 jenis shift per baris, tanggal_shift = tanggal mulai
Assignment     : P101 → PERAWAT-BANGSAL, mulai 2026-03-01, is_default=true
```

---

### 3.5 Best Practice: Roster Berulang untuk Pegawai Non-Shift

**Masalah:** Pegawai non-shift seperti staf admin memiliki jadwal yang **sama setiap minggu** — senin–kamis 07:15–12:00, jumat 07:15–11:00, sabtu 07:15–13:00. Mengisi ulang Excel setiap bulan secara manual lambat dan rawan salah.

**Kenyataan sistem saat ini:** Sistem tidak menyimpan "template berulang" otomatis — roster tetap harus di-upload per periode (bulan). Namun, proses bisa dibuat sangat efisien dengan strategi berikut.

---

#### Opsi A: Template Excel Master per Kelompok *(Paling Praktis)*

Buat satu file Excel master untuk setiap kelompok non-shift. File ini berisi **pola satu minggu lengkap** dengan formula Excel untuk mengisi tanggal bulan berikutnya secara semi-otomatis.

**Struktur file `template_admin_kantor.xlsx`:**

| id_pegawai | nama_pegawai | hari | jam_mulai | jam_selesai | jenis_shift |
|---|---|---|---|---|---|
| A001 | Budi | Senin | 07:15 | 12:00 | PAGI |
| A001 | Budi | Selasa | 07:15 | 12:00 | PAGI |
| A001 | Budi | Rabu | 07:15 | 12:00 | PAGI |
| A001 | Budi | Kamis | 07:15 | 12:00 | PAGI |
| A001 | Budi | Jumat | 07:15 | 11:00 | PAGI |
| A001 | Budi | Sabtu | 07:15 | 13:00 | PAGI |
| A002 | Sari | Senin | 07:15 | 12:00 | PAGI |
| ... | ... | ... | ... | ... | ... |

**Saat upload bulanan (H-7 sebelum bulan baru):**
1. Buka file master.
2. Jalankan macro/formula untuk generate kolom `tanggal_shift` sesuai bulan target.
3. Hapus baris hari libur nasional.
4. Upload ke `POST /roster-upload-batch/import`.

**Keuntungan:** File master tidak perlu diubah selama kebijakan jam kerja tidak berubah. Yang berubah hanya tanggal setiap bulan.

---

#### Opsi B: Script Generator Roster (Python) *(Disarankan untuk Volume Besar)*

Buat script Python sekali pakai yang membaca pola pegawai dan menghasilkan file Excel roster bulanan secara otomatis.

**Simpan di `backend/scripts/generate_roster_non_shift.py`:**

```python
"""
Generator Roster Bulanan - Pegawai Non-Shift
Jalankan: python scripts/generate_roster_non_shift.py --bulan 2026-03
"""
import argparse
import calendar
from datetime import date, timedelta
import openpyxl

# Pola jadwal per hari (0=Senin, 1=Selasa, ..., 5=Sabtu, 6=Minggu)
POLA_JADWAL = {
    0: ("07:15", "12:00"),  # Senin
    1: ("07:15", "12:00"),  # Selasa
    2: ("07:15", "12:00"),  # Rabu
    3: ("07:15", "12:00"),  # Kamis
    4: ("07:15", "11:00"),  # Jumat
    5: ("07:15", "13:00"),  # Sabtu
    6: None,                # Minggu - libur
}

# Daftar pegawai non-shift
PEGAWAI = [
    {"id_pegawai": "A001", "nama": "Budi Santoso"},
    {"id_pegawai": "A002", "nama": "Sari Wulandari"},
    {"id_pegawai": "A003", "nama": "Hendra Wijaya"},
]

# Hari libur nasional (isi manual atau ambil dari API)
LIBUR_NASIONAL = [
    date(2026, 3, 9),   # Contoh: Hari Raya Nyepi
]

def generate_roster(tahun: int, bulan: int, output_file: str):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Roster"
    ws.append(["id_pegawai", "nama_pegawai", "tanggal_shift",
                "jam_mulai", "jam_selesai", "jenis_shift"])

    jumlah_hari = calendar.monthrange(tahun, bulan)[1]
    rows = 0
    for pegawai in PEGAWAI:
        for hari_ke in range(1, jumlah_hari + 1):
            tgl = date(tahun, bulan, hari_ke)
            if tgl in LIBUR_NASIONAL:
                continue
            pola = POLA_JADWAL.get(tgl.weekday())
            if pola is None:
                continue  # Minggu / libur
            jam_mulai, jam_selesai = pola
            ws.append([
                pegawai["id_pegawai"],
                pegawai["nama"],
                tgl.strftime("%Y-%m-%d"),
                jam_mulai,
                jam_selesai,
                "PAGI",
            ])
            rows += 1

    wb.save(output_file)
    print(f"✅ Generated {rows} baris roster → {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--bulan", required=True, help="Format: YYYY-MM, contoh: 2026-03")
    args = parser.parse_args()
    tahun, bulan = map(int, args.bulan.split("-"))
    output = f"roster_admin_{tahun}_{bulan:02d}.xlsx"
    generate_roster(tahun, bulan, output)
```

**Cara pakai setiap bulan:**
```bash
# Generate roster Maret 2026
python scripts/generate_roster_non_shift.py --bulan 2026-03

# Upload hasilnya
# (bisa langsung curl atau via UI)
```

**Tambahan yang perlu disesuaikan:**
- Tambah `LIBUR_NASIONAL` setiap tahun sekali.
- Jika ada pegawai dengan jadwal berbeda (misal Kepala TU punya jam berbeda), buat `POLA_JADWAL` tersendiri per pegawai atau per unit.
- Jika ada cuti pegawai individual, hapus baris tersebut dari Excel sebelum upload, atau tangani via approval pengajuan absensi setelah upload.

---

#### Opsi C: Upload Setahun Penuh di Awal Tahun *(Untuk Jadwal yang Sangat Stabil)*

Jika kebijakan jam kerja non-shift **tidak pernah berubah sepanjang tahun**, Anda bisa generate dan upload roster untuk **12 bulan sekaligus** di awal tahun, lalu cukup koreksi pengecualian (libur, cuti panjang) sepanjang tahun berjalan.

**Pro:**
- Tidak perlu ingat upload bulanan.
- Roster selalu tersedia untuk kebutuhan laporan/KPI jauh ke depan.

**Kontra:**
- Jika ada perubahan kebijakan jam kerja di tengah tahun, harus hapus-ulang roster yang sudah ada.
- Perlu manajemen cutoff yang jelas agar roster tidak bisa diubah setelah tanggal berlalu.

**Rekomendasi:** Lakukan ini **hanya untuk kelompok non-shift yang benar-benar stabil** (staf tetap, jam tidak pernah berubah). Untuk kelompok yang kadang ada perubahan kebijakan, tetap upload bulanan agar lebih mudah dikontrol.

---

#### Perbandingan Strategi

| Strategi | Frekuensi Kerja | Cocok Untuk | Risiko |
|---|---|---|---|
| **Template Excel Manual** | Bulanan (< 10 menit) | Tim kecil, < 20 pegawai non-shift | Human error saat isi tanggal |
| **Script Python Generator** | Bulanan (1 command) | Tim besar, > 20 pegawai, atau banyak kelompok | Perlu maintenance script jika pola berubah |
| **Upload Setahun Penuh** | Tahunan (1x) | Jadwal sangat stabil, tidak berubah | Sulit koreksi jika kebijakan berubah di tengah jalan |

---

#### SOP yang Disarankan untuk Non-Shift

```
Tiap awal bulan (H-7 sebelum bulan baru):

1. Jalankan script generator (atau buka template Excel master)
2. Tandai/hapus baris hari libur nasional bulan bersangkutan
3. Tandai/hapus baris pegawai yang sudah approve cuti panjang
4. Upload via POST /roster-upload-batch/import
5. Verifikasi hasil import: cek jumlah baris valid vs invalid
6. Simpan file Excel hasil generate sebagai arsip bulan tersebut

Jika ada perubahan mendadak (cuti tiba-tiba, masuk menggantikan):
→ Gunakan alur Approval Pengajuan Absensi untuk koreksi individual
→ JANGAN edit roster yang sudah berjalan tanpa approval
```

---

#### Catatan: Kapan Cukup Pakai Grace Telat vs Perlu Fleksibel Masuk

Untuk non-shift dengan jam masuk tetap (07:15 setiap hari), **cukup gunakan `grace_telat_menit`** — tidak perlu mengisi `fleksibel_masuk`:

| Kondisi | Rekomendasi |
|---|---|
| Jam masuk tetap satu titik (07:15), boleh telat beberapa menit | Gunakan `grace_telat_menit = 10` saja |
| Jam masuk boleh dalam rentang (misal 07:00–09:00, terserah pilih sendiri) | Isi `fleksibel_masuk_mulai=07:00` + `fleksibel_masuk_sampai=09:00` |
| Jam masuk tetap, ada perbedaan per unit (unit A 07:00, unit B 08:00) | Buat 2 aturan dengan `id_unit` berbeda, `grace_telat` sama |

---

## 4. Alur Lengkap: Dari Setup ke Evaluasi

```
1. Buat Shift Kelompok
   POST /shift-kelompok/
   (tentukan is_shift_based)

2. Tambah Aturan Shift
   POST /shift-kelompok-aturan/
   (grace, window, lintas tanggal, periode efektif)

3. Tugaskan Pegawai ke Kelompok
   POST /pegawai-shift-kelompok/
   (id_pegawai + shift_kelompok_id + periode)

4. Upload Roster Bulanan (Excel)
   GET  /roster-upload-batch/template/download
   POST /roster-upload-batch/import

5. Jalankan Evaluasi Otomatis
   POST /penilaian-shift-absensi/evaluate
   { "start_date": "2026-03-01", "end_date": "2026-03-31", "id_unit": 5 }

6. Pantau Hasil
   GET /stats/kpi/unit-role
   GET /penilaian-shift-absensi/
```

---

## 5. Status Hasil Evaluasi

| Status | Kondisi |
|---|---|
| `TEPAT_WAKTU` | Check-in dalam toleransi grace, check-out tidak lebih awal dari toleransi |
| `TERLAMBAT` | Check-in melebihi `jam_mulai + grace_telat_menit` |
| `PULANG_CEPAT` | Check-out lebih awal dari `jam_selesai - toleransi_pulang_cepat_menit` |
| `TIDAK_ABSEN_MASUK` | Ada checkout tapi tidak ada check-in dalam window |
| `TIDAK_ABSEN_PULANG` | Ada check-in tapi tidak ada checkout dalam window |
| `MANGKIR` | Tidak ada check-in maupun checkout dalam window shift |
| `TIDAK_DIHITUNG` | Entry manual untuk sesi yang dikecualikan dari perhitungan |

---

## 6. Override Manual

Jika penilaian otomatis perlu dikoreksi (misal: pegawai check-in fisik tapi device error), gunakan alur **Approval Pengajuan Absensi**:

1. Pegawai ajukan koreksi → `POST /approval-pengajuan-absensi/`
2. Atasan setujui → `POST /approval-pengajuan-absensi/{id}/decision`
3. Sistem update penilaian dengan `is_manual_override = true`

Data dengan `is_manual_override = true` **tidak akan ditimpa** oleh evaluasi otomatis berikutnya kecuali menggunakan `force_recalculate = true`.

---




## 7. Referensi

- [ADMIN_GUIDE.md](ADMIN_GUIDE.md)
- [API_ENDPOINTS.md](API_ENDPOINTS.md)
- [KAUNIT_GUIDE.md](KAUNIT_GUIDE.md)

Last updated: 23 Februari 2026
