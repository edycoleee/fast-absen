# Panduan Penggunaan Sistem Shift — Frontend

Dokumen ini menjelaskan langkah-langkah operasional melalui tampilan antarmuka (UI) untuk dua skenario umum penggunaan sistem shift.

---

## Referensi Panduan Input Form

Bagian ini menjelaskan seluruh field yang tersedia di setiap halaman input, beserta cara mengisinya dengan benar. Gunakan sebagai referensi cepat sebelum mengikuti use case.

---

### 1. Shift Kelompok

**Menu:** Sidebar → **Shift Kelompok** → klik **+ Tambah**

Form modal **Tambah / Edit Shift Kelompok** memiliki field berikut:

| Field | Wajib? | Cara Mengisi |
|---|:---:|---|
| **Kode** | ✅ | Kode unik kelompok, ditulis otomatis huruf kapital. Contoh: `PERAWAT-ICU`, `ADMIN-KANTOR`. Maksimal 50 karakter, tidak bisa sama dengan kelompok lain. |
| **Nama** | ✅ | Nama deskriptif kelompok. Contoh: `Perawat ICU Rotasi`, `Staf Administrasi Kantor`. Maksimal 100 karakter. |
| **Deskripsi** | — | Keterangan bebas, opsional. Berguna untuk audit/catatan internal. |
| **Shift Based** (toggle biru) | — | **ON** = kelompok ini adalah pegawai shift (pagi/siang/malam berganti). **OFF** = jam kerja tetap (non-shift, admin, kasir). Default: ON. |
| **Aktif** (toggle hijau) | — | **ON** = kelompok aktif digunakan. **OFF** = kelompok dinonaktifkan. Default: ON. |

**Alur:**
1. Klik **+ Tambah** → isi form → klik **Simpan**.
2. Untuk mengubah: klik **Edit** di baris tabel → ubah field → klik **Simpan**.
3. Untuk menghapus: klik **Hapus** di baris tabel → konfirmasi.

---

### 2. Shift Aturan

**Menu:** Sidebar → **Shift Aturan** → klik **+ Tambah**

Form modal **Tambah / Edit Aturan Shift** dibagi menjadi 5 seksi:

#### Seksi: Kelompok & Unit

| Field | Wajib? | Cara Mengisi |
|---|:---:|---|
| **Shift Kelompok** | ✅ | Pilih dari dropdown daftar kelompok yang sudah dibuat. Format tampilan: `KODE – Nama Kelompok`. |
| **Unit (opsional)** | — | Ketik nama unit di kotak pencarian lalu pilih. **Kosongkan** agar aturan berlaku untuk semua unit. Isi hanya jika unit ini punya kebijakan toleransi berbeda dari unit lainnya dalam kelompok yang sama. |

#### Seksi: Toleransi Waktu (menit)

| Field | Default | Cara Mengisi |
|---|---|---|
| **Grace Telat** | `10` | Menit toleransi keterlambatan masuk. Check-in dalam batas ini tidak dihitung terlambat. |
| **Tol. Pulang Cepat** | `0` | Menit toleransi pulang sebelum jam selesai. `0` = tidak ada toleransi sama sekali. |
| **Batas Lembur** | `0` | Minimum menit kelebihan jam selesai agar terhitung lembur. `0` = semua kelebihan dicatat. |
| **Window Mulai (−)** | `120` | Berapa menit sebelum jam_mulai sistem mulai mencari check-in. |
| **Window Selesai (+)** | `240` | Berapa menit setelah jam_selesai sistem masih mencari check-out. |
| **Maks Sesi/Hari** | `1` | Berapa sesi shift yang dievaluasi dalam 1 hari. Naikkan ke `2` jika ada split-shift atau on-call tambahan. |

#### Seksi: Jam Fleksibel Masuk (opsional)

| Field | Cara Mengisi |
|---|---|
| **Mulai** | Jam paling awal yang boleh check-in. Format `HH:MM`. **Hanya diisi untuk kelompok non-shift.** Kosongkan untuk kelompok shift berbasis roster. |
| **Sampai** | Batas jam masuk; lewat jam ini dihitung terlambat. Format `HH:MM`. Jika diisi, nilai Grace Telat **tidak dipakai**. |

> Untuk kelompok shift berbasis roster (perawat, dokter jaga, dll): **kosongkan kedua field ini**. Jam referensi sudah ada di kolom `jam_mulai` setiap baris roster.

#### Seksi: Periode Efektif

| Field | Wajib? | Cara Mengisi |
|---|:---:|---|
| **Mulai** | ✅ | Tanggal mulai berlakunya aturan ini. Default: hari ini. |
| **Selesai (opsional)** | — | Tanggal berakhirnya aturan. **Kosongkan** agar berlaku tanpa batas. Isi hanya untuk aturan sementara / pergantian kebijakan. |

#### Seksi: Konfigurasi

| Toggle | Cara Mengisi |
|---|---|
| **Lintas Tanggal** (ungu) | **ON** jika shift melewati tengah malam (contoh: mulai 21:00 selesai 07:00 keesokan hari). **OFF** untuk semua shift yang selesai di hari yang sama. |
| **Aktif** (hijau) | **ON** = aturan dipakai saat evaluasi. **OFF** = aturan diabaikan (gunakan ini untuk menonaktifkan tanpa menghapus). |

---

### 3. Shift Pegawai

**Menu:** Sidebar → **Shift Pegawai** → klik **+ Tambah Assignment**

Form modal **Tambah / Edit Assignment Shift** memiliki field berikut:

| Field | Wajib? | Cara Mengisi |
|---|:---:|---|
| **Pegawai** | ✅ | Ketik nama atau ID pegawai di kotak pencarian → pilih dari hasil dropdown. Pada mode **Edit**, field ini tidak bisa diubah (read-only). |
| **Shift Kelompok** | ✅ | Pilih dari dropdown. Format: `KODE – Nama Kelompok`. |
| **Periode Efektif → Mulai** | ✅ | Tanggal pegawai mulai masuk kelompok ini. Default: hari ini. |
| **Periode Efektif → Selesai** | — | Tanggal assignment berakhir. **Kosongkan** untuk penugasan permanen. Isi jika rotasi sementara. |
| **Catatan** | — | Keterangan bebas, misal: `Rotasi sementara ke ICU`, `Penugasan awal`. |
| **Jadikan Default** (toggle biru) | — | **ON** = kelompok ini adalah kelompok utama pegawai. Hanya 1 assignment aktif per pegawai yang boleh default. Selalu aktifkan untuk penugasan primer. |

> **Selain form manual**, halaman ini juga menyediakan:
> - Tombol **↓ Template Excel** → unduh template assignment massal.
> - Tombol **📂 Import Excel** → upload file Excel untuk input banyak pegawai sekaligus.

---

### 4. Roster Shift

**Menu:** Sidebar → **Roster Shift** → klik **+ Tambah Roster**

Form modal **Tambah / Edit Roster Shift** memiliki field berikut:

#### Pegawai & Kelompok

| Field | Wajib? | Cara Mengisi |
|---|:---:|---|
| **Pegawai** | ✅ | Ketik nama atau ID di kotak pencarian → pilih dari hasil. |
| **Shift Kelompok** | — | Pilih dari dropdown jika perlu mengikat baris roster ke kelompok tertentu. Boleh dikosongkan jika sudah ada assignment default. |
| **Unit** | — | Pilih unit/ruangan. Kosongkan jika tidak perlu membedakan unit. |

#### Jadwal

| Field | Wajib? | Cara Mengisi |
|---|:---:|---|
| **Tanggal Shift** | ✅ | Tanggal **dimulainya** shift. Format `YYYY-MM-DD`. Untuk shift malam cross-date, isi tanggal malam shift dimulai (bukan paginya). |
| **Jam Mulai** | ✅ | Format datetime-local: `YYYY-MM-DDTHH:mm`. Contoh: `2026-03-04T21:00`. |
| **Jam Selesai** | ✅ | Format datetime-local. Untuk shift malam cross-date, isi tanggal **keesokan harinya**. Contoh: `2026-03-05T07:00`. |

> **Penting untuk shift malam:** `Jam Selesai` harus diisi dengan tanggal keesokan hari secara eksplisit di form Roster Shift (input bertipe `datetime-local`, bukan hanya `time`). Berbeda dengan Excel batch upload yang hanya mengisi kolom `jam_selesai = 07:00` lalu sistem meng-handle cross-date otomatis via flag `is_lintas_tanggal`.

#### Klasifikasi

| Field | Cara Mengisi |
|---|---|
| **Jenis Shift** | Pilih salah satu: `PAGI` · `SORE` · `MALAM` · `ON_CALL` · `CUSTOM`. Bersifat label saja, tidak mempengaruhi evaluasi. |
| **Nomor Sesi** | Default `1`. Naikkan ke `2` jika pegawai punya 2 sesi shift di hari yang sama (split shift). |
| **Status Roster** | Pilih: `AKTIF` (default) · `BATAL` (shift dibatalkan) · `DIUBAH` (jadwal sudah dikoreksi). |

#### Override Toleransi (opsional)

| Field | Cara Mengisi |
|---|---|
| **Grace Telat Override (menit)** | Isi hanya jika baris roster ini butuh toleransi berbeda dari aturan kelompok. Misal: baris shift tertentu perlu grace 20 mnt karena ada rapat dulu. Kosongkan = pakai nilai dari Aturan Shift. |
| **Tol. Pulang Cepat Override (menit)** | Sama seperti di atas, untuk toleransi pulang cepat per baris roster. |

| Field | Cara Mengisi |
|---|---|
| **Catatan** | Keterangan opsional untuk baris roster ini. |

> **Kapan pakai Roster Shift manual vs Roster Upload Batch?**
> - **Roster Shift (manual)**: untuk koreksi 1–2 baris, penambahan satu sesi on-call mendadak, atau perubahan jadwal individual.
> - **Roster Upload Batch** (menu terpisah): untuk input roster bulanan massal via Excel. Cara ini jauh lebih efisien untuk satu bulan penuh.

---

## Use Case 1 — Staf Administrasi (Jam Kerja Tetap, Jam Pulang Berbeda per Hari)

**Skenario:** Pegawai administrasi masuk setiap hari kerja pukul **07:15**, namun jam pulang berbeda tergantung hari:

| Hari | Jam Masuk | Jam Pulang |
|---|---|---|
| Senin – Kamis | 07:15 | 12:00 |
| Jumat | 07:15 | 11:00 |
| Sabtu | 07:15 | 13:00 |

---

### Langkah 1 — Buat Shift Kelompok

**Menu:** Sidebar → **Shift Kelompok**

1. Klik tombol **+ Tambah**.
2. Isi form **Tambah Shift Kelompok**:

   | Field di Form | Nilai yang Diisi |
   |---|---|
   | **Kode** | `ADMIN-KANTOR` |
   | **Nama** | `Staf Administrasi Kantor` |
   | **Deskripsi** | `Pegawai admin dengan jam tetap 07:15, jam pulang berbeda per hari` |
   | **Shift Based** (toggle) | **Nonaktif** (abu-abu) — karena bukan rotasi shift |
   | **Aktif** (toggle) | **Aktif** (hijau) |

3. Klik **Simpan**.

> **Mengapa toggle "Shift Based" dimatikan?**
> Staf admin memiliki jam masuk tetap setiap hari — bukan rotasi pagi/siang/malam bergantian. Pilih non-shift (`is_shift_based = false`) agar sistem memperlakukannya sebagai jam kerja tetap.

---

### Langkah 2 — Buat Aturan Shift

**Menu:** Sidebar → **Shift Aturan**

1. Klik tombol **+ Tambah**.
2. Isi form **Tambah Aturan Shift**:

   **Bagian Kelompok & Unit**

   | Field di Form | Nilai yang Diisi |
   |---|---|
   | **Shift Kelompok** | Pilih `ADMIN-KANTOR – Staf Administrasi Kantor` dari dropdown |
   | **Unit (opsional)** | Kosongkan — aturan berlaku untuk semua unit |

   **Bagian Toleransi Waktu (menit)**

   | Field di Form | Nilai | Penjelasan |
   |---|---|---|
   | **Grace Telat** | `10` | Check-in sampai 07:25 masih dianggap tepat waktu |
   | **Tol. Pulang Cepat** | `5` | Boleh pulang maksimal 5 menit lebih awal dari jadwal |
   | **Batas Lembur** | `0` | Setiap kelebihan waktu sekecil apapun terhitung lembur |
   | **Window Mulai (−)** | `30` | Sistem mencari check-in mulai 30 menit sebelum jam masuk (mulai 06:45) |
   | **Window Selesai (+)** | `30` | Sistem mencari check-out sampai 30 menit setelah jam pulang |
   | **Maks Sesi/Hari** | `1` | Satu slot shift per hari |

   **Bagian Jam Fleksibel Masuk (opsional)**

   | Field di Form | Nilai |
   |---|---|
   | **Mulai** | Kosongkan |
   | **Sampai** | Kosongkan |

   > Jam masuk tetap di 07:15 — cukup andalkan *Grace Telat*. Jam fleksibel hanya diisi bila pegawai boleh datang dalam rentang waktu (misal bebas datang antara 08:00–09:00).

   **Bagian Periode Efektif**

   | Field di Form | Nilai |
   |---|---|
   | **Mulai** | `2026-02-23` (atau tanggal berlaku aturan ini) |
   | **Selesai (opsional)** | Kosongkan — berlaku tanpa batas waktu |

   **Bagian Konfigurasi**

   | Toggle | Status |
   |---|---|
   | **Lintas Tanggal** | **Nonaktif** — semua shift selesai di hari yang sama |
   | **Aktif** | **Aktif** |

3. Klik **Simpan**.

---

### Langkah 3 — Tugaskan Pegawai ke Kelompok

**Menu:** Sidebar → **Shift Pegawai**

1. Klik tombol **+ Tambah Assignment**.
2. Isi form:

   | Field di Form | Nilai yang Diisi |
   |---|---|
   | **Pegawai** | Ketik nama atau ID pegawai di kotak pencarian, lalu pilih dari hasil |
   | **Shift Kelompok** | Pilih `ADMIN-KANTOR – Staf Administrasi Kantor` |
   | **Mulai** | `2026-02-23` |
   | **Selesai** | Kosongkan — tidak ada batas waktu |
   | **Jadikan Default** | **Centang/Aktifkan** |
   | **Catatan** | `Staf TU - jam kerja tetap berbeda per hari` |

3. Klik **Simpan**.

> Lakukan langkah ini untuk setiap pegawai yang masuk kelompok ADMIN-KANTOR.

---

### Langkah 4 — Upload Roster Bulanan

**Menu:** Sidebar → **Roster Upload**

#### a) Download Template Excel

1. Klik tombol **Download Template** (pojok kanan atas).
2. File `roster_template.xlsx` akan terunduh.

#### b) Isi Template Excel

Isi setiap baris dengan jadwal harian pegawai. Karena jam pulang berbeda per hari, setiap hari perlu baris tersendiri:

| id_pegawai | tanggal_shift | jam_mulai | jam_selesai | jenis_shift |
|---|---|---|---|---|
| A001 | 2026-03-02 | 07:15 | 12:00 | PAGI |
| A001 | 2026-03-03 | 07:15 | 12:00 | PAGI |
| A001 | 2026-03-04 | 07:15 | 12:00 | PAGI |
| A001 | 2026-03-05 | 07:15 | 12:00 | PAGI |
| A001 | 2026-03-06 | 07:15 | 11:00 | PAGI |
| A001 | 2026-03-07 | 07:15 | 13:00 | PAGI |

> **Catatan:** Hari Minggu tidak perlu diisi. Pegawai tanpa baris roster di suatu tanggal tidak akan dievaluasi (tidak dianggap mangkir) untuk tanggal tersebut.

#### c) Upload File

1. Klik tombol **+ Upload Roster**.
2. Di dialog yang muncul:
   - Klik area upload / **Choose File** dan pilih file Excel yang sudah diisi.
   - Isi field **Uploaded By** jika diperlukan.
3. Klik **Import**.
4. Sistem akan menampilkan ringkasan hasil import (baris berhasil, baris gagal beserta alasannya).

---

### Langkah 5 — Jalankan Evaluasi Penilaian

**Menu:** Sidebar → **Penilaian Shift**

1. Klik tombol **Evaluate** (atau **+ Evaluate**).
2. Isi form evaluasi:

   | Field | Nilai |
   |---|---|
   | **Tanggal Mulai** | Tanggal awal periode yang ingin dievaluasi (misal `2026-03-01`) |
   | **Tanggal Selesai** | Tanggal akhir periode (misal `2026-03-31`) |
   | **Unit** | Kosongkan untuk semua unit, atau pilih unit tertentu |
   | **Pegawai** | Kosongkan untuk semua pegawai, atau pilih pegawai tertentu |
   | **Force Recalculate** | Centang jika ingin menimpa hasil evaluasi yang sudah ada |

3. Klik **Jalankan Evaluasi**.
4. Hasil evaluasi muncul di tabel halaman ini dengan status warna:
   - **Hijau** `TEPAT_WAKTU`
   - **Kuning** `TERLAMBAT`
   - **Oranye** `PULANG_CEPAT`
   - **Merah** `MANGKIR`

---

### Langkah 6 — Simulasi Absensi Satu Bulan (2 Karyawan, Maret 2026)

**Profil karyawan:**

| ID | Nama | Catatan |
|---|---|---|
| A001 | Budi Santoso | Disiplin, sesekali terlambat |
| A002 | Siti Rahayu | Sering terlambat dan kadang pulang cepat |

**Aturan yang berlaku:** Grace Telat 10 mnt · Tol. Pulang Cepat 5 mnt · Window 06:45–(jam_selesai+30 mnt)

> Batas tepat waktu masuk = 07:15 + 10 = **07:25**. Batas minimal pulang = jam_selesai − 5 mnt.

---

#### Roster Maret 2026 (pola berulang, Senin–Sabtu)

| Hari | Jam Masuk | Jam Pulang |
|---|---|---|
| Senin – Kamis | 07:15 | 12:00 |
| Jumat | 07:15 | 11:00 |
| Sabtu | 07:15 | 13:00 |
| Minggu | — | — |

Total hari kerja Maret 2026 (Senin–Sabtu, kecuali Minggu): **26 hari**

---

#### Simulasi Absensi — A001 (Budi Santoso)

| Tanggal | Hari | Roster | Check-in | Check-out | Status | Keterangan |
|---|---|---|---|---|---|---|
| 02/03 | Senin | 07:15–12:00 | 07:10 | 12:05 | `TEPAT_WAKTU` | Masuk sebelum jadwal |
| 03/03 | Selasa | 07:15–12:00 | 07:22 | 12:00 | `TEPAT_WAKTU` | Masuk dalam grace (07:22 ≤ 07:25) |
| 04/03 | Rabu | 07:15–12:00 | 07:05 | 12:10 | `TEPAT_WAKTU` | Masuk lebih awal, lembur 10 mnt dicatat |
| 05/03 | Kamis | 07:15–12:00 | 07:28 | 12:00 | `TERLAMBAT` | 07:28 > 07:25, **terlambat 3 mnt** |
| 06/03 | Jumat | 07:15–11:00 | 07:15 | 11:00 | `TEPAT_WAKTU` | Tepat jadwal |
| 07/03 | Sabtu | 07:15–13:00 | 07:12 | 13:05 | `TEPAT_WAKTU` | Lembur 5 mnt dicatat |
| 09/03 | Senin | 07:15–12:00 | — | — | `MANGKIR` | Tidak ada tap dalam window 06:45–12:30 |
| 10/03 | Selasa | 07:15–12:00 | 07:18 | 11:58 | `TEPAT_WAKTU` | Pulang 2 mnt sebelum jadwal, masih dalam toleransi (batas 11:55) |
| 12/03 | Kamis | 07:15–12:00 | 07:30 | 12:00 | `TERLAMBAT` | **Terlambat 5 mnt** |
| 13/03 | Jumat | 07:15–11:00 | 07:15 | 10:50 | `PULANG_CEPAT` | 10:50 < 10:55 (11:00−5), **pulang cepat 5 mnt** |
| 16/03 | Senin | 07:15–12:00 | 07:20 | 12:00 | `TEPAT_WAKTU` | |
| 19/03 | Kamis | 07:15–12:00 | 07:24 | 12:05 | `TEPAT_WAKTU` | |
| 20/03 | Jumat | 07:15–11:00 | 07:24 | 11:05 | `TEPAT_WAKTU` | |
| 27/03 | Jumat | 07:15–11:00 | 07:15 | 11:00 | `TEPAT_WAKTU` | |
| 31/03 | Selasa | 07:15–12:00 | 07:20 | 12:10 | `TEPAT_WAKTU` | Lembur 10 mnt dicatat |

*(11 hari tersisa di bulan ini semuanya `TEPAT_WAKTU`)*

**Rekap Bulanan A001:**

| Status | Jumlah Hari |
|---|---|
| `TEPAT_WAKTU` | 22 |
| `TERLAMBAT` | 2 |
| `PULANG_CEPAT` | 1 |
| `MANGKIR` | 1 |
| **Total Hari Roster** | **26** |

---

#### Simulasi Absensi — A002 (Siti Rahayu)

| Tanggal | Hari | Roster | Check-in | Check-out | Status | Keterangan |
|---|---|---|---|---|---|---|
| 02/03 | Senin | 07:15–12:00 | 07:30 | 12:00 | `TERLAMBAT` | **Terlambat 5 mnt** |
| 03/03 | Selasa | 07:15–12:00 | 07:27 | 12:00 | `TERLAMBAT` | **Terlambat 2 mnt** |
| 04/03 | Rabu | 07:15–12:00 | 07:10 | 11:45 | `PULANG_CEPAT` | 11:45 < 11:55 (12:00−5), **pulang cepat 10 mnt** |
| 05/03 | Kamis | 07:15–12:00 | 07:45 | 12:00 | `TERLAMBAT` | **Terlambat 20 mnt** |
| 06/03 | Jumat | 07:15–11:00 | 07:20 | 10:52 | `PULANG_CEPAT` | 10:52 < 10:55 (11:00−5), **pulang cepat 3 mnt** |
| 07/03 | Sabtu | 07:15–13:00 | 07:15 | 13:00 | `TEPAT_WAKTU` | |
| 09/03 | Senin | 07:15–12:00 | 07:58 | 12:00 | `TERLAMBAT` | **Terlambat 33 mnt** |
| 10/03 | Selasa | 07:15–12:00 | 07:20 | 12:00 | `TEPAT_WAKTU` | |
| 11/03 | Rabu | 07:15–12:00 | 07:26 | 12:00 | `TERLAMBAT` | **Terlambat 1 mnt** |
| 12/03 | Kamis | 07:15–12:00 | 07:15 | 11:48 | `PULANG_CEPAT` | 11:48 < 11:55, **pulang cepat 7 mnt** |
| 13/03 | Jumat | 07:15–11:00 | 07:18 | 11:00 | `TEPAT_WAKTU` | |
| 14/03 | Sabtu | 07:15–13:00 | — | — | `MANGKIR` | Tidak hadir |
| 16/03 | Senin | 07:15–12:00 | 07:35 | 12:00 | `TERLAMBAT` | **Terlambat 10 mnt** |
| 17/03 | Selasa | 07:15–12:00 | 07:22 | 11:50 | `PULANG_CEPAT` | 11:50 < 11:55, **pulang cepat 5 mnt** |
| 18/03 | Rabu | 07:15–12:00 | 07:15 | 12:05 | `TEPAT_WAKTU` | |
| 19/03 | Kamis | 07:15–12:00 | 07:28 | 12:00 | `TERLAMBAT` | **Terlambat 3 mnt** |
| 20/03 | Jumat | 07:15–11:00 | 07:24 | 11:00 | `TEPAT_WAKTU` | |
| 21/03 | Sabtu | 07:15–13:00 | 07:10 | 13:00 | `TEPAT_WAKTU` | |
| 23/03 | Senin | 07:15–12:00 | 07:30 | 12:00 | `TERLAMBAT` | **Terlambat 5 mnt** |
| 24/03 | Selasa | 07:15–12:00 | 07:20 | 12:00 | `TEPAT_WAKTU` | |
| 25/03 | Rabu | 07:15–12:00 | 07:15 | 12:00 | `TEPAT_WAKTU` | |
| 26/03 | Kamis | 07:15–12:00 | 07:40 | 12:00 | `TERLAMBAT` | **Terlambat 15 mnt** |
| 27/03 | Jumat | 07:15–11:00 | 07:15 | 10:53 | `PULANG_CEPAT` | 10:53 < 10:55, **pulang cepat 2 mnt** |
| 28/03 | Sabtu | 07:15–13:00 | 07:12 | 13:00 | `TEPAT_WAKTU` | |
| 30/03 | Senin | 07:15–12:00 | 07:22 | 12:00 | `TEPAT_WAKTU` | |
| 31/03 | Selasa | 07:15–12:00 | 07:15 | 12:00 | `TEPAT_WAKTU` | |

**Rekap Bulanan A002:**

| Status | Jumlah Hari |
|---|---|
| `TEPAT_WAKTU` | 11 |
| `TERLAMBAT` | 9 |
| `PULANG_CEPAT` | 5 |
| `MANGKIR` | 1 |
| **Total Hari Roster** | **26** |

---

#### Perbandingan Akhir Bulan (Maret 2026)

| Metrik | A001 – Budi | A002 – Siti |
|---|---|---|
| Total hari roster | 26 | 26 |
| Tepat Waktu | 22 (84,6%) | 11 (42,3%) |
| Terlambat | 2 (7,7%) | 9 (34,6%) |
| Pulang Cepat | 1 (3,8%) | 5 (19,2%) |
| Mangkir | 1 (3,8%) | 1 (3,8%) |
| Total menit terlambat | 8 mnt | 64 mnt |

> **Cara baca di UI:** Buka halaman **Penilaian Shift** → filter `Pegawai = A002` dan `Tanggal Mulai/Selesai = 2026-03-01 – 2026-03-31` → tabel menampilkan tiap baris roster beserta kolom `menit_telat` dan `menit_pulang_cepat` untuk keperluan rekap laporan.

---

### Ringkasan Konfigurasi Use Case 1

```
Halaman             Tindakan
─────────────────── ──────────────────────────────────────────────
Shift Kelompok      Buat: ADMIN-KANTOR, Shift Based = OFF
Shift Aturan        Buat: grace 10, tol.pulang 5, window ±30 mnt, Lintas Tanggal = OFF
Shift Pegawai       Assign pegawai → ADMIN-KANTOR, is_default = true
Roster Upload       Download template → isi jam_mulai 07:15, jam_selesai beda per hari → upload
Penilaian Shift     Evaluate per periode bulan
```

---

---

## Use Case 2 — Perawat Bangsal (3 Shift Rotasi: Pagi / Siang / Malam)

**Skenario:** Perawat bangsal bekerja dengan tiga jenis shift bergiliran:

| Jenis Shift | Jam Mulai | Jam Selesai | Lintas Tanggal? |
|---|---|---|:---:|
| Pagi | 07:00 | 14:00 | Tidak |
| Siang | 14:00 | 21:00 | Tidak |
| Malam | 21:00 | 07:00 (+1 hari) | **Ya** |

Karena ada shift malam yang melewati tengah malam, konfigurasi memerlukan `Lintas Tanggal = Aktif` dan window yang cukup besar.

---

### Langkah 1 — Buat Shift Kelompok

**Menu:** Sidebar → **Shift Kelompok**

1. Klik tombol **+ Tambah**.
2. Isi form **Tambah Shift Kelompok**:

   | Field di Form | Nilai yang Diisi |
   |---|---|
   | **Kode** | `PERAWAT-BANGSAL` |
   | **Nama** | `Perawat Bangsal Rotasi` |
   | **Deskripsi** | `Perawat rawat inap 3 shift: pagi 07-14, siang 14-21, malam 21-07` |
   | **Shift Based** (toggle) | **Aktif** (biru) — jadwal bergiliran berdasarkan roster |
   | **Aktif** (toggle) | **Aktif** (hijau) |

3. Klik **Simpan**.

> **Mengapa toggle "Shift Based" dinyalakan?**
> Perawat memiliki jadwal berbeda setiap hari bergantung giliran. Sistem perlu membaca jam mulai dan jam selesai dari setiap baris roster secara individual, bukan mengacu ke jam kantor tetap.

---

### Langkah 2 — Buat Aturan Shift

**Menu:** Sidebar → **Shift Aturan**

1. Klik tombol **+ Tambah**.
2. Isi form **Tambah Aturan Shift**:

   **Bagian Kelompok & Unit**

   | Field di Form | Nilai yang Diisi |
   |---|---|
   | **Shift Kelompok** | Pilih `PERAWAT-BANGSAL – Perawat Bangsal Rotasi` |
   | **Unit (opsional)** | Kosongkan — berlaku untuk semua unit/bangsal |

   **Bagian Toleransi Waktu (menit)**

   | Field di Form | Nilai | Penjelasan |
   |---|---|---|
   | **Grace Telat** | `15` | Serah terima pasien membutuhkan waktu — toleransi lebih longgar dari staf kantor |
   | **Tol. Pulang Cepat** | `10` | Perawat tidak bisa langsung pergi sebelum serah terima selesai |
   | **Batas Lembur** | `30` | Lembur baru dicatat jika kelebihan > 30 menit — hindari noise dari keterlambatan kecil di antrian absen |
   | **Window Mulai (−)** | `60` | Sistem mencari check-in dari 1 jam sebelum shift — perawat sering tiba lebih awal |
   | **Window Selesai (+)** | `120` | Sistem mencari check-out sampai 2 jam setelah jam selesai — penting untuk shift malam yang selesai 07:00 |
   | **Maks Sesi/Hari** | `1` | Satu shift per hari; ubah ke `2` jika ada on-call tambahan |

   **Bagian Jam Fleksibel Masuk (opsional)**

   | Field di Form | Nilai |
   |---|---|
   | **Mulai** | Kosongkan |
   | **Sampai** | Kosongkan |

   > Jam referensi untuk perawat sudah ada di setiap baris roster (`jam_mulai`). Jam fleksibel tidak diperlukan.

   **Bagian Periode Efektif**

   | Field di Form | Nilai |
   |---|---|
   | **Mulai** | `2026-03-01` (atau tanggal berlakunya aturan ini) |
   | **Selesai (opsional)** | Kosongkan — berlaku tanpa batas waktu |

   **Bagian Konfigurasi**

   | Toggle | Status | Penjelasan |
   |---|---|---|
   | **Lintas Tanggal** | **Aktif** (ungu) | **Wajib** karena shift malam mulai pukul 21:00 dan berakhir 07:00 keesokan harinya |
   | **Aktif** | **Aktif** (hijau) | |

   > **Mengapa Lintas Tanggal diaktifkan untuk semua shift, bukan hanya shift malam?**
   > Aturan ini berlaku di level kelompok, bukan per baris roster. Mengaktifkannya aman untuk shift pagi dan siang — window-nya jauh berakhir sebelum tengah malam sehingga tidak ada konflik. Namun untuk shift malam, flag ini **wajib ada** agar sistem memahami bahwa `jam_selesai = 07:00` berarti besok pagi, bukan hari yang sama.

3. Klik **Simpan**.

---

### Langkah 3 — Tugaskan Pegawai ke Kelompok

**Menu:** Sidebar → **Shift Pegawai**

1. Klik tombol **+ Tambah Assignment**.
2. Isi form:

   | Field di Form | Nilai yang Diisi |
   |---|---|
   | **Pegawai** | Ketik nama atau ID perawat di kotak pencarian, lalu pilih |
   | **Shift Kelompok** | Pilih `PERAWAT-BANGSAL – Perawat Bangsal Rotasi` |
   | **Mulai** | `2026-03-01` |
   | **Selesai** | Kosongkan — tidak ada batas waktu |
   | **Jadikan Default** | **Centang/Aktifkan** |
   | **Catatan** | `Perawat Bangsal Anggrek - rotasi 3 shift` |

3. Klik **Simpan**.

> Lakukan langkah ini untuk setiap perawat yang masuk kelompok PERAWAT-BANGSAL.

---

### Langkah 4 — Upload Roster Bulanan

**Menu:** Sidebar → **Roster Upload**

#### a) Download Template Excel

1. Klik tombol **Download Template**.
2. File `roster_template.xlsx` akan terunduh.

#### b) Isi Template Excel

Setiap baris mencerminkan satu sesi shift yang dijadwalkan untuk seorang perawat. Contoh satu minggu:

| id_pegawai | tanggal_shift | jam_mulai | jam_selesai | jenis_shift |
|---|---|---|---|---|
| P101 | 2026-03-02 | 07:00 | 14:00 | PAGI |
| P101 | 2026-03-03 | 14:00 | 21:00 | SIANG |
| P101 | 2026-03-04 | 21:00 | 07:00 | MALAM |
| P101 | 2026-03-05 | 21:00 | 07:00 | MALAM |
| P101 | 2026-03-06 | 07:00 | 14:00 | PAGI |
| P101 | 2026-03-08 | 14:00 | 21:00 | SIANG |

> **Aturan penting untuk baris shift malam:**
> - Kolom `tanggal_shift` diisi **tanggal shift dimulai** (contoh: `2026-03-04`), bukan tanggal selesai.
> - Kolom `jam_selesai` cukup diisi `07:00` — sistem secara otomatis memahami ini adalah 07:00 keesokan harinya karena `Lintas Tanggal` sudah diaktifkan di aturan kelompok.
> - Tanggal yang tidak ada barisnya (misal `2026-03-07`) = hari libur/off — tidak ada evaluasi untuk tanggal tersebut.

#### c) Upload File

1. Klik tombol **+ Upload Roster**.
2. Di dialog yang muncul:
   - Klik area upload / **Choose File** dan pilih file Excel yang telah diisi.
   - Isi field **Uploaded By** jika diperlukan.
3. Klik **Import**.
4. Sistem menampilkan ringkasan baris berhasil dan gagal.

---

### Langkah 5 — Jalankan Evaluasi Penilaian

**Menu:** Sidebar → **Penilaian Shift**

1. Klik tombol **Evaluate**.
2. Isi form evaluasi:

   | Field | Nilai |
   |---|---|
   | **Tanggal Mulai** | `2026-03-01` |
   | **Tanggal Selesai** | `2026-03-31` |
   | **Unit** | Kosongkan untuk semua bangsal, atau pilih bangsal tertentu (misal Anggrek) |
   | **Pegawai** | Kosongkan untuk semua perawat dalam kelompok, atau pilih individu tertentu |
   | **Force Recalculate** | Centang jika data sudah pernah dievaluasi dan ingin diperbarui |

3. Klik **Jalankan Evaluasi**.
4. Hasil tampil di tabel dengan kode warna:

   | Warna | Status | Keterangan |
   |---|---|---|
   | Hijau | `TEPAT_WAKTU` | Masuk dan pulang sesuai toleransi |
   | Kuning | `TERLAMBAT` | Check-in melewati batas grace (jam mulai + 15 mnt) |
   | Oranye | `PULANG_CEPAT` | Check-out lebih dari 10 menit sebelum jam selesai |
   | Merah | `MANGKIR` | Tidak ada data absensi sama sekali dalam window |
   | Merah muda | `TIDAK_ABSEN_MASUK` | Ada check-out tapi tidak ada check-in |
   | Merah muda | `TIDAK_ABSEN_PULANG` | Ada check-in tapi tidak ada check-out |

---

### Langkah 6 — Simulasi Absensi Satu Bulan (2 Perawat, Maret 2026)

**Profil perawat:**

| ID | Nama | Catatan |
|---|---|---|
| P101 | Dewi Lestari | Disiplin, satu kali tidak absen pulang |
| P102 | Ahmad Fauzi | Beberapa terlambat dan satu mangkir |

**Aturan yang berlaku:** Grace Telat 15 mnt · Tol. Pulang Cepat 10 mnt · Batas Lembur 30 mnt · Window −60/+120 mnt · Lintas Tanggal = ON

> Batas tepat waktu masuk = jam_mulai + 15 mnt. Batas minimal pulang = jam_selesai − 10 mnt.

---

#### Pola Rotasi Roster Maret 2026

**Legenda:** P = Pagi (07:00–14:00) · S = Siang (14:00–21:00) · M = Malam (21:00–07:00+1) · L = Libur/Off

| | 02 | 03 | 04 | 05 | 06 | 07 | 09 | 10 | 11 | 12 | 13 | 14 | 16 | 17 | 18 | 19 | 20 | 21 | 23 | 24 | 25 | 26 | 27 | 28 | 30 | 31 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **P101** | P | P | S | S | M | L | L | P | S | S | M | L | L | P | S | S | M | L | L | P | S | S | M | L | L | P |
| **P102** | S | S | M | L | L | P | P | S | M | L | L | P | S | S | M | L | L | P | S | S | M | L | L | P | S | S |

> Hari L = tidak ada roster → tidak dievaluasi. Kolom mewakili hari kerja Senin–Sabtu (Minggu dilewati).

Total hari roster per perawat: **19 hari kerja**, 7 hari libur/off.

---

#### Simulasi Absensi — P101 (Dewi Lestari)

| Tanggal | Roster | Check-in | Check-out | Status | Keterangan |
|---|---|---|---|---|---|
| 02/03 (Sen) | Pagi 07:00–14:00 | 06:50 | 14:05 | `TEPAT_WAKTU` | Datang 10 mnt lebih awal, lembur 5 mnt (< batas 30, tidak dicatat) |
| 03/03 (Sel) | Pagi 07:00–14:00 | 07:12 | 14:00 | `TEPAT_WAKTU` | Masuk dalam grace (≤ 07:15) |
| 04/03 (Rab) | Siang 14:00–21:00 | 13:45 | 21:10 | `TEPAT_WAKTU` | Datang 15 mnt sebelum shift, lembur 10 mnt (< 30, tidak dicatat) |
| 05/03 (Kam) | Siang 14:00–21:00 | 14:10 | 21:00 | `TEPAT_WAKTU` | Masuk dalam grace (≤ 14:15) |
| 06/03 (Jum) | **Malam 21:00–07:00+1** | 20:55 | 07:05 **(07/03)** | `TEPAT_WAKTU` | Cross-date: check-out 07:05 tgl 07/03 ada dalam window s.d. 09:00 (07/03) |
| 09/03 (Sen) | Pagi 07:00–14:00 | 07:08 | 14:00 | `TEPAT_WAKTU` | |
| 10/03 (Sel) | Siang 14:00–21:00 | 13:50 | 21:00 | `TEPAT_WAKTU` | |
| 11/03 (Rab) | Siang 14:00–21:00 | 14:20 | 21:00 | `TERLAMBAT` | 14:20 > 14:15, **terlambat 5 mnt** |
| 12/03 (Kam) | **Malam 21:00–07:00+1** | 21:00 | — | `TIDAK_ABSEN_PULANG` | Ada check-in, tapi tidak ada tap pulang dalam window s.d. 09:00 tgl 13/03 |
| 16/03 (Sen) | Pagi 07:00–14:00 | 07:00 | 14:00 | `TEPAT_WAKTU` | |
| 17/03 (Sel) | Siang 14:00–21:00 | 14:05 | 21:00 | `TEPAT_WAKTU` | |
| 18/03 (Rab) | Siang 14:00–21:00 | 14:00 | 20:48 | `PULANG_CEPAT` | 20:48 < 20:50 (21:00−10), **pulang cepat 2 mnt** |
| 19/03 (Kam) | **Malam 21:00–07:00+1** | 20:50 | 07:00 **(20/03)** | `TEPAT_WAKTU` | Datang 10 mnt sebelum shift, pulang tepat 07:00 |
| 23/03 (Sen) | Pagi 07:00–14:00 | 07:14 | 14:00 | `TEPAT_WAKTU` | |
| 24/03 (Sel) | Siang 14:00–21:00 | 14:00 | 21:05 | `TEPAT_WAKTU` | Lembur 5 mnt (< 30, tidak dicatat) |
| 25/03 (Rab) | Siang 14:00–21:00 | 14:12 | 21:00 | `TEPAT_WAKTU` | |
| 26/03 (Kam) | **Malam 21:00–07:00+1** | 21:05 | 07:15 **(27/03)** | `TEPAT_WAKTU` | Lembur 15 mnt (< 30, tidak dicatat) |
| 30/03 (Sen) | Pagi 07:00–14:00 | 07:10 | 14:00 | `TEPAT_WAKTU` | |
| 31/03 (Sel) | Pagi 07:00–14:00 | 07:00 | 14:35 | `TEPAT_WAKTU` | Lembur 35 mnt (**≥ 30 → dicatat 35 mnt lembur**) |

**Rekap Bulanan P101:**

| Status | Jumlah |
|---|---|
| `TEPAT_WAKTU` | 16 |
| `TERLAMBAT` | 1 |
| `PULANG_CEPAT` | 1 |
| `TIDAK_ABSEN_PULANG` | 1 |
| **Total Hari Roster** | **19** |
| Total menit lembur dicatat | 35 mnt (31/03) |

---

#### Simulasi Absensi — P102 (Ahmad Fauzi)

| Tanggal | Roster | Check-in | Check-out | Status | Keterangan |
|---|---|---|---|---|---|
| 02/03 (Sen) | Siang 14:00–21:00 | 13:55 | 21:00 | `TEPAT_WAKTU` | |
| 03/03 (Sel) | Siang 14:00–21:00 | 14:20 | 21:00 | `TERLAMBAT` | **Terlambat 5 mnt** |
| 04/03 (Rab) | **Malam 21:00–07:00+1** | 21:05 | 07:00 **(05/03)** | `TEPAT_WAKTU` | Masuk dalam grace (≤ 21:15) |
| 07/03 (Sab) | Pagi 07:00–14:00 | 07:00 | 14:00 | `TEPAT_WAKTU` | |
| 09/03 (Sen) | Siang 14:00–21:00 | 14:30 | 21:00 | `TERLAMBAT` | **Terlambat 15 mnt** |
| 10/03 (Sel) | Siang 14:00–21:00 | 14:10 | 21:00 | `TEPAT_WAKTU` | |
| 11/03 (Rab) | **Malam 21:00–07:00+1** | — | — | `MANGKIR` | Tidak ada tap dalam window 20:00 (11/03) – 09:00 (12/03) |
| 14/03 (Sab) | Pagi 07:00–14:00 | 07:30 | 14:00 | `TERLAMBAT` | **Terlambat 15 mnt** |
| 16/03 (Sen) | Siang 14:00–21:00 | 14:00 | 21:00 | `TEPAT_WAKTU` | |
| 17/03 (Sel) | Siang 14:00–21:00 | 14:05 | 20:45 | `PULANG_CEPAT` | 20:45 < 20:50 (21:00−10), **pulang cepat 5 mnt** |
| 18/03 (Rab) | **Malam 21:00–07:00+1** | 20:55 | 07:10 **(19/03)** | `TEPAT_WAKTU` | Check-out 07:10 masih dalam window s.d. 09:00 |
| 21/03 (Sab) | Pagi 07:00–14:00 | 07:15 | 14:00 | `TEPAT_WAKTU` | |
| 23/03 (Sen) | Siang 14:00–21:00 | 14:18 | 21:00 | `TERLAMBAT` | **Terlambat 3 mnt** |
| 24/03 (Sel) | Siang 14:00–21:00 | 14:00 | 21:00 | `TEPAT_WAKTU` | |
| 25/03 (Rab) | **Malam 21:00–07:00+1** | 21:10 | 07:00 **(26/03)** | `TEPAT_WAKTU` | Masuk dalam grace (≤ 21:15) |
| 28/03 (Sab) | Pagi 07:00–14:00 | 07:00 | 14:00 | `TEPAT_WAKTU` | |
| 30/03 (Sen) | Siang 14:00–21:00 | 14:05 | 21:40 | `TEPAT_WAKTU` | Lembur 40 mnt (**≥ 30 → dicatat 40 mnt lembur**) |
| 31/03 (Sel) | Siang 14:00–21:00 | 14:25 | 21:00 | `TERLAMBAT` | **Terlambat 10 mnt** |

*(1 hari libur tgl 05/03 dan 06/03 tidak ada roster → tidak muncul di tabel penilaian)*

**Rekap Bulanan P102:**

| Status | Jumlah |
|---|---|
| `TEPAT_WAKTU` | 12 |
| `TERLAMBAT` | 5 |
| `PULANG_CEPAT` | 1 |
| `MANGKIR` | 1 |
| **Total Hari Roster** | **19** |
| Total menit lembur dicatat | 40 mnt (30/03) |

---

#### Perbandingan Akhir Bulan (Maret 2026)

| Metrik | P101 – Dewi | P102 – Ahmad |
|---|---|---|
| Total hari roster | 19 | 19 |
| Tepat Waktu | 16 (84,2%) | 12 (63,2%) |
| Terlambat | 1 (5,3%) | 5 (26,3%) |
| Pulang Cepat | 1 (5,3%) | 1 (5,3%) |
| Tidak Absen Pulang | 1 (5,3%) | 0 |
| Mangkir | 0 | 1 (5,3%) |
| Lembur dicatat | 35 mnt | 40 mnt |
| Total menit terlambat | 5 mnt | 33 mnt |

> **Shift malam cross-date** terlihat nyata pada P101 tgl 06/03 (check-out 07:05 di hari 07/03) dan P102 tgl 04/03 (check-out 07:00 di hari 05/03) — keduanya tertangkap benar karena `Lintas Tanggal = ON` dan `Window Selesai = +120 mnt` memastikan sistem masih mencari check-out hingga pukul 09:00 pagi hari berikutnya.

---

### Ilustrasi Window Absensi per Jenis Shift

Dengan aturan **Window Mulai (−) = 60 mnt** dan **Window Selesai (+) = 120 mnt**:

```
Shift Pagi (07:00 – 14:00):
  Cari check-in  : 06:00 → 08:00 (disempurnakan sistem)
  Cari check-out : 12:00 → 16:00 (jam_selesai + 120 mnt)

Shift Siang (14:00 – 21:00):
  Cari check-in  : 13:00 → 15:00
  Cari check-out : 19:00 → 23:00

Shift Malam (21:00 – 07:00 keesokan hari):
  Cari check-in  : 20:00 (tgl N) → 22:00 (tgl N)
  Cari check-out : 07:00 (tgl N+1) → 09:00 (tgl N+1)
```

---

### Ringkasan Konfigurasi Use Case 2

```
Halaman             Tindakan
─────────────────── ──────────────────────────────────────────────
Shift Kelompok      Buat: PERAWAT-BANGSAL, Shift Based = ON
Shift Aturan        Buat: grace 15, tol.pulang 10, batas lembur 30,
                          window −60/+120, Lintas Tanggal = ON
Shift Pegawai       Assign setiap perawat → PERAWAT-BANGSAL, is_default = true
Roster Upload       Download template → isi 3 jenis shift (jam berbeda per hari) → upload
Penilaian Shift     Evaluate per periode bulan (per bangsal opsional)
```

---

## Perbandingan Singkat Kedua Use Case

| Aspek | Use Case 1 (Admin) | Use Case 2 (Perawat) |
|---|---|---|
| **Shift Based** | OFF (jam tetap) | ON (rotasi roster) |
| **Grace Telat** | 10 menit | 15 menit |
| **Tol. Pulang Cepat** | 5 menit | 10 menit |
| **Batas Lembur** | 0 menit (semua tercatat) | 30 menit (anti noise) |
| **Window Mulai** | −30 menit | −60 menit |
| **Window Selesai** | +30 menit | +120 menit |
| **Lintas Tanggal** | OFF | **ON** |
| **Jam Fleksibel** | Tidak dipakai | Tidak dipakai |
| **Roster** | jam_mulai tetap 07:15, jam_selesai beda per hari | jam_mulai & jam_selesai beda per hari & jenis shift |
