# Auth, Permission, Menu, dan Route Guard

Dokumen ini menjelaskan cara kerja pengaturan akses pada aplikasi ini saat ini, apa yang sudah benar, apa yang perlu dijaga, dan bagaimana pola best practice yang umum dipakai di aplikasi besar.

## 1. Tujuan Pengaturan Akses

Dalam aplikasi ini, ada 4 lapisan yang harus dipisahkan dengan jelas:

1. Authentication
	Memastikan siapa user yang login.

2. Authorization
	Menentukan apa yang boleh dilakukan user.

3. Navigation / Menu Visibility
	Menentukan menu apa yang ditampilkan di sidebar atau dashboard.

4. Route Guard
	Menentukan halaman apa yang boleh dibuka dari frontend sebelum request dikirim ke backend.

Kalau 4 lapisan ini dicampur, hasilnya biasanya tidak konsisten:
- user bisa melihat menu tapi endpoint 403
- user tidak melihat menu, tapi tetap bisa akses URL langsung
- role tertentu terlalu luas aksesnya hanya karena diberi flag admin

Itu sebabnya aplikasi ini sekarang mulai dipisahkan menjadi:
- backend sebagai sumber kebenaran akses
- frontend hanya membaca hasil akses dan menampilkan UI yang sesuai

## 2. Implementasi Saat Ini di Aplikasi Ini

### 2.1 Authentication

Authentication dikelola di backend melalui service:

- [backend/services/auth_service.py](/home/sultan/fast-absen/backend/services/auth_service.py)

Saat login berhasil, backend mengembalikan:
- `access_token`
- `refresh_token`
- `roles`
- `permissions`
- `menu_guard`
- `session_id`

Di frontend, data ini disimpan di auth context:

- [frontend/src/domain/contexts/AuthContext.jsx](/home/sultan/fast-absen/frontend/src/domain/contexts/AuthContext.jsx)

State user di frontend berisi:
- daftar role
- daftar permission
- `menu_guard`

Artinya, frontend tidak menghitung izin dari nol. Frontend menerima konteks akses dari backend.

### 2.2 Authorization

Authorization utama tetap ada di backend melalui permission per endpoint.

Contoh pola endpoint:
- `require_permission(PermissionKeys.ROSTER_UPLOAD_BATCH_READ)`
- `require_permission(PermissionKeys.SHIFT_KELOMPOK_CREATE)`

Pola ini benar, karena rule final harus diputuskan di server, bukan di browser.

### 2.3 Menu Guard

Backend membentuk `menu_guard` di:

- [backend/services/auth_service.py](/home/sultan/fast-absen/backend/services/auth_service.py)

`menu_guard` saat ini berisi informasi inti seperti:
- `is_admin`
- `is_kepala_unit`
- `kepala_unit_scope_id`
- `menus.dashboard.visible`
- `menus.kpi_unit_role.visible`
- `menus.monitoring_absensi.visible`
- `menus.approval.visible`
- `menus.user_sessions.visible`

Secara konsep, `menu_guard` adalah ringkasan izin yang lebih mudah dipakai frontend.

### 2.4 Sidebar / Menu Rendering

Sidebar dibentuk di:

- [frontend/src/presentation/components/layout/Layout.jsx](/home/sultan/fast-absen/frontend/src/presentation/components/layout/Layout.jsx)

Implementasi sekarang sudah lebih baik dibanding pola lama, karena:
- menu operasional mengikuti `menu_guard.menus.*.visible`
- menu admin tertentu mengikuti permission spesifik
- sebagian halaman sensitif dibatasi hanya untuk `admin` dan `super-admin`

Contoh logika saat ini:
- `roster-upload` muncul bila punya `roster_upload_batch.read`
- `roster-adapter` muncul bila punya `roster_adapter.read`
- `pegawai` muncul bila punya `pegawai.create`
- `system-settings` hanya muncul untuk role penuh `admin` atau `super-admin`

### 2.5 Route Guard Frontend

Route guard ada di:

- [frontend/src/presentation/components/common/PrivateRoute.jsx](/home/sultan/fast-absen/frontend/src/presentation/components/common/PrivateRoute.jsx)

Fungsinya:
- redirect ke login bila belum login
- blok akses ke URL tertentu bila permission tidak sesuai
- redirect ke halaman fallback yang masih boleh diakses

Ini penting karena menu yang disembunyikan saja tidak cukup. User tetap bisa mengetik URL langsung.

## 3. Masalah yang Pernah Muncul di Aplikasi Ini

Kasus nyata yang muncul sebelumnya:

### 3.1 `is_admin` terlalu luas

Ketika `admin-unit` diberi `is_admin = true`, user langsung dianggap admin untuk banyak route.

Akibatnya:
- bisa melihat sidebar admin
- bisa membuka URL admin langsung
- padahal tidak semua halaman seharusnya boleh

Root cause-nya adalah rule akses di frontend terlalu bergantung pada satu flag besar: `is_admin`.

### 3.2 Menu dan route tidak selalu pakai rule yang sama

Awalnya bisa terjadi:
- sidebar sudah disembunyikan
- tapi route masih terbuka

Atau sebaliknya:
- route sudah ditutup
- tapi menu masih muncul

Ini masalah klasik bila rule menu dan rule route ditulis terpisah tanpa basis capability yang konsisten.

### 3.3 Permission read vs create untuk membuka halaman

Di beberapa halaman admin, keputusan “boleh buka halaman atau tidak” sekarang memakai permission `create`.

Contoh:
- `/pegawai` dibuka jika punya `pegawai.create`
- `/unit` dibuka jika punya `unit.create`

Ini bisa jalan secara praktis, tetapi secara desain kurang ideal. User yang hanya perlu melihat data tidak akan bisa masuk halaman walaupun punya `read`.

## 4. Desain yang Sedang Dipakai Sekarang

Secara praktis, aplikasi ini sekarang bergerak ke model berikut:

### Layer A: Role

Role dipakai untuk pengelompokan besar.

Contoh:
- `super-admin`
- `admin`
- `admin-unit`
- `ka-unit`
- `user`

Role membantu administrasi, tetapi role tidak boleh menjadi satu-satunya dasar akses.

### Layer B: Permission

Permission adalah rule paling penting untuk akses endpoint dan fitur.

Contoh:
- `roster_upload_batch.read`
- `roster_upload_batch.create`
- `pegawai.read`
- `pegawai.create`
- `approval_pengajuan_absensi.read`

Permission adalah kontrak akses yang paling presisi.

### Layer C: Menu Guard

`menu_guard` adalah bentuk turunan dari role + permission + scope.

Ia dipakai frontend untuk:
- menampilkan dashboard yang sesuai
- menentukan menu operasional
- menentukan endpoint KPI admin vs kepala unit

### Layer D: Route Guard

Frontend memakai gabungan:
- `menu_guard`
- `permissions`
- `roles`

untuk menahan akses URL yang tidak sesuai.

### Layer E: Backend Permission Enforcement

Backend tetap final authority.

Meskipun frontend salah render menu atau route, backend tetap harus menolak request bila permission tidak sesuai.

Ini adalah prinsip paling penting.

## 5. Best Practice di Aplikasi Besar

Di aplikasi besar, pengaturan akses biasanya mengikuti prinsip berikut.

### 5.1 Backend adalah source of truth

Aplikasi besar tidak mempercayai frontend untuk penentuan akses final.

Frontend hanya untuk:
- pengalaman user
- sembunyikan menu yang tidak relevan
- hindari klik yang pasti 403

Tetapi keputusan final tetap di backend.

Prinsip ini sudah benar dan harus dipertahankan.

### 5.2 Gunakan permission granular, bukan hanya role besar

Aplikasi besar tidak berhenti di level:
- admin
- manager
- user

Karena dalam praktiknya selalu muncul kebutuhan seperti:
- admin-unit boleh roster tapi tidak boleh user management
- kepala unit boleh lihat KPI unit sendiri tapi tidak seluruh unit
- user tertentu boleh approval tapi tidak boleh edit data master

Karena itu, best practice adalah:
- role untuk grouping
- permission untuk rule final
- scope untuk batas data

### 5.3 Pisahkan “visibility” dan “action”

Aplikasi besar biasanya membedakan:
- boleh melihat halaman
- boleh melihat data
- boleh membuat data
- boleh mengubah data
- boleh menghapus data

Contoh capability yang lebih sehat:
- `pegawai.read_page`
- `pegawai.read`
- `pegawai.create`
- `pegawai.update`
- `pegawai.delete`

Di aplikasi ini saat ini belum dipisah sedetail itu. Yang ada masih model klasik `read/create/update/delete`.

Untuk fase sekarang masih cukup, tetapi ke depan lebih sehat jika akses halaman tidak selalu disamakan dengan permission `create`.

### 5.4 Menu jangan di-hardcode dari role saja

Pola yang kurang baik:
- kalau role admin, tampilkan semua menu

Pola yang lebih baik:
- kalau punya capability A, tampilkan menu A
- kalau punya capability B, tampilkan menu B

Itu sebabnya pengaturan menu di [frontend/src/presentation/components/layout/Layout.jsx](/home/sultan/fast-absen/frontend/src/presentation/components/layout/Layout.jsx) sebaiknya terus bergerak ke permission-based menu.

### 5.5 Route guard harus mengikuti capability yang sama dengan menu

Kalau sidebar memakai rule A, route guard juga harus memakai rule A.

Kalau tidak, akan muncul mismatch:
- menu hilang tapi URL masih bisa
- menu ada tapi URL redirect

Best practice-nya adalah punya satu mapping capability-to-route yang konsisten.

### 5.6 Scope-based access lebih penting pada aplikasi organisasi

Di aplikasi rumah sakit, unit, atasan, dan struktur organisasi sangat penting.

Best practice aplikasi besar untuk kasus seperti ini:
- bukan hanya “boleh akses modul atau tidak”
- tetapi juga “boleh akses data siapa”

Contoh:
- kepala unit boleh lihat KPI unit sendiri
- admin-unit boleh kelola roster unit tertentu
- admin pusat boleh lihat semua unit

Di aplikasi ini, fondasi scope sudah ada melalui:
- `is_kepala_unit`
- `kepala_unit_scope_id`
- endpoint KPI `my-unit`

Ini arah yang benar dan sebaiknya diperluas ke modul lain bila diperlukan.

### 5.7 Audit trail untuk perubahan hak akses

Aplikasi besar biasanya mencatat:
- siapa mengubah role
- siapa menambah permission
- siapa mencentang `is_admin`
- kapan perubahan dilakukan
- nilai sebelum dan sesudah

Ini penting untuk investigasi bila akses mendadak berubah.

Saat ini jika ingin matang, perubahan role/permission perlu punya audit log tersendiri.

### 5.8 Deny by default

Prinsip aman di aplikasi besar adalah:
- kalau rule tidak jelas, tolak dulu
- jangan izinkan dulu lalu berharap aman

Artinya:
- endpoint tanpa permission sebaiknya dianggap sensitif
- route baru tanpa mapping permission jangan otomatis terbuka
- menu baru tanpa capability jangan otomatis tampil

## 6. Rekomendasi Best Practice untuk Aplikasi Ini

Berikut rekomendasi yang paling cocok untuk kode aplikasi ini, bukan teori umum saja.

### 6.1 Tetapkan 3 level rule akses

Gunakan struktur tetap berikut:

1. Role
	Untuk grouping administratif.

2. Permission
	Untuk izin aksi dan modul.

3. Scope
	Untuk batas data organisasi.

Contoh:
- role: `admin-unit`
- permission: `roster_upload_batch.read`
- scope: `unit_id = 12`

### 6.2 Batasi penggunaan `is_admin`

`is_admin` sebaiknya dipakai hanya untuk arti berikut:
- boleh masuk shell/admin area
- boleh melihat dashboard admin
- boleh memakai layout admin

Tetapi `is_admin` jangan otomatis berarti:
- boleh semua menu
- boleh semua route
- boleh semua endpoint

Jadi pola terbaik untuk aplikasi ini:
- `is_admin` = masuk area admin
- permission = menentukan modul mana di area admin yang aktif

### 6.3 Buat route map yang eksplisit

Lebih sehat bila ada satu konfigurasi terpusat seperti:

```js
const routeAccessMap = {
  '/users': ['user.read'],
  '/roles': ['user.read'],
  '/pegawai': ['pegawai.read'],
  '/unit': ['unit.read'],
  '/shift-kelompok': ['shift_kelompok.read'],
  '/shift-aturan': ['shift_kelompok_aturan.read'],
  '/shift-pegawai': ['pegawai_shift_kelompok.read'],
  '/roster-upload': ['roster_upload_batch.read'],
  '/roster-adapter': ['roster_adapter.read'],
  '/system-settings': ['full-admin-only']
}
```

Dengan model ini, menu dan route bisa berbagi sumber rule yang sama.

### 6.4 Gunakan `read` untuk buka halaman, bukan `create`

Untuk modul CRUD, best practice lebih baik seperti ini:
- boleh buka halaman jika punya `read`
- tombol tambah aktif jika punya `create`
- tombol edit aktif jika punya `update`
- tombol hapus aktif jika punya `delete`

Ini penting supaya hak akses tidak terlalu kasar.

Contoh yang lebih sehat:
- `/pegawai` boleh dibuka bila ada `pegawai.read`
- tombol “Tambah Pegawai” hanya tampil bila ada `pegawai.create`

### 6.5 Bedakan admin penuh dan admin terbatas

Saat ini kebutuhan nyata sudah terlihat:
- `super-admin` / `admin` = admin penuh
- `admin-unit` = admin terbatas

Best practice:
- full admin: akses modul sistem dan master sensitif
- delegated admin: akses modul operasional tertentu saja

Modul yang cocok tetap full-admin-only:
- system settings
- whitelist / keamanan
- role & permission management
- user management global

### 6.6 Sinkronkan backend contract dan frontend rendering

Jika backend memutuskan:
- `approval.visible = false`

maka frontend menu dan route harus sama-sama patuh.

Jika backend memberi permission:
- `roster_adapter.read`

maka frontend harus:
- tampilkan menu adapter
- izinkan route adapter
- tetapi tetap sembunyikan tombol aksi yang butuh create/update/delete bila tidak ada

### 6.7 Tambahkan dokumentasi matriks akses

Untuk menjaga konsistensi, aplikasi ini sebaiknya punya tabel seperti berikut:

| Modul | Buka Halaman | Lihat Data | Tambah | Edit | Hapus | Scope |
|---|---|---|---|---|---|---|
| Pegawai | `pegawai.read` | `pegawai.read` | `pegawai.create` | `pegawai.update` | `pegawai.delete` | global / unit |
| Unit | `unit.read` | `unit.read` | `unit.create` | `unit.update` | `unit.delete` | global |
| Roster Upload | `roster_upload_batch.read` | `roster_upload_batch.read` | `roster_upload_batch.create` | `roster_upload_batch.update` | `roster_upload_batch.delete` | unit / global |

Dokumentasi semacam ini sangat membantu saat role baru ditambahkan.

## 7. Rekomendasi Khusus untuk Aplikasi Ini ke Depan

### Jangka pendek

1. Pertahankan backend sebagai penentu final permission.
2. Pastikan setiap halaman frontend memakai permission spesifik, bukan hanya `is_admin`.
3. Gunakan `read` sebagai syarat buka halaman jika memungkinkan.
4. Tetapkan `system-settings`, role, permission, user global sebagai full-admin-only.

### Jangka menengah

1. Rapikan `menu_guard` agar mencakup capability per modul admin utama.
2. Buat mapping terpusat antara route, menu, dan permission.
3. Pisahkan hak “lihat halaman” dan hak “aksi tombol”.
4. Tambahkan audit log perubahan role dan permission.

### Jangka panjang

1. Terapkan scope-based access yang lebih lengkap per unit.
2. Siapkan kebijakan akses berbasis policy, bukan hanya if-else per halaman.
3. Tambahkan review berkala untuk role yang terlalu besar hak aksesnya.

## 8. Kesimpulan

Arsitektur yang paling sehat untuk aplikasi ini adalah:

- authentication menentukan siapa user
- backend permission menentukan apa yang boleh dilakukan
- scope menentukan data mana yang boleh diakses
- `menu_guard` menentukan pengalaman UI yang ringkas
- frontend route guard mencegah akses URL yang tidak relevan
- backend tetap menjadi penentu akhir

Untuk aplikasi ini, arah yang benar bukan “semua akses ditentukan oleh role”, tetapi:

- role untuk identitas kelompok
- permission untuk kontrol modul dan aksi
- scope untuk batas organisasi
- menu sebagai turunan dari capability

Itulah pola yang dipakai aplikasi besar karena lebih aman, lebih mudah dirawat, dan lebih mudah dikembangkan saat struktur organisasi makin kompleks.
