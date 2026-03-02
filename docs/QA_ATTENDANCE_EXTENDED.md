# QA Test Lanjutan — Fungsi Absensi, Roster, Penilaian, Approval & Override

> Dokumen ini merupakan lanjutan dari `QA_FRONTEND_TEST_PLAN.md`.  
> Fokus: pengujian mendalam pada alur inti sistem absensi RSUD Sulfat.  
> Versi: 1.0 | Format: **ID Test — Langkah Pengujian — Ekspektasi Hasil**

---

## Daftar Isi

1. [Absensi – Check-In Mendalam](#1-absensi--check-in-mendalam)
2. [Absensi – Check-Out Mendalam](#2-absensi--check-out-mendalam)
3. [Absensi – Status Hari Ini & Today Dashboard](#3-absensi--status-hari-ini--today-dashboard)
4. [Absensi – Riwayat & Ringkasan User](#4-absensi--riwayat--ringkasan-user)
5. [Absensi – Statistik Harian](#5-absensi--statistik-harian)
6. [Absensi – Admin CRUD & Filter](#6-absensi--admin-crud--filter)
7. [Roster – Kamus Kode Shift](#7-roster--kamus-kode-shift)
8. [Roster – Kamus Pola Shift](#8-roster--kamus-pola-shift)
9. [Roster – Upload Batch Excel](#9-roster--upload-batch-excel)
10. [Roster – Manual Entry & Edit Roster Shift](#10-roster--manual-entry--edit-roster-shift)
11. [Penilaian Shift Absensi – Evaluasi Otomatis](#11-penilaian-shift-absensi--evaluasi-otomatis)
12. [Penilaian Shift Absensi – Override Manual](#12-penilaian-shift-absensi--override-manual)
13. [Approval Pengajuan – Alur User](#13-approval-pengajuan--alur-user)
14. [Approval Pengajuan – Alur Atasan/Ka-Unit](#14-approval-pengajuan--alur-atasanka-unit)
15. [Approval Pengajuan – Super Admin Override](#15-approval-pengajuan--super-admin-override)
16. [Admin Override Absensi](#16-admin-override-absensi)
17. [IP Whitelist – Integrasi Check-In](#17-ip-whitelist--integrasi-check-in)
18. [Skenario Negatif & Edge Case](#18-skenario-negatif--edge-case)

---

## 1. Absensi – Check-In Mendalam

**Prasyarat:** Login sebagai `user` aktif yang belum absen hari ini.

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| CI-01 | Check-in status HADIR | 1. Buka halaman Absensi Dashboard<br>2. Pilih status **HADIR**<br>3. Klik **Check-In Sekarang** | • Muncul notifikasi sukses "Check-in berhasil"<br>• Kartu "Status Hari Ini" berubah menjadi ✅ Sudah<br>• Jam masuk tercatat (jam_masuk tidak null) |
| CI-02 | Check-in status IZIN dengan keterangan | 1. Pilih status **IZIN**<br>2. Isi kolom Keterangan "Izin urusan keluarga"<br>3. Klik Check-In | • Berhasil tercatat dengan status IZIN<br>• Keterangan tersimpan |
| CI-03 | Check-in status SAKIT dengan keterangan | 1. Pilih **SAKIT**<br>2. Isi Keterangan "Demam"<br>3. Klik Check-In | • Tercatat status SAKIT + keterangan |
| CI-04 | Check-in status TERLAMBAT dengan keterangan | 1. Pilih **TERLAMBAT**<br>2. Isi Keterangan<br>3. Klik Check-In | • Tercatat status TERLAMBAT |
| CI-05 | Check-in status CUTI dengan keterangan | 1. Pilih **CUTI**<br>2. Isi Keterangan "Cuti tahunan"<br>3. Klik Check-In | • Tercatat status CUTI |
| CI-06 | Check-in IZIN tanpa keterangan (validasi frontend) | 1. Pilih **IZIN**<br>2. Kosongkan Keterangan<br>3. Klik Check-In | • Tombol tidak bisa diklik ATAU muncul pesan error "Keterangan wajib diisi" |
| CI-07 | Check-in SAKIT tanpa keterangan | Sama dengan CI-06, pilih SAKIT | • Validasi frontend mencegah submit |
| CI-08 | Check-in ALPHA (tanpa keterangan) | 1. Pilih **ALPHA**<br>2. Klik Check-In | • Kolom keterangan tidak muncul<br>• Berhasil check-in status ALPHA |
| CI-09 | Duplikat check-in hari yang sama | 1. Setelah CI-01 berhasil<br>2. Refresh halaman<br>3. Coba klik Check-In lagi | • Tombol Check-In tidak tampil ATAU muncul pesan error "Sudah check-in hari ini" |
| CI-10 | IP tidak di whitelist | 1. Admin tambahkan IP whitelist aktif (IP berbeda dari client)<br>2. User coba check-in | • Muncul pesan error "Absen Gagal, Anda wajib absen di lingkungan Rumah Sakit" |
| CI-11 | Whitelist kosong = tidak ada pembatasan | 1. Admin hapus semua entri IP whitelist<br>2. User check-in dari IP apapun | • Check-in berhasil |
| CI-12 | Verifikasi IP tersimpan di kartu info | Setelah CI-01<br>2. Cek kartu "Informasi Perangkat & Session" | • Kolom **IP Address** menampilkan IP asli (bukan N/A) |

---

## 2. Absensi – Check-Out Mendalam

**Prasyarat:** User sudah check-in hari ini (jam_masuk tidak null, jam_keluar null).

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| CO-01 | Check-out normal | 1. Buka Dashboard setelah check-in<br>2. Klik **Check-Out Sekarang** | • Notifikasi sukses "Check-out berhasil"<br>• Kartu Check-Out berubah ✅ Sudah<br>• Jam keluar tercatat |
| CO-02 | Check-out tidak muncul sebelum check-in | 1. Login sebagai user yang belum absen<br>2. Lihat dashboard | • Tombol Check-Out tidak tampil |
| CO-03 | Tombol Check-Out hilang setelah check-out | 1. Setelah CO-01<br>2. Refresh halaman | • Tombol Check-Out tidak muncul<br>• Muncul pesan "Anda sudah menyelesaikan absensi hari ini" |
| CO-04 | Verifikasi urutan jam | Setelah CO-01, lihat kartu jam masuk & jam keluar | • jam_keluar > jam_masuk |
| CO-05 | IP tersimpan saat check-out (opsional) | Admin cek tabel absensi via panel admin | • ip_address tersimpan di record absensi |

---

## 3. Absensi – Status Hari Ini & Today Dashboard

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| TD-01 | Tampilan sebelum check-in | Login saat belum ada absensi hari ini | • has_checked_in = false<br>• Kartu Check-In = ⏳ Belum<br>• Kartu Check-Out = ⏳ (tidak bisa) |
| TD-02 | Tampilan setelah check-in | Setelah CI-01 berhasil | • has_checked_in = true<br>• can_check_out = true<br>• completed_today = false |
| TD-03 | Tampilan setelah check-out | Setelah CO-01 berhasil | • completed_today = true<br>• can_check_in = true (bisa isi ulang)<br>• Pesan informasi tampil |
| TD-04 | Status badge warna sesuai | Check-in dengan berbagai status | • HADIR = hijau, IZIN = biru, SAKIT = oranye, ALPHA = merah, TERLAMBAT = kuning, CUTI = ungu |
| TD-05 | Kalender riwayat bulan berjalan | Buka tab Riwayat Absensi | • Hari absensi ditandai warna sesuai status<br>• Hari ini dilingkari hijau |

---

## 4. Absensi – Riwayat & Ringkasan User

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| RW-01 | Filter riwayat per bulan | 1. Tab Riwayat Absensi<br>2. Pilih bulan Januari, klik **Muat** | • Daftar hanya menampilkan record bulan Januari |
| RW-02 | Filter riwayat per tahun | Ganti tahun ke tahun sebelumnya, klik Muat | • Data tahun sebelumnya tampil |
| RW-03 | Ringkasan akurat | Filter bulan yang memiliki data | • Chip summary: Total, Hadir, Izin, Sakit, Alpha, Terlambat, Cuti sesuai jumlah sebenarnya |
| RW-04 | Paginasi riwayat (>15 record) | Pilih bulan dengan >15 absensi | • Muncul navigasi halaman<br>• Halaman 2 menampilkan item berikutnya |
| RW-05 | Kalender mewakili status hari | Pilih bulan aktif | • Setiap hari dengan absensi menampilkan emoji dan kode status di kotak kalender |
| RW-06 | Hari dengan >1 record | Unit khusus: admin buat 2 absensi di hari sama | • Kalender menampilkan "+1" di sudut sel hari tsb |
| RW-07 | Hari Minggu merah di kalender | Lihat kalender | • Kolom Minggu (Min) berwarna merah |
| RW-08 | Bulan tanpa data | Pilih bulan tanpa absensi | • Kalender tampil kosong, summary semua 0<br>• Tidak ada error |

---

## 5. Absensi – Statistik Harian

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| ST-01 | Endpoint statistik mengembalikan data valid | Admin buka panel statistik atau test via API `/api/v1/absensi/statistics` | • total_count = jumlah semua record<br>• today_count = jumlah record hari ini<br>• pending_checkout = hadir + belum checkout<br>• by_status per kategori akurat |
| ST-02 | Grafik 7 hari terakhir | Lihat komponen statistik yang memuat last_7_days | • Menampilkan 7 hari valid<br>• Angka sesuai data aktual |
| ST-03 | pending_checkout = 0 setelah semua CO | Pastikan semua user sudah check-out | • pending_checkout = 0 |

---

## 6. Absensi – Admin CRUD & Filter

**Prasyarat:** Login sebagai `admin` atau `super-admin`.

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| ADM-01 | Lihat semua absensi (default) | Admin → Menu Absensi Monitor atau halaman admin absensi | • Tabel memuat semua absensi + informasi pegawai + unit + status_final_shift |
| ADM-02 | Filter berdasarkan tanggal | Set start_date & end_date | • Hanya record dalam rentang tanggal yang tampil |
| ADM-03 | Filter berdasarkan unit | Pilih unit tertentu dari dropdown | • Hanya absensi pegawai di unit tersebut |
| ADM-04 | Filter berdasarkan status | Pilih status ALPHA | • Hanya absensi ALPHA yang tampil |
| ADM-05 | Filter berdasarkan nama/NIP pegawai | Input id_pegawai yang ada | • Hanya absensi pegawai tsb |
| ADM-06 | Kombinasi filter | Isi filter unit + status + tanggal | • Hasil memenuhi semua kriteria |
| ADM-07 | Kolom status_final_shift | Lihat tabel hasil | • Kolom menampilkan nilai dari penilaian_shift_absensi (TEPAT_WAKTU, TERLAMBAT, MANGKIR, dll) |
| ADM-08 | Detail absensi per ID | Klik row/tombol detail | • Modal atau halaman detail menampilkan semua field: jam_masuk, jam_keluar, status, keterangan, ip_address, dokumen |
| ADM-09 | Admin buat absensi baru untuk pegawai | Isi form admin create dengan id_pegawai, tanggal, status, jam | • Record baru tersimpan<br>• Muncul di tabel |
| ADM-10 | Admin hapus record absensi | Klik tombol hapus pada row | • Konfirmasi hapus muncul<br>• Setelah konfirmasi, record hilang dari tabel |
| ADM-11 | Paginasi tabel admin | Koleksi data besar (>50 record) | • Navigasi halaman berfungsi<br>• Jumlah item per halaman sesuai limit |

---

## 7. Roster – Kamus Kode Shift

**Prasyarat:** Login sebagai `admin`.

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| KKS-01 | Lihat daftar kode shift | Navigasi ke Kamus Kode Shift | • Tabel menampilkan kode, nama, deskripsi shift |
| KKS-02 | Tambah kode shift baru | Klik Tambah → isi kode unik, nama, jam mulai/selesai | • Record baru tersimpan dan muncul di tabel |
| KKS-03 | Tambah kode duplikat | Input kode yang sudah ada | • Muncul error "Kode sudah digunakan" |
| KKS-04 | Edit kode shift | Klik edit, ubah nama | • Perubahan tersimpan, tabel diperbarui |
| KKS-05 | Hapus kode shift | Klik hapus | • Konfirmasi muncul → setelah konfirm, kode hilang |
| KKS-06 | Hapus kode yang digunakan roster | Coba hapus kode yang sudah terikat roster | • Error atau peringatan relasi FK |

---

## 8. Roster – Kamus Pola Shift

**Prasyarat:** Login sebagai `admin`.

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| KPS-01 | Lihat daftar pola shift | Navigasi ke Kamus Pola Shift | • Tabel pola shift tampil |
| KPS-02 | Tambah pola shift baru | Klik Tambah → isi nama pola, siklus hari, daftar kode shift | • Pola tersimpan |
| KPS-03 | Validasi siklus hari | Input siklus ≤ 0 | • Validasi error "siklus harus > 0" |
| KPS-04 | Edit pola shift | Ubah kode shift di hari ke-3 | • Perubahan tersimpan |
| KPS-05 | Hapus pola shift | Hapus pola yang tidak digunakan | • Berhasil dihapus |
| KPS-06 | Hapus pola yang digunakan | Coba hapus pola yang aktif di roster | • Error relasi FK atau warning |

---

## 9. Roster – Upload Batch Excel

**Prasyarat:** Login sebagai `admin`. File template Excel tersedia.

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| UB-01 | Upload file Excel valid | 1. Unduh template Excel<br>2. Isi data pegawai + shift<br>3. Upload via form | • Batch dibuat dengan status PROCESSING<br>• Setelah diproses, status SELESAI<br>• Record roster_shift terbuat sesuai baris Excel |
| UB-02 | Upload file bukan Excel | Upload file .pdf atau .txt | • Error "Format file tidak valid, gunakan .xlsx" |
| UB-03 | Upload Excel dengan kolom salah | Hapus kolom wajib di template | • Batch gagal atau status ERROR dengan detail kolom yang kurang |
| UB-04 | Upload Excel dengan ID pegawai tidak ada di sistem | Isi id_pegawai fiktif | • Batch selesai dengan catatan baris gagal / failed rows |
| UB-05 | Upload Excel dengan format tanggal salah | Isi tanggal format DD/MM/YYYY (bukan YYYY-MM-DD) | • Row gagal dengan error format tanggal |
| UB-06 | Upload duplikat roster (pegawai + tanggal+sesi sama) | Upload file yang isinya sudah ada | • Conflict detection — error unik atau skip dengan log |
| UB-07 | Lihat status batch | Buka halaman Roster Upload Batch | • Kolom status: PENDING, PROCESSING, SELESAI, GAGAL tampil dengan badge warna |
| UB-08 | Detail batch | Klik detail pada batch | • Menampilkan: nama file, tanggal upload, total baris, sukses, gagal, daftar error per baris |
| UB-09 | Hapus batch + cascade | Hapus batch yang sudah diproses | • Konfirmasi tampil<br>• Setelah konfirm: batch dihapus, roster_shift yang terikat cascade-delete atau SET NULL |

---

## 10. Roster – Manual Entry & Edit Roster Shift

**Prasyarat:** Login sebagai `admin`.

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| RS-01 | Tambah roster shift manual | Form manual: isi id_pegawai, tanggal_shift, jam_mulai, jam_selesai, nomor_sesi | • Record roster baru dengan status_roster = AKTIF |
| RS-02 | jam_selesai ≤ jam_mulai | Isi jam_selesai lebih awal dari jam_mulai | • Error "jam_selesai harus lebih besar dari jam_mulai" |
| RS-03 | nomor_sesi ≤ 0 | Input 0 atau negatif | • Error "nomor_sesi harus lebih besar dari 0" |
| RS-04 | grace_telat negatif | Input -5 | • Error "grace_telat_override_menit tidak boleh negatif" |
| RS-05 | Edit roster shift | Ubah jam_mulai dari 07:00 ke 08:00 | • Perubahan tersimpan |
| RS-06 | Ubah status_roster ke BATAL | Edit status_roster = BATAL | • Status berubah, record tidak digunakan untuk evaluasi penilaian |
| RS-07 | Filter roster per pegawai | Filter id_pegawai di tabel roster | • Hanya roster pegawai tersebut tampil |
| RS-08 | Filter roster per unit | Filter id_unit | • Hanya roster unit tersebut |
| RS-09 | Filter roster per tanggal | Filter tanggal_mulai & tanggal_selesai | • Hasil sesuai rentang tanggal |
| RS-10 | Filter roster per shift_kelompok | Pilih shift kelompok tertentu | • Hanya roster dengan kelompok tersebut |
| RS-11 | Hapus roster shift | Klik hapus pada row roster | • Konfirmasi → terhapus dari tabel<br>• Penilaian terkait CASCADE dihapus |

---

## 11. Penilaian Shift Absensi – Evaluasi Otomatis

**Prasyarat:** Ada roster AKTIF dan absensi di rentang tanggal yang sama.

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| PS-01 | Jalankan evaluasi semua roster | Admin → Penilaian → klik **Evaluasi** (atau trigger `POST /penilaian-shift-absensi/evaluate`) | • Response: total_roster, evaluated_count, created_count, updated_count, skipped, failed |
| PS-02 | Status TEPAT_WAKTU | Pegawai check-in tepat waktu (dalam grace period) | • status_final = TEPAT_WAKTU<br>• menit_telat = 0 |
| PS-03 | Status TERLAMBAT | Pegawai check-in melebihi grace period | • status_final = TERLAMBAT<br>• menit_telat = selisih menit > 0 |
| PS-04 | Status PULANG_CEPAT | Pegawai check-out sebelum jam_selesai melebihi toleransi | • status_final = PULANG_CEPAT<br>• menit_pulang_cepat > 0 |
| PS-05 | Status MANGKIR | Tidak ada absensi dalam window waktu roster | • status_final = MANGKIR<br>• checkin_aktual = null, checkout_aktual = null |
| PS-06 | Status TIDAK_ABSEN_MASUK | Ada checkout tanpa checkin dalam window | • status_final = TIDAK_ABSEN_MASUK |
| PS-07 | Status TIDAK_ABSEN_PULANG | Ada checkin tanpa checkout dalam window | • status_final = TIDAK_ABSEN_PULANG |
| PS-08 | Evaluasi dengan force_recalculate=true | Ubah absensi lalu re-evaluate dengan force=true | • Semua record dihitung ulang termasuk yang sudah ada<br>• evaluation_version bertambah +1 |
| PS-09 | Evaluasi sudah ada skip | Jalankan evaluasi dua kali tanpa force | • Kedua kali: skipped_existing bertambah<br>• evaluated_count = 0 |
| PS-10 | Filter evaluasi per unit | Evaluasi dengan parameter id_unit | • Hanya roster unit tersebut yang dihitung |
| PS-11 | Filter evaluasi per pegawai | Evaluasi dengan id_pegawai | • Hanya roster pegawai tersebut |
| PS-12 | Filter evaluasi per tanggal | Evaluasi dengan start_date & end_date | • Hanya roster dalam rentang tanggal |
| PS-13 | Menit lembur terhitung | Checkout jauh setelah jam_selesai + batas_lembur | • menit_lembur > 0 |
| PS-14 | Grace period override di roster | Set grace_telat_override_menit di roster | • Evaluasi menggunakan override, bukan default aturan shift_kelompok |
| PS-15 | Tabel penilaian tampil di admin | Buka halaman Penilaian di admin panel | • Tabel menampilkan: nama pegawai, tanggal shift, status_final, menit_telat, checkin_aktual, checkout_aktual |

---

## 12. Penilaian Shift Absensi – Override Manual

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| PO-01 | Admin ubah status_final manual | Edit penilaian id X, ubah status_final ke TIDAK_DIHITUNG | • status_final berubah |
| PO-02 | Set is_manual_override = true | Edit penilaian, centang manual override, isi override_reason | • is_manual_override = true tersimpan |
| PO-03 | Override tidak ditimpa re-evaluate | Evaluasi tanpa force setelah PO-02 | • Record yang is_manual_override=true di-skip (skipped_manual_override bertambah) |
| PO-04 | Override BISA ditimpa force_recalculate | Evaluasi DENgan force_recalculate=true setelah PO-02 | • Record override dihitung ulang, is_manual_override = false (dihapus) |
| PO-05 | Validasi status_final tidak valid | Input "SALAH_STATUS" | • Error 400 "status_final tidak valid" |
| PO-06 | checkout < checkin validasi | Isi checkout lebih kecil dari checkin | • Error 400 "checkout_aktual tidak boleh lebih kecil dari checkin_aktual" |
| PO-07 | Hapus penilaian | Admin hapus record penilaian | • Konfirmasi → record terhapus<br>• Roster shift terkait tetap ada |

---

## 13. Approval Pengajuan – Alur User

**Prasyarat:** Login sebagai `user`. Pegawai memiliki `kepala_id_unit` yang valid.

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| AP-01 | Buat pengajuan koreksi masuk | 1. Halaman Approval / Pengajuan<br>2. Klik Buat Pengajuan<br>3. Pilih tipe **KOREKSI_MASUK**<br>4. Isi target_tanggal & alasan<br>5. Submit | • Pengajuan tersimpan status PENDING<br>• Log CREATED terbuat<br>• assigned_approver = atasan langsung (kepala unit) |
| AP-02 | Buat pengajuan KOREKSI_KELUAR | Pilih tipe KOREKSI_KELUAR | • Tersimpan PENDING |
| AP-03 | Buat pengajuan MISSING_CHECKIN | Pilih tipe MISSING_CHECKIN | • Tersimpan PENDING |
| AP-04 | Buat pengajuan MISSING_CHECKOUT | Pilih tipe MISSING_CHECKOUT | • Tersimpan PENDING |
| AP-05 | Buat pengajuan ALASAN_TERLAMBAT | Pilih tipe ALASAN_TERLAMBAT + roster_shift_id | • Tersimpan PENDING |
| AP-06 | Buat pengajuan ALASAN_PULANG_CEPAT | Pilih tipe ALASAN_PULANG_CEPAT | • Tersimpan PENDING |
| AP-07 | Alasan wajib diisi | Submit dengan alasan kosong | • Error validasi "alasan wajib minimal 1 karakter" |
| AP-08 | User belum punya kepala_id_unit | Login user tanpa kepala_id_unit lalu buat pengajuan | • Error "Pegawai belum memiliki mapping atasan langsung" |
| AP-09 | Lihat daftar pengajuan saya | Buka halaman riwayat pengajuan | • Semua pengajuan milik user ini tampil dengan status |
| AP-10 | Lihat detail & log pengajuan | Klik detail pengajuan | • Log history tampil: CREATED, ... |
| AP-11 | User tidak bisa lihat log pengajuan orang lain | Coba akses log pengajuan milik user lain | • Error 403 Forbidden |
| AP-12 | Paginasi riwayat pengajuan | Submit >10 pengajuan | • Navigasi halaman berfungsi |

---

## 14. Approval Pengajuan – Alur Atasan/Ka-Unit

**Prasyarat:** Login sebagai atasan yang menjadi `assigned_approver` dari pengajuan yang PENDING.

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| APR-01 | Lihat antrian persetujuan | Buka menu Persetujuan / Approval | • Daftar pengajuan yang ditugaskan ke saya |
| APR-02 | Approve pengajuan | Klik Setujui pada pengajuan PENDING | • status_pengajuan = APPROVED<br>• diputuskan_pada terisi<br>• Log APPROVED terbuat |
| APR-03 | Reject pengajuan | Klik Tolak → isi catatan penolakan | • status_pengajuan = REJECTED<br>• catatan_approval tersimpan<br>• Log REJECTED terbuat |
| APR-04 | Cancel oleh user | User membatalkan pengajuannya sendiri | • status_pengajuan = CANCELLED<br>• Log CANCELLED terbuat |
| APR-05 | Double approve (sudah diputuskan) | Coba approve pengajuan yang sudah APPROVED | • Error 400 "Pengajuan sudah diputuskan" |
| APR-06 | Atasan unit A approve pengajuan unit B | Login atasan unit A, coba approve milik unit B | • Error 403 "Bukan approver yang ditugaskan" |
| APR-07 | Audit log detail | Buka log pengajuan | • Urutan: CREATED → APPROVED/REJECTED |
| APR-08 | Lihat log setelah diputuskan | Ka-unit buka detail pengajuan yang sudah APPROVED | • Tab log menampilkan riwayat lengkap |

---

## 15. Approval Pengajuan – Super Admin Override

**Prasyarat:** Login sebagai `super-admin`.

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| SAO-01 | Approve pengajuan milik unit lain | Super admin approve pengajuan yang assigned_approver bukan dirinya | • Berhasil: approval_mode = SUPER_ADMIN_OVERRIDE<br>• super_admin_override_by_pegawai terisi<br>• Log SUPER_ADMIN_OVERRIDDEN + APPROVED terbuat |
| SAO-02 | Reject via super admin override | Reject pengajuan unit lain | • status REJECTED, approval_mode = SUPER_ADMIN_OVERRIDE |
| SAO-03 | Catatan override tersimpan | Isi catatan_approval saat override | • catatan_approval dan super_admin_override_reason tersimpan |
| SAO-04 | Akses audit log global | Admin buka endpoint audit log semua pengajuan | • Semua log lintas unit tampil |
| SAO-05 | Non-admin akses audit global | Login sebagai ka-unit, akses audit log global | • Error 403 "Hanya admin/super-admin yang dapat mengakses" |
| SAO-06 | Filter audit log per tanggal | Filter start_date & end_date | • Log dalam rentang tersebut |
| SAO-07 | Filter audit log per action_type | Filter action_type = APPROVED | • Hanya log dengan action APPROVED |

---

## 16. Admin Override Absensi

**Prasyarat:** Login sebagai `admin` atau `super-admin`.

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| OVR-01 | Edit jam_masuk absensi | Admin buka detail absensi → ubah jam_masuk 1 jam lebih awal | • jam_masuk diperbarui |
| OVR-02 | Edit jam_keluar absensi | Ubah jam_keluar | • jam_keluar diperbarui |
| OVR-03 | Ubah status absensi | Ubah status dari ALPHA ke HADIR | • status berubah di tabel |
| OVR-04 | Ubah keterangan | Edit keterangan absensi | • keterangan baru tersimpan |
| OVR-05 | Hapus dokumen pendukung | Set dokumen_pendukung = null | • Kolom dikosongkan |
| OVR-06 | Efek pada penilaian setelah override | Setelah OVR-01, jalankan evaluasi ulang dengan force=true | • Penilaian dihitung ulang dengan jam baru<br>• status_final berubah sesuai logika baru |
| OVR-07 | Admin buat absensi untuk pegawai tidak hadir | Buat record baru via form admin (AbsensiAdminCreate) untuk pegawai yang tidak absen kemarin | • Record tersimpan dengan id_pegawai, tanggal, status manual |
| OVR-08 | Hapus absensi | Klik hapus, konfirmasi | • Record terhapus<br>• Penilaian terkait SET NULL pada matched_absensi_id |
| OVR-09 | Edit jam_keluar < jam_masuk | Input jam_keluar lebih awal dari jam_masuk | • Error validasi atau peringatan |
| OVR-10 | Input status tidak valid | Input status "TIDAK_MASUK" | • Error 422 "status must be one of: HADIR, IZIN, SAKIT, ALPHA, TERLAMBAT, CUTI" |

---

## 17. IP Whitelist – Integrasi Check-In

**Prasyarat:** Login sebagai `admin` untuk kelola whitelist; `user` untuk test check-in.

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| IPW-01 | Tambah IP whitelist aktif | Admin → IP Whitelist → Tambah → isi IP address + label | • Entri tersimpan, is_active = true |
| IPW-02 | Tambah CIDR range | Isi ip_address = "192.168.1.0/24" | • Tersimpan valid |
| IPW-03 | Input IP tidak valid | Isi "999.999.0.1" atau "bukan-ip" | • Validasi error di frontend/backend |
| IPW-04 | Nonaktifkan entri | Toggle is_active = false | • Entri tidak digunakan dalam pengecekan check-in |
| IPW-05 | Check-in dari IP dalam whitelist | Whitelist berisi IP user → user check-in | • Check-in berhasil |
| IPW-06 | Check-in dari IP luar whitelist | Whitelist aktif, IP user tidak termasuk | • Error 403 "wajib absen di lingkungan Rumah Sakit" |
| IPW-07 | Check-in saat whitelist CIDR match | IP user "192.168.1.55" ada dalam range "192.168.1.0/24" | • Check-in berhasil (CIDR match) |
| IPW-08 | Check-in saat whitelist kosong (no restriction) | Hapus semua entri aktif | • Check-in berhasil dari IP apapun |
| IPW-09 | Edit IP whitelist | Ubah label entri | • Label berubah |
| IPW-10 | Hapus entri | Klik hapus → konfirmasi | • Entri terhapus<br>• Jika itu satu-satunya entri aktif, check-in kembali tidak dibatasi |

---

## 18. Skenario Negatif & Edge Case

| ID | Skenario | Langkah | Ekspektasi |
|----|----------|---------|------------|
| NEG-01 | User tanpa roster check-in | Check-in tanpa ada roster shift terdaftar hari ini | • Check-in tetap berhasil (roster opsional)<br>• Penilaian = MANGKIR (tidak ada roster yang dicocokkan) |
| NEG-02 | Roster shift masa lalu | Evaluasi roster tanggal 6 bulan lalu | • Evaluasi berjalan normal untuk data historis |
| NEG-03 | Session expired saat check-in | Token JWT expired → klik Check-In | • Redirect ke halaman login<br>• Tidak ada record bogus tersimpan |
| NEG-04 | Absensi duplikat dari dua tab | Buka dua tab browser, check-in bersamaan | • Hanya satu check-in yang berhasil<br>• Satu lagi error "Sudah check-in" |
| NEG-05 | Upload batch Excel kosong | Upload file .xlsx tanpa data | • Error atau batch selesai dengan 0 record, 0 sukses |
| NEG-06 | Pengajuan approval tanpa roster_shift_id | Tipe ALASAN_TERLAMBAT tanpa roster_shift_id | • Tersimpan (roster_shift_id nullable), tapi approver dapat menilihat tanpa konteks shift |
| NEG-07 | Check-out tanpa check-in | Panggil endpoint check-out tanpa check-in hari ini | • Error 404 "Tidak ada sesi check-in aktif hari ini" |
| NEG-08 | Evaluasi penilaian tanpa roster | Jalankan evaluate dengan filter yang tidak memiliki roster AKTIF | • Response: total_roster = 0, evaluated_count = 0 (tidak error) |
| NEG-09 | Delete pegawai yang masih memiliki absensi | Coba hapus pegawai dengan absensi aktif | • Error FK constraint atau cascade sesuai konfigurasi |
| NEG-10 | Akses admin endpoint dari user biasa | User dengan role `user` akses `GET /api/v1/absensi/` (admin only) | • Error 403 Forbidden |
| NEG-11 | Input evaluasi version ≤ 0 | Admin set evaluation_version = 0 | • Error 400 "evaluation_version harus lebih besar dari 0" |
| NEG-12 | menit_telat negatif | Admin input menit_telat = -5 | • Error 400 "menit_telat tidak boleh negatif" |

---

## Template Laporan Bug

```
Bug ID      : BUG-XXX
Modul       : [Absensi / Roster / Penilaian / Approval / Override / IP Whitelist]
Test Case ID: [ID dari dokumen ini, misal CI-06]
Prioritas   : [Critical / High / Medium / Low]
Role        : [admin / user / ka-unit / super-admin]

Deskripsi   :
[Jelaskan bug secara singkat]

Langkah Reproduksi:
1. ...
2. ...
3. ...

Hasil Aktual:
[Apa yang terjadi di sistem]

Hasil Ekspektasi:
[Sesuai test case, apa yang seharusnya terjadi]

Environment :
- Browser  : [Chrome 120 / Firefox / Safari]
- OS       : [Windows 11 / Android / iOS]
- URL      : [kalijaga.fun/...]
- Timestamp: [tgl jam WIB]

Screenshot / Video:
[lampirkan]
```

---

## Ringkasan Cakupan

| Modul | Jumlah Test Case | Skenario Positif | Skenario Negatif |
|-------|-----------------|-----------------|-----------------|
| Check-In | 12 | 9 | 3 |
| Check-Out | 5 | 4 | 1 |
| Today Dashboard | 5 | 5 | 0 |
| Riwayat & Summary | 8 | 7 | 1 |
| Statistik | 3 | 3 | 0 |
| Admin Absensi CRUD | 11 | 10 | 1 |
| Kamus Kode Shift | 6 | 4 | 2 |
| Kamus Pola Shift | 6 | 4 | 2 |
| Upload Batch Excel | 9 | 4 | 5 |
| Roster Manual Entry | 11 | 7 | 4 |
| Penilaian Evaluasi Otomatis | 15 | 12 | 3 |
| Penilaian Override Manual | 7 | 4 | 3 |
| Approval – User | 12 | 10 | 2 |
| Approval – Atasan/Ka-Unit | 8 | 6 | 2 |
| Approval – Super Admin Override | 7 | 6 | 1 |
| Admin Override Absensi | 10 | 8 | 2 |
| IP Whitelist Integrasi | 10 | 7 | 3 |
| Edge Case & Negatif | 12 | 0 | 12 |
| **TOTAL** | **167** | **120** | **47** |

---

*Dokumen dibuat: 2025 | Sistem: RSUD Sulfat Attendance App | Backend: FastAPI + PostgreSQL | Frontend: React + Vite*
