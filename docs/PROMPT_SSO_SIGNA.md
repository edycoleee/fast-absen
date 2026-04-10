# Best Practice Arsitektur Aplikasi RS: SSO Global, Signature Service, dan Aplikasi Konsumen

Dokumen ini merangkum arah arsitektur yang paling sehat jika ekosistem aplikasi rumah sakit akan terus bertambah, misalnya absensi, SIMRS web, finance, inventory, surat-menyurat, dan aplikasi lain yang nantinya harus berbagi identitas user yang sama.

Target utamanya bukan hanya membuat login terpusat, tetapi membangun fondasi yang stabil agar setiap aplikasi baru dapat terhubung ke sistem identitas yang sama tanpa mengulang logika autentikasi dan tanpa mencampur domain bisnis satu sama lain.

---

## 1. Arah Arsitektur yang Direkomendasikan

Arsitektur terbaik untuk kebutuhan ini adalah memisahkan tanggung jawab sistem menjadi tiga lapisan utama.

Lapisan pertama adalah aplikasi absen yang berevolusi menjadi **SSO global**. Dalam model ini, aplikasi absen tidak lagi diposisikan hanya sebagai sistem absensi, tetapi sebagai pusat identitas seluruh aplikasi rumah sakit. Semua proses login, logout, refresh token, status user aktif, informasi dasar pegawai, dan penerbitan token dilakukan di sini.

Lapisan kedua adalah **Signature Service** yang berdiri sebagai service tersendiri. Service ini fokus hanya pada domain tanda tangan elektronik: penyimpanan spesimen, manajemen dokumen PDF, proses embed tanda tangan, audit trail immutable, serta integrasi antar aplikasi melalui token atau service credential.

Lapisan ketiga adalah **aplikasi konsumen**, seperti SIMRS web, finance, inventory, surat-menyurat, dan aplikasi lain. Aplikasi-aplikasi ini tidak lagi membuat sistem login sendiri. Mereka memanfaatkan SSO untuk autentikasi, lalu bila membutuhkan fitur tanda tangan akan memanggil Signature Service.

Dengan pendekatan ini, Anda mendapatkan pemisahan tanggung jawab yang jelas:

- SSO menjawab pertanyaan: siapa user ini.
- Service masing-masing menjawab pertanyaan: user ini boleh melakukan apa di domain saya.
- Signature Service menjawab pertanyaan: bagaimana dokumen ditandatangani dan dicatat secara aman.

---

## 2. Prinsip Best Practice yang Perlu Dijaga

### 2.1 SSO hanya pusat identitas, bukan pusat semua permission bisnis

Ini prinsip terpenting. Jangan menjadikan SSO sebagai tempat seluruh permission granular semua aplikasi. Jika semua role dan permission finance, inventory, surat, SIMRS, dan signature ditumpuk di SSO, maka SSO akan menjadi terlalu gemuk, sulit diubah, dan setiap perubahan kecil di satu domain akan memaksa perubahan di pusat.

Best practice yang lebih sehat adalah:

- SSO menyimpan identitas global user.
- Setiap service menyimpan role dan permission bisnis lokalnya sendiri.

Artinya, SSO tahu bahwa user bernama A, NIK sekian, aktif, berasal dari unit tertentu, dan memiliki atribut organisasi dasar. Tetapi keputusan seperti boleh approve pengeluaran, mengubah stok gudang, menandatangani surat direktur, atau mengakses audit log spesimen tetap diputuskan oleh service masing-masing.

### 2.2 Gunakan NIK sebagai kunci identitas global antar aplikasi

Kalau seluruh sistem rumah sakit akan terhubung, NIK adalah pilihan yang tepat sebagai identitas global antar service. Setiap token yang diterbitkan oleh SSO sebaiknya selalu membawa NIK sebagai claim utama. Service lain menggunakan NIK itu untuk mengenali user dan memetakan akses lokal.

Dengan pola ini:

- Satu pegawai hanya punya satu identitas global.
- Setiap service tetap boleh punya tabel akses lokal sendiri.
- Relasi antar sistem tetap konsisten karena semua berbasis NIK.

### 2.3 Pisahkan authentication dan authorization

Authentication adalah proses membuktikan identitas user. Ini tanggung jawab SSO.

Authorization adalah proses menentukan apa yang boleh dilakukan user dalam aplikasi tertentu. Ini tanggung jawab service tujuan.

Kalau dua hal ini dipisah dengan disiplin, arsitektur Anda akan lebih mudah dirawat, lebih mudah diaudit, dan lebih mudah dikembangkan saat aplikasi bertambah.

### 2.4 Jadikan setiap service sebagai domain yang mandiri

Finance, inventory, surat-menyurat, signature, dan SIMRS adalah domain yang berbeda. Masing-masing harus punya:

- database schema sendiri,
- logika bisnis sendiri,
- audit log sendiri,
- role dan permission lokal sendiri,
- siklus deployment sendiri.

Jangan menggabungkan rule bisnis semua aplikasi ke satu backend pusat hanya karena user-nya sama. User boleh sama, tetapi tanggung jawab domain harus tetap terisolasi.

### 2.5 Gunakan token yang sederhana, stabil, dan cukup informatif

Token SSO tidak perlu membawa semua permission seluruh sistem. Itu justru berbahaya dan sulit dipelihara. Token cukup membawa identitas global yang stabil, misalnya:

- `sub` atau global user id,
- `nik`,
- `username`,
- `full_name`,
- `unit_id` atau unit kerja utama,
- `is_active`,
- `session_id`,
- `iat`, `exp`, dan `iss`.

Permission detail cukup di-resolve oleh masing-masing service saat request masuk.

### 2.6 Audit dipisah antara platform dan domain

SSO wajib punya audit login platform, seperti login berhasil, login gagal, logout, refresh token, revoke session, dan perubahan data user.

Setiap service juga wajib punya audit domain. Signature Service mencatat siapa menandatangani dokumen, kapan, dari IP mana, dan dokumen mana. Finance mencatat approval transaksi. Inventory mencatat perubahan stok. Surat-menyurat mencatat disposisi dan penandatanganan surat.

Jangan mencampur semua audit ke satu tabel generik jika kebutuhan operasionalnya berbeda.

---

## 3. Bentuk Arsitektur yang Disarankan

Narasi arsitekturnya seperti ini.

Pengguna rumah sakit, baik admin, staf, dokter, perawat, maupun manajemen, login melalui SSO global. Setelah berhasil login, SSO menerbitkan access token dan refresh token. Token ini menjadi identitas resmi user di seluruh ekosistem aplikasi.

Saat user membuka SIMRS, finance, inventory, atau surat-menyurat, aplikasi tersebut memverifikasi token dari SSO. Setelah identitas tervalidasi, aplikasi membaca mapping akses lokal berdasarkan NIK user. Dengan begitu aplikasi tetap bisa membuat aturan bisnis sendiri tanpa menggantungkan seluruh otorisasi ke SSO.

Jika salah satu aplikasi membutuhkan tanda tangan elektronik, aplikasi itu tidak memproses tanda tangan sendiri. Ia memanggil Signature Service sambil mengirim token user atau service credential yang sah. Signature Service kemudian memastikan user valid, mencari spesimen aktif berdasarkan NIK atau user mapping yang sesuai, memproses dokumen, mencatat audit trail, lalu mengembalikan hasil dokumen bertandatangan.

Pola ini membuat SSO menjadi fondasi identitas, Signature Service menjadi layanan bersama lintas aplikasi, dan aplikasi domain tetap fokus pada kebutuhan bisnis masing-masing.

---

## 4. Pembagian Tanggung Jawab Sistem

### 4.1 SSO Global

SSO global sebaiknya menangani hal-hal berikut:

- login dan logout semua user,
- refresh token dan session lifecycle,
- master user global,
- identitas utama seperti NIK, nama, email, unit, jabatan, status aktif,
- manajemen aplikasi client yang diizinkan menggunakan SSO,
- audit login dan session,
- optional single sign-out jika seluruh aplikasi sudah matang.

SSO tidak sebaiknya menangani:

- permission granular finance,
- workflow inventory,
- approval surat,
- audit dokumen signature,
- logika bisnis SIMRS.

### 4.2 Signature Service

Signature Service sebaiknya menangani:

- spesimen tanda tangan per user,
- validasi kepemilikan spesimen,
- upload dan penyimpanan PDF asli,
- proses embed tanda tangan ke PDF,
- audit trail immutable,
- kebijakan siapa yang boleh menandatangani dokumen,
- API integrasi untuk aplikasi lain.

Signature Service sebaiknya tidak menjadi tempat login utama user. Ia cukup mempercayai identitas dari SSO.

### 4.3 Aplikasi Konsumen

Aplikasi seperti SIMRS, finance, inventory, dan surat-menyurat sebaiknya menangani:

- UI dan workflow bisnis masing-masing,
- penyimpanan data domain masing-masing,
- role dan permission lokal per aplikasi,
- integrasi ke SSO untuk autentikasi,
- integrasi ke Signature Service jika butuh tanda tangan.

---

## 5. Role dan Permission: Di Mana Harus Disimpan

Best practice untuk role dan permission adalah model dua lapis.

### 5.1 Role global di SSO

SSO boleh menyimpan role global yang sifatnya lintas platform dan tidak terlalu granular, misalnya:

- `superadmin_platform`
- `pegawai_aktif`
- `kepala_unit`
- `dokter`
- `perawat`
- `admin_sdm`

Role ini berguna untuk identitas organisasi dan kebijakan lintas aplikasi secara umum.

### 5.2 Role lokal di masing-masing service

Setiap service menyimpan role dan permission lokalnya sendiri. Contohnya:

- Finance: `finance_admin`, `finance_approver`, `cashier`, `auditor`
- Inventory: `gudang_admin`, `stok_opname`, `purchasing`, `viewer`
- Surat-menyurat: `pembuat_surat`, `verifikator`, `penandatangan`
- Signature: `specimen_owner`, `signature_admin`, `api_client_manager`
- SIMRS: role sesuai modul klinis dan administratif yang relevan

Ini jauh lebih fleksibel dan tidak membebani SSO dengan logika bisnis yang terus berubah.

### 5.3 Kunci relasi menggunakan NIK

Di setiap service, Anda dapat menyimpan tabel mapping berbasis NIK. Misalnya:

- `finance_user_access` dengan kolom `nik`, `role`, `is_active`
- `inventory_user_access` dengan kolom `nik`, `role`, `warehouse_id`
- `signature_user_profile` dengan kolom `nik`, `specimen_status`

Dengan model ini, service tetap independen, tetapi identitas user tetap konsisten di semua tempat.

---

## 6. Langkah Tahapan Membangun yang Direkomendasikan

Urutan implementasi sangat menentukan keberhasilan. Jangan membangun semua service sekaligus. Bangun fondasi terlebih dahulu.

### Tahap 1. Rapikan domain aplikasi absen menjadi fondasi SSO

Pada tahap ini, fokusnya adalah mengubah aplikasi absen dari aplikasi domain tunggal menjadi pusat identitas global.

Yang perlu dilakukan:

1. Rapikan master user global.
2. Pastikan setiap user memiliki NIK yang unik dan tervalidasi.
3. Pisahkan data identitas global dari data absensi yang murni domain bisnis.
4. Bangun endpoint auth yang stabil: login, refresh, logout, me, session list, revoke session.
5. Tambahkan tabel client aplikasi jika nantinya ada banyak aplikasi konsumen.
6. Tambahkan audit login dan audit session.
7. Tentukan format token yang konsisten untuk semua aplikasi.

Output akhir tahap ini adalah satu service SSO yang sudah cukup matang untuk dipakai aplikasi lain.

### Tahap 2. Tentukan standar integrasi SSO untuk seluruh aplikasi

Sebelum membangun banyak aplikasi, tetapkan kontrak integrasi lebih dulu.

Yang perlu dilakukan:

1. Tentukan apakah aplikasi konsumen memakai JWT bearer token, authorization code flow, atau session berbasis gateway internal.
2. Tetapkan issuer token, audience, masa berlaku access token, dan masa berlaku refresh token.
3. Tentukan endpoint introspection atau public key verification jika diperlukan.
4. Definisikan claim token standar, minimal `sub`, `nik`, `role_global`, `unit`, `iat`, `exp`.
5. Definisikan mekanisme logout global atau minimal revoke token.

Output akhir tahap ini adalah standar integrasi yang bisa dipakai berulang di semua aplikasi rumah sakit.

### Tahap 3. Bangun Signature Service sebagai shared service kedua

Setelah SSO stabil, barulah bangun Signature Service.

Yang perlu dilakukan:

1. Buat database dan schema terpisah untuk signature.
2. Simpan referensi user menggunakan NIK sebagai identitas utama integrasi.
3. Bangun endpoint specimen capture dan manajemen spesimen aktif.
4. Bangun endpoint upload PDF, preview, embed, dan download.
5. Implementasikan audit trail immutable.
6. Pastikan Signature Service bisa memverifikasi token dari SSO.
7. Siapkan juga pola machine-to-machine untuk aplikasi backend yang butuh integrasi tanpa login interaktif.

Output akhir tahap ini adalah service tanda tangan yang bisa dipakai oleh SIMRS, surat-menyurat, dan aplikasi lain.

### Tahap 4. Integrasikan aplikasi prioritas satu per satu

Jangan menghubungkan semua aplikasi sekaligus. Pilih aplikasi dengan dampak tertinggi lebih dahulu.

Urutan yang masuk akal biasanya:

1. SIMRS web untuk login SSO.
2. Surat-menyurat untuk kebutuhan tanda tangan.
3. Finance untuk auth terpusat.
4. Inventory untuk auth terpusat.

Di setiap aplikasi, lakukan hal yang sama:

1. Hapus login lokal atau ubah menjadi delegasi ke SSO.
2. Simpan mapping role lokal berdasarkan NIK.
3. Tambahkan middleware verifikasi token SSO.
4. Tambahkan audit lokal sesuai domain.
5. Jika perlu tanda tangan, hubungkan ke Signature Service.

### Tahap 5. Bangun governance dan operasional platform

Saat service mulai bertambah, masalah utama bukan lagi coding, tetapi governance.

Yang perlu dilakukan:

1. Standarkan format response API.
2. Standarkan logging dan correlation id antar service.
3. Buat naming convention untuk service, role, permission, dan audit event.
4. Tetapkan standar deploy, backup, rotasi secret, dan monitoring.
5. Pisahkan environment development, staging, dan production.
6. Siapkan dokumentasi integrasi untuk tim pengembang internal.

---

## 7. Rekomendasi Data Model Tingkat Tinggi

### 7.1 Di SSO

Minimal ada komponen data berikut:

- `users`
- `user_profiles`
- `user_sessions`
- `oauth_clients` atau `app_clients`
- `login_audit_logs`
- `global_roles`
- optional `user_global_roles`

Field penting di user global:

- `id`
- `nik`
- `username`
- `email`
- `full_name`
- `unit_id`
- `position`
- `is_active`

### 7.2 Di Signature Service

Minimal ada:

- `signature_users` atau mapping user berbasis `nik`
- `specimens`
- `pdf_documents`
- `embed_logs`
- `api_clients` atau trusted consumer registry bila perlu

### 7.3 Di Aplikasi Konsumen

Minimal ada mapping akses lokal, misalnya:

- `app_user_access`
- `app_roles`
- `app_permissions`
- `app_role_permissions`

Jika perlu, aplikasi konsumen boleh menyimpan snapshot profil tertentu dari SSO untuk kebutuhan performa, tetapi sumber kebenaran identitas tetap di SSO.

---

## 8. Risiko Umum yang Harus Dihindari

### 8.1 Menjadikan aplikasi absen sebagai super-monolith

Kalau semua auth, semua permission, semua workflow, dan semua integrasi ditaruh di sana, aplikasi akan cepat sulit dipelihara. Posisi yang benar adalah absen menjadi sumber identitas, bukan pemilik semua domain.

### 8.2 Menaruh semua permission lintas aplikasi di token

Token akan menjadi besar, cepat usang, dan rawan inkonsistensi saat ada perubahan role. Gunakan token untuk identitas, bukan seluruh aturan bisnis.

### 8.3 Tidak memakai NIK secara konsisten

Kalau satu aplikasi memakai username, yang lain email, yang lain id lokal, integrasi akan cepat berantakan. Pilih NIK sebagai identity key dan gunakan secara konsisten.

### 8.4 Mencampur audit login dan audit bisnis

Login ke sistem bukan hal yang sama dengan menandatangani dokumen atau menyetujui transaksi. Pisahkan audit platform dan audit domain.

### 8.5 Membuat semua aplikasi tergantung penuh ke database SSO

Integrasi harus lewat API atau token yang tervalidasi, bukan dengan membiarkan semua aplikasi membaca database SSO secara langsung. Database coupling akan menjadi sumber masalah besar di kemudian hari.

---

## 9. Urutan Prioritas yang Paling Realistis

Kalau ingin mulai dengan cara yang aman dan tetap pragmatis, urutan terbaik adalah sebagai berikut.

1. Selesaikan fondasi SSO pada aplikasi absen.
2. Pastikan NIK bersih dan unik untuk seluruh user.
3. Tetapkan format token dan kontrak integrasi.
4. Bangun Signature Service sebagai shared service pertama setelah SSO.
5. Integrasikan SIMRS web sebagai konsumen pertama.
6. Lanjutkan ke surat-menyurat karena paling dekat dengan kebutuhan signature.
7. Setelah pola stabil, baru masukkan finance dan inventory.

Urutan ini lebih aman daripada mencoba membangun semua aplikasi bersama-sama sejak awal.

---

## 10. Kesimpulan Rekomendasi

Model terbaik untuk aplikasi Anda adalah:

- aplikasi absen berkembang menjadi SSO global,
- Signature Service dibangun sebagai service mandiri,
- aplikasi lain menjadi konsumen SSO dan, bila perlu, konsumen Signature Service,
- NIK dipakai sebagai kunci identitas global antar sistem,
- role global yang sederhana boleh disimpan di SSO,
- permission bisnis detail tetap dikelola di masing-masing service.

Pendekatan ini paling cocok untuk lingkungan rumah sakit karena jumlah aplikasi akan bertambah, kebutuhan audit akan tinggi, dan setiap domain punya aturan operasional yang berbeda. Dengan fondasi seperti ini, Anda tidak sekadar membangun aplikasi, tetapi membangun platform internal yang bisa berkembang dengan tertib.

---

## 11. Langkah Eksekusi Praktis Minggu Pertama

Kalau ingin langsung mulai bekerja, ini urutan kerja paling praktis untuk tahap awal:

1. Finalkan desain identitas global user berbasis NIK.
2. Audit tabel user di aplikasi absen dan pisahkan mana data identitas global, mana data absensi.
3. Definisikan endpoint SSO minimum: login, refresh, me, logout.
4. Definisikan payload token standar yang akan dipakai semua aplikasi.
5. Tulis dokumen integrasi SSO untuk aplikasi konsumen.
6. Setelah itu baru mulai desain database dan endpoint Signature Service.
7. Pilih satu aplikasi konsumen pertama, idealnya SIMRS atau surat-menyurat, untuk pilot integration.

Kalau tahap ini dikerjakan dengan disiplin, penambahan finance, inventory, dan aplikasi lain akan jauh lebih mudah.
