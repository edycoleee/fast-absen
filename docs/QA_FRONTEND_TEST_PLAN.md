# Test Plan QA — Frontend RSUD Sulfat Absensi System

**Versi dokumen:** 1.0  
**Tanggal:** 2 Maret 2026  
**Platform:** Web Browser (Chrome / Firefox / Edge)  
**URL Target:** https://kalijaga.fun  

---

## Konvensi Penulisan

| Simbol | Arti |
|--------|------|
| ✅ | Expected result (kondisi pass) |
| 🔴 | Kondisi yang harus ditolak/gagal |
| 📋 | Langkah yang perlu dicatat |
| ⚠️ | Perlu diperhatikan khusus |

**Status tiap test case:** `PASS` / `FAIL` / `SKIP` / `BLOCKED`

---

## BAGIAN 1 — ALUR ADMIN

Login dengan akun role **`admin`** atau **`super-admin`** di `/login-admin`.

---

### 1.0 — Autentikasi Admin

| # | Langkah | Expected |
|---|---------|----------|
| 1.0.1 | Buka `/login-admin`, isi username & password benar → klik Login | ✅ Redirect ke `/dashboard`, token tersimpan |
| 1.0.2 | Login dengan password salah | ✅ Pesan error muncul, tidak redirect |
| 1.0.3 | Buka `/dashboard` tanpa login (sesi kosong) | ✅ Redirect ke `/login-admin` |
| 1.0.4 | Klik Logout dari sidebar | ✅ Redirect ke `/login-admin`, token terhapus |
| 1.0.5 | Setelah logout, tekan tombol Back browser | ✅ Tetap di halaman login, tidak bisa kembali ke dashboard |

---

### 1.1 — Dashboard Admin

| # | Langkah | Expected |
|---|---------|----------|
| 1.1.1 | Buka `/dashboard` | ✅ Halaman dimuat, widget statistik muncul |
| 1.1.2 | Cek semua menu shortcut/card yang tampil di dashboard | ✅ Sesuai hak akses role admin (semua menu visible) |
| 1.1.3 | Klik salah satu shortcut (misal: Monitoring Absensi) | ✅ Navigasi ke halaman yang benar |

---

### 1.2 — Manajemen Users

Path: `/users`

| # | Langkah | Expected |
|---|---------|----------|
| 1.2.1 | Buka `/users` | ✅ Tabel daftar user muncul |
| 1.2.2 | Klik tombol Tambah User → isi form lengkap → Submit | ✅ User baru muncul di tabel, notifikasi sukses |
| 1.2.3 | Tambah user dengan username yang sudah ada | 🔴 Pesan error duplikat |
| 1.2.4 | Tambah user dengan password tidak sesuai konfirmasi | 🔴 Pesan error validasi |
| 1.2.5 | Klik Edit pada user → ubah data → Simpan | ✅ Data terupdate di tabel |
| 1.2.6 | Klik Hapus user → konfirmasi | ✅ User hilang dari tabel |
| 1.2.7 | Assign role ke user dari menu edit | ✅ Role tersimpan dan tampil di tabel |

---

### 1.3 — Manajemen Roles

Path: `/roles`

| # | Langkah | Expected |
|---|---------|----------|
| 1.3.1 | Buka `/roles` | ✅ Daftar role tampil |
| 1.3.2 | Buat role baru → isi nama & deskripsi → Submit | ✅ Role muncul di tabel |
| 1.3.3 | Edit role yang ada | ✅ Perubahan tersimpan |
| 1.3.4 | Hapus role yang tidak sedang digunakan | ✅ Role terhapus |
| 1.3.5 | Assign permission ke role | ✅ Permissions terpilih tersimpan |

---

### 1.4 — Manajemen Permissions

Path: `/permissions`

| # | Langkah | Expected |
|---|---------|----------|
| 1.4.1 | Buka `/permissions` | ✅ Seluruh permission terdaftar tampil |
| 1.4.2 | Verifikasi permission grup `ip_whitelist.*` ada | ✅ 4 permission ip_whitelist tersedia |
| 1.4.3 | Search/filter permission berdasarkan nama | ✅ Hasil filter relevan |

---

### 1.5 — Manajemen Unit

Path: `/unit`

| # | Langkah | Expected |
|---|---------|----------|
| 1.5.1 | Buka `/unit` | ✅ Daftar unit tampil |
| 1.5.2 | Tambah unit baru → Submit | ✅ Unit baru muncul |
| 1.5.3 | Edit nama unit | ✅ Nama terupdate |
| 1.5.4 | Hapus unit yang tidak memiliki pegawai | ✅ Unit terhapus |
| 1.5.5 | Hapus unit yang masih memiliki pegawai | 🔴 Pesan error / konfirmasi gagal |

---

### 1.6 — Manajemen Pegawai

Path: `/pegawai`

| # | Langkah | Expected |
|---|---------|----------|
| 1.6.1 | Buka `/pegawai` | ✅ Daftar pegawai tampil dengan kolom NIP, nama, unit |
| 1.6.2 | Tambah pegawai baru → isi semua field wajib → Submit | ✅ Pegawai baru tampil di tabel |
| 1.6.3 | Tambah pegawai dengan NIP yang sudah ada | 🔴 Pesan error duplikat |
| 1.6.4 | Edit data pegawai → Simpan | ✅ Data terupdate |
| 1.6.5 | Klik tombol Daftar Wajah pada salah satu pegawai | ✅ Navigasi ke `/pegawai/:id/register-face` |
| 1.6.6 | Di halaman register-face: upload foto wajah valid | ✅ Proses embedding berhasil, status "Terdaftar" |
| 1.6.7 | Upload foto yang tidak mengandung wajah | 🔴 Pesan error deteksi wajah gagal |
| 1.6.8 | Hapus embedding wajah → konfirmasi | ✅ Status kembali ke "Belum Terdaftar" |

---

### 1.7 — Manajemen Shift

#### 1.7.1 — Kelompok Shift (`/shift-kelompok`)

| # | Langkah | Expected |
|---|---------|----------|
| 1.7.1.1 | Buka `/shift-kelompok` | ✅ Daftar kelompok shift tampil |
| 1.7.1.2 | Tambah kelompok shift baru | ✅ Tersimpan dan tampil |
| 1.7.1.3 | Edit kelompok shift | ✅ Perubahan tersimpan |

#### 1.7.2 — Aturan Shift (`/shift-aturan`)

| # | Langkah | Expected |
|---|---------|----------|
| 1.7.2.1 | Buka `/shift-aturan` | ✅ Daftar aturan shift tampil |
| 1.7.2.2 | Tambah aturan shift baru dengan jam masuk & jam keluar valid | ✅ Tersimpan |
| 1.7.2.3 | Input jam keluar lebih awal dari jam masuk (non-shift lintas hari) | 🔴 Validasi error |

#### 1.7.3 — Assignment Pegawai ke Shift (`/shift-pegawai`)

| # | Langkah | Expected |
|---|---------|----------|
| 1.7.3.1 | Assign pegawai ke kelompok shift tertentu | ✅ Assignment tersimpan |
| 1.7.3.2 | Coba assign pegawai yang sudah punya assignment aktif tanpa end date | 🔴 Error konflik UNIQUE |

---

### 1.8 — Manajemen Roster

#### 1.8.1 — Roster Upload (`/roster-upload`)

| # | Langkah | Expected |
|---|---------|----------|
| 1.8.1.1 | Buka `/roster-upload` | ✅ Halaman upload batch tampil |
| 1.8.1.2 | Upload file Excel template yang valid | ✅ Batch berhasil diproses, status "Success" |
| 1.8.1.3 | Upload file non-Excel / format salah | 🔴 Pesan error format file |
| 1.8.1.4 | Cek log batch: lihat jumlah baris sukses & gagal | 📋 Catat angka untuk laporan |

#### 1.8.2 — Roster Adapter (`/roster-adapter`)

| # | Langkah | Expected |
|---|---------|----------|
| 1.8.2.1 | Pilih pegawai & rentang tanggal → Generate | ✅ Jadwal shift dihasilkan dari pola/kamus |
| 1.8.2.2 | Generate di luar rentang tanggal valid | 🔴 Validasi tanggal error |

#### 1.8.3 — Roster Shift (`/roster-shift`)

| # | Langkah | Expected |
|---|---------|----------|
| 1.8.3.1 | Filter roster by pegawai atau tanggal | ✅ Hasil filter tampil benar |
| 1.8.3.2 | Edit manual satu baris roster | ✅ Perubahan tersimpan |

---

### 1.9 — Penilaian Shift Absensi

Path: `/penilaian-shift`

| # | Langkah | Expected |
|---|---------|----------|
| 1.9.1 | Buka `/penilaian-shift` | ✅ Tabel penilaian tampil |
| 1.9.2 | Filter penilaian berdasarkan unit & periode | ✅ Data terfilter |
| 1.9.3 | Cek status penilaian: HADIR, TERLAMBAT, ALPHA | ✅ Status sesuai data absensi vs roster |

---

### 1.10 — Monitoring Absensi

Path: `/absensi`

| # | Langkah | Expected |
|---|---------|----------|
| 1.10.1 | Buka `/absensi` | ✅ Tabel data absensi seluruh pegawai tampil |
| 1.10.2 | Filter berdasarkan tanggal hari ini | ✅ Hanya absensi hari ini yang muncul |
| 1.10.3 | Filter berdasarkan nama/unit pegawai | ✅ Hasil sesuai filter |
| 1.10.4 | Klik detail salah satu absensi | ✅ Modal/panel detail tampil dengan IP, jam masuk, status |
| 1.10.5 | Admin edit data absensi (jam/status) | ✅ Perubahan tersimpan |
| 1.10.6 | Admin hapus data absensi | ✅ Data terhapus dari tabel |

---

### 1.11 — Monitor Sesi

Path: `/sessions-monitor`

| # | Langkah | Expected |
|---|---------|----------|
| 1.11.1 | Buka tab **Sesi Aktif** | ✅ Daftar sesi aktif tampil dengan nama, device, IP |
| 1.11.2 | Klik Refresh | ✅ Data diperbarui |
| 1.11.3 | Klik Force Logout pada sesi aktif | ✅ Sesi di-logout, hilang dari daftar aktif |
| 1.11.4 | Buka tab **Riwayat Sesi** → filter by device_type | ✅ Data terfilter |
| 1.11.5 | Buka tab **Statistik** | ✅ Grafik/angka aktif, hari ini, per device tampil |
| 1.11.6 | Cek kolom IP Address — pastikan bukan IP Cloudflare | 📋 IP harus IP publik user, bukan 172.x.x.x |
| 1.11.7 | Klik Cleanup Expired Sessions | ✅ Sessions kadaluarsa tertandai logout |

---

### 1.12 — Approval Absensi

Path: `/approval`

| # | Langkah | Expected |
|---|---------|----------|
| 1.12.1 | Buka `/approval` | ✅ Daftar pengajuan approval tampil |
| 1.12.2 | Approve pengajuan yang statusnya PENDING | ✅ Status berubah menjadi APPROVED |
| 1.12.3 | Reject pengajuan dengan alasan | ✅ Status berubah REJECTED, alasan tersimpan |
| 1.12.4 | Filter pengajuan berdasarkan status | ✅ Hasil terfilter |
| 1.12.5 | Buka log audit pengajuan | ✅ Riwayat perubahan status tampil |

---

### 1.13 — Rekap Unit / Role

Path: `/rekap-unit-role`

| # | Langkah | Expected |
|---|---------|----------|
| 1.13.1 | Buka `/rekap-unit-role` | ✅ Tabel rekap per unit tampil |
| 1.13.2 | Pilih periode bulan tertentu | ✅ Data rekap sesuai periode |
| 1.13.3 | Export/download rekap (jika tersedia) | ✅ File terdownload |

---

### 1.14 — Pengaturan Sistem

Path: `/system-settings`

| # | Langkah | Expected |
|---|---------|----------|
| 1.14.1 | Buka `/system-settings` | ✅ Panel pengaturan face threshold tampil |
| 1.14.2 | Geser slider threshold ke nilai baru → Simpan | ✅ Nilai tersimpan, konfirmasi sukses |
| 1.14.3 | Toggle Lock threshold | ✅ Status kunci berubah |
| 1.14.4 | Simpan nilai di bawah batas minimum | 🔴 Validasi mencegah penyimpanan |

---

### 1.15 — IP Whitelist Absensi

Path: `/ip-whitelist`

| # | Langkah | Expected |
|---|---------|----------|
| 1.15.1 | Buka `/ip-whitelist` | ✅ Tabel whitelist tampil, info banner kosong muncul |
| 1.15.2 | Klik Tambah IP → isi IP valid (misal `192.168.1.100`) → Simpan | ✅ IP muncul di tabel, status Aktif |
| 1.15.3 | Tambah IP dengan format CIDR (misal `10.0.0.0/8`) | ✅ Tersimpan dan tampil |
| 1.15.4 | Tambah IP dengan format tidak valid (misal `999.1.1.1`) | 🔴 Pesan error validasi |
| 1.15.5 | Tambah IP yang sudah ada | 🔴 Pesan error duplikat |
| 1.15.6 | Klik badge status Aktif → Toggle menjadi Nonaktif | ✅ Status berubah ke Nonaktif |
| 1.15.7 | Edit label IP yang ada → Simpan | ✅ Label terupdate di tabel |
| 1.15.8 | Hapus IP → konfirmasi | ✅ IP hilang dari tabel |
| 1.15.9 | Saat whitelist berisi ≥1 IP aktif: lakukan check-in dari IP **yang terdaftar** | ✅ Check-in berhasil |
| 1.15.10 | Saat whitelist berisi ≥1 IP aktif: lakukan check-in dari IP **yang tidak terdaftar** | 🔴 Error "Absen Gagal, Anda wajib absen di lingkungan Rumah Sakit" |
| 1.15.11 | Nonaktifkan semua IP → lakukan check-in dari IP mana saja | ✅ Check-in berhasil (tabel aktif kosong = tidak ada batasan) |

---

## BAGIAN 2 — ALUR USER (PEGAWAI)

Login dengan akun role **`user`** di `/login-absensi` (username/password) atau `/login-face-absensi` (wajah).

---

### 2.0 — Login Pegawai

| # | Langkah | Expected |
|---|---------|----------|
| 2.0.1 | Buka `/login-absensi`, isi username & password benar | ✅ Redirect ke `/absensi-dashboard` |
| 2.0.2 | Login dengan password salah | 🔴 Pesan error, tidak redirect |
| 2.0.3 | Buka `/login-face-absensi` → izinkan kamera | ✅ Kamera aktif |
| 2.0.4 | Arahkan wajah yang terdaftar ke kamera | ✅ Wajah terdeteksi, login berhasil, redirect ke dashboard |
| 2.0.5 | Arahkan wajah yang **belum** terdaftar | 🔴 Pesan gagal verifikasi wajah |
| 2.0.6 | Buka `/absensi-dashboard` tanpa login | ✅ Redirect ke `/login-absensi` |

---

### 2.1 — Dashboard Utama User

| # | Langkah | Expected |
|---|---------|----------|
| 2.1.1 | Setelah login, buka menu **Dashboard** | ✅ Widget status hari ini tampil |
| 2.1.2 | Verifikasi info: nama pegawai, username, unit | ✅ Data sesuai profil |
| 2.1.3 | Cek card jadwal shift hari ini (jika ada roster) | ✅ Jam masuk & jam keluar shift tampil |
| 2.1.4 | Cek card IP Address | 📋 IP harus IP asli user (bukan N/A setelah check-in baru) |

---

### 2.2 — Check-In

| # | Langkah | Expected |
|---|---------|----------|
| 2.2.1 | Klik tombol Check-In → pilih status **Hadir** → Submit | ✅ Jam masuk tercatat, tombol Check-In hilang, tombol Check-Out muncul |
| 2.2.2 | Check-In saat belum ada roster shift hari ini | ✅ Check-in tetap bisa dilakukan (tanpa referensi roster) |
| 2.2.3 | Check-In dengan status **Izin** tanpa mengisi keterangan | 🔴 Error: keterangan wajib untuk status IZIN |
| 2.2.4 | Check-In dengan status **Sakit** + isi keterangan | ✅ Tersimpan |
| 2.2.5 | Coba Check-In kedua kali di hari yang sama | 🔴 Error: sudah check-in hari ini |
| 2.2.6 | Check-In dari IP yang **tidak terdaftar** di whitelist aktif | 🔴 Toast/pesan "Absen Gagal, Anda wajib absen di lingkungan Rumah Sakit" |
| 2.2.7 | Check-In dari IP yang **terdaftar** di whitelist | ✅ Check-in berhasil |

---

### 2.3 — Check-Out

| # | Langkah | Expected |
|---|---------|----------|
| 2.3.1 | Setelah check-in, klik tombol Check-Out | ✅ Jam keluar tercatat, tampil "Selesai" |
| 2.3.2 | Coba Check-Out tanpa melakukan Check-In | 🔴 Error: belum ada sesi check-in aktif |
| 2.3.3 | Coba Check-Out kedua kali | 🔴 Error: sudah check-out |
| 2.3.4 | Verifikasi durasi kerja tampil (antara jam masuk & jam keluar) | ✅ Durasi terhitung dan tampil |

---

### 2.4 — Riwayat Absensi

Menu: **Riwayat Absensi** di sidebar

| # | Langkah | Expected |
|---|---------|----------|
| 2.4.1 | Buka menu Riwayat Absensi | ✅ Daftar riwayat 30 hari terakhir muncul |
| 2.4.2 | Scroll / paginasi ke halaman berikutnya | ✅ Data berikutnya dimuat |
| 2.4.3 | Filter riwayat berdasarkan rentang tanggal | ✅ Hasil sesuai rentang |
| 2.4.4 | Klik item riwayat | ✅ Detail: jam masuk, jam keluar, status, IP tampil |
| 2.4.5 | Verifikasi status warna (Hadir = hijau, Alpha = merah, dll.) | ✅ Warna sesuai mapping STATUS_COLORS |
| 2.4.6 | Cek summary bulan ini (total Hadir, Izin, dll.) | ✅ Angka akurat |

---

### 2.5 — Jadwal Shift

Menu: **Jadwal Shift** di sidebar

| # | Langkah | Expected |
|---|---------|----------|
| 2.5.1 | Buka menu Jadwal Shift | ✅ Kalender/tabel jadwal bulan ini tampil |
| 2.5.2 | Navigasi ke bulan sebelumnya/berikutnya | ✅ Jadwal bulan tersebut tampil |
| 2.5.3 | Klik tanggal yang memiliki shift | ✅ Detail shift (jam mulai, jam selesai, kode) tampil |
| 2.5.4 | Shift malam ditandai berbeda | ✅ Indikator warna berbeda untuk shift malam |

---

### 2.6 — Profil Saya

Menu: **Profil Saya** di sidebar

| # | Langkah | Expected |
|---|---------|----------|
| 2.6.1 | Buka menu Profil Saya | ✅ Data lengkap: NIP, nama, unit, username tampil |
| 2.6.2 | Cek status registrasi wajah | ✅ Status "Terdaftar" / "Belum Terdaftar" tampil |
| 2.6.3 | Ringkasan statistik kehadiran bulan ini tampil | ✅ Hadir/Izin/Sakit/Alpha terangkum |

---

### 2.7 — Pengajuan Approval (Koreksi Absensi)

| # | Langkah | Expected |
|---|---------|----------|
| 2.7.1 | Ajukan koreksi absensi (menu pengajuan) | ✅ Form pengajuan tersedia dan tersimpan |
| 2.7.2 | Cek status pengajuan yang sudah diajukan | ✅ Status PENDING tampil |
| 2.7.3 | Setelah di-approve admin: cek status berubah | ✅ Status menjadi APPROVED |

---

### 2.8 — Session Heartbeat

| # | Langkah | Expected |
|---|---------|----------|
| 2.8.1 | Diamkan halaman ±5 menit tanpa aksi | ✅ Heartbeat background terpanggil otomatis setiap 5 menit |
| 2.8.2 | Cek di admin Session Monitor: `last_activity` diperbarui | 📋 Timestamp harus berubah |

---

## BAGIAN 3 — ALUR KA-UNIT (KEPALA UNIT)

Login dengan akun role **`ka-unit`** di `/login-admin`.

---

### 3.0 — Autentikasi Ka-Unit

| # | Langkah | Expected |
|---|---------|----------|
| 3.0.1 | Login dengan akun ka-unit | ✅ Redirect ke dashboard, judul "Kepala Unit" |
| 3.0.2 | Cek menu sidebar yang tampil | ✅ Hanya menu yang diizinkan: Rekap Unit/Role, Monitoring Absensi, Approval, Monitor Sesi (jika ada) |
| 3.0.3 | Akses URL admin ekslusif seperti `/users` secara manual | 🔴 Redirect ke halaman yang diizinkan, tidak bisa akses |
| 3.0.4 | Akses `/ip-whitelist` secara manual | 🔴 Redirect / akses ditolak |
| 3.0.5 | Akses `/system-settings` secara manual | 🔴 Redirect / akses ditolak |

---

### 3.1 — Dashboard Ka-Unit

| # | Langkah | Expected |
|---|---------|----------|
| 3.1.1 | Buka `/dashboard` | ✅ Dashboard tampil, menampilkan shortcut sesuai permission |
| 3.1.2 | Verifikasi tidak ada shortcut ke Users/Roles/Permissions | ✅ Menu manajemen admin tidak tampil |

---

### 3.2 — Rekap Unit / Role

Path: `/rekap-unit-role`

| # | Langkah | Expected |
|---|---------|----------|
| 3.2.1 | Buka `/rekap-unit-role` | ✅ Tabel rekap pegawai per unit tampil |
| 3.2.2 | Filter berdasarkan unit yang dipimpin | ✅ Data hanya pegawai unitnya |
| 3.2.3 | Filter periode bulan tertentu | ✅ Rekap sesuai periode |
| 3.2.4 | Verifikasi kolom: nama, unit, total hadir, izin, sakit, alpha | ✅ Semua kolom tampil dengan data benar |
| 3.2.5 | Coba lihat unit lain (jika ada filter) | 📋 Catat apakah filter unit dibatasi per ka-unit atau global |

---

### 3.3 — Monitoring Absensi (Ka-Unit)

Path: `/absensi`

| # | Langkah | Expected |
|---|---------|----------|
| 3.3.1 | Buka `/absensi` | ✅ Tabel absensi tampil |
| 3.3.2 | Filter by tanggal hari ini | ✅ Absensi hari ini tampil |
| 3.3.3 | Filter by unit yang dipimpin | ✅ Hanya pegawai unit terkait |
| 3.3.4 | Klik detail absensi | ✅ Modal detail tampil |
| 3.3.5 | Coba edit atau hapus absensi | ⚠️ Sesuai permission — catat apakah ka-unit diizinkan edit |

---

### 3.4 — Approval Absensi (Ka-Unit)

Path: `/approval`

| # | Langkah | Expected |
|---|---------|----------|
| 3.4.1 | Buka `/approval` | ✅ Pengajuan koreksi dari pegawai unit tampil |
| 3.4.2 | Approve pengajuan dari pegawai unit sendiri | ✅ Status berubah APPROVED |
| 3.4.3 | Reject dengan alasan | ✅ Status REJECTED, alasan tersimpan |
| 3.4.4 | Coba approve pengajuan dari unit lain | ⚠️ Catat apakah diizinkan atau ditolak |
| 3.4.5 | Verifikasi log audit approval | ✅ Riwayat tindakan ka-unit tampil |

---

### 3.5 — Monitor Sesi (Ka-Unit, jika diizinkan)

Path: `/sessions-monitor`

| # | Langkah | Expected |
|---|---------|----------|
| 3.5.1 | Buka `/sessions-monitor` | ✅ Sesi aktif tampil |
| 3.5.2 | Coba Force Logout sesi orang lain | ⚠️ Catat apakah permission UPDATE diizinkan untuk ka-unit |
| 3.5.3 | Akses statistik sesi | ✅ Statistik tampil |

---

## BAGIAN 4 — PENGUJIAN LINTAS PERAN

### 4.1 — Responsivitas Mobile

| # | Langkah | Expected |
|---|---------|----------|
| 4.1.1 | Buka halaman manapun di viewport 375px (mobile) | ✅ Tidak ada elemen terpotong, tombol dapat diklik |
| 4.1.2 | Buka sidebar admin di mobile | ✅ Hamburger menu berfungsi, sidebar slide in/out |
| 4.1.3 | Buka halaman Monitoring Absensi di mobile | ✅ Tabel scroll horizontal, data tetap terbaca |
| 4.1.4 | Form check-in di mobile | ✅ Input, dropdown, tombol terlihat dan dapat digunakan |

---

### 4.2 — Penanganan Error & Edge Cases

| # | Langkah | Expected |
|---|---------|----------|
| 4.2.1 | Matikan koneksi internet → lakukan aksi apapun | ✅ Pesan error jaringan muncul, tidak crash |
| 4.2.2 | Akses halaman yang tidak ada (misal `/abc123`) | ✅ Redirect ke `/` atau halaman 404 |
| 4.2.3 | Token JWT expired (tunggu atau manipulasi) → lakukan request | ✅ Auto-refresh token atau redirect ke login |
| 4.2.4 | Submit form dengan semua field kosong | 🔴 Semua validasi client-side muncul |
| 4.2.5 | Input karakter sangat panjang di field teks | ✅ Field terbatas/terpotong, tidak crash |

---

### 4.3 — Keamanan Frontend

| # | Langkah | Expected |
|---|---------|----------|
| 4.3.1 | User biasa akses URL admin `/users` secara langsung | 🔴 Redirect ke halaman pertama yang diizinkan |
| 4.3.2 | Ka-unit akses `/ip-whitelist` atau `/system-settings` | 🔴 Tidak bisa, redirect |
| 4.3.3 | Cek token tidak tersimpan di URL atau console log | ✅ Token hanya di localStorage / cookie |
| 4.3.4 | Setelah logout, cek localStorage terhapus | ✅ Access token tidak ada di storage |

---

## Catatan Pelaporan Bug

Setiap bug yang ditemukan dicatat dengan format:

```
ID Bug    : BUG-XXX
Judul     : [deskripsi singkat]
Role      : Admin / User / Ka-Unit
URL       : /halaman-terkait
Langkah   : 1. ... 2. ... 3. ...
Expected  : ...
Actual    : ...
Severity  : Critical / Major / Minor / Trivial
Screenshot: [attach]
```

---

*Dokumen ini dibuat berdasarkan kondisi sistem per tanggal 2 Maret 2026.*
