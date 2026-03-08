# Frontend Technology Notes

## Tujuan Dokumen
Dokumen ini membantu memahami perbedaan arsitektur frontend:
1. `By-Feature`
2. `Clean 4-Layer`
3. `Hybrid` (gabungan terbaik)

Fokus utama: kapan memilih masing-masing metode, trade-off yang nyata di project, dan langkah migrasi yang aman.

---

## 1. Metode By-Feature

### Konsep
Kode diorganisasi berdasarkan fitur bisnis. Contoh: `users`, `roles`, `dashboard`, `auth`. Setiap fitur biasanya berisi `page`, `components`, `hooks`, kadang `api` sendiri.

Contoh struktur:

```text
src/
  features/
    users/
      pages/
      components/
      hooks/
      api/
    roles/
      pages/
      components/
      hooks/
      api/
  shared/
    components/
    utils/
```

### Kelebihan
- Mudah dipahami saat awal project.
- Developer cepat menemukan semua file untuk satu fitur.
- Cocok untuk tim yang bekerja per domain fitur.
- Fitur bisa dihapus relatif mudah (secara folder).

### Kekurangan
- Risiko duplikasi tinggi (logic CRUD, fetching, form handling).
- `shared/` sering membesar tanpa batas dan jadi dumping ground.
- Inconsistency antar fitur (coding style, error handling, loading state).
- Sulit menjaga standar global (auth handling, API interceptor, retry policy).

### Kapan Cocok
- Project kecil hingga menengah awal.
- Scope fitur masih sedikit.
- Kecepatan delivery lebih penting daripada standardisasi jangka panjang.
- Tim kecil (1-3 orang) dan komunikasi rapat.

---

## 2. Metode Clean 4-Layer

### Konsep
Kode diorganisasi berdasarkan tanggung jawab teknis (layer), bukan domain fitur.

Urutan layer:
1. `Core`: entities, constants, nilai inti aplikasi.
2. `Data`: API client, repository, storage.
3. `Domain`: business logic, hooks, context.
4. `Presentation`: pages, components, layout.

Contoh struktur:

```text
src/
  core/
    constants/
    entities/
  data/
    api/
    repositories/
    storage/
  domain/
    contexts/
    hooks/
  presentation/
    components/
    pages/
    layout/
```

### Kelebihan
- Reusability tinggi karena logic terpusat.
- Arsitektur konsisten untuk semua fitur.
- Testing lebih rapi karena boundary jelas.
- Mudah scaling saat fitur bertambah banyak.
- Memudahkan onboarding developer baru yang mengikuti standar layer.

### Kekurangan
- Learning curve lebih tinggi di awal.
- Untuk perubahan kecil, kadang harus sentuh beberapa layer.
- Navigasi bisa terasa tersebar jika belum terbiasa.
- Bisa terasa over-engineered untuk aplikasi sangat kecil.

### Kapan Cocok
- Project menengah hingga besar.
- Banyak fitur berbagi logic (auth, pagination, filtering, upload).
- Tim bertambah dan perlu standar kuat.
- Ada target maintainability 1-3 tahun ke depan.

---

## 3. Perbandingan Praktis

| Aspek | By-Feature | Clean 4-Layer |
|---|---|---|
| Kecepatan start awal | Sangat cepat | Sedang |
| Konsistensi jangka panjang | Rendah-sedang | Tinggi |
| Reusability lintas fitur | Sedang-rendah | Tinggi |
| Risiko duplikasi | Tinggi | Rendah |
| Cocok untuk skala besar | Kurang | Sangat cocok |
| Onboarding tim baru | Mudah awal, sulit saat besar | Sedikit sulit awal, stabil saat besar |
| Maintainability | Menurun seiring growth | Cenderung stabil |

---

## 4. Metode Hybrid (Rekomendasi Praktis)

### Ide Utama
Gunakan layer untuk logic bersama, tetapi gunakan by-feature untuk penyusunan UI di `presentation`.

Pola umum:
- `core`, `data`, `domain` tetap global dan reusable.
- `presentation` dipecah by-feature agar navigasi UI tetap natural.

Contoh struktur hybrid:

```text
src/
  core/
    constants/
    entities/

  data/
    api/client.js
    repositories/
      BaseRepository.js
      UserRepository.js
      RoleRepository.js

  domain/
    contexts/
      AuthContext.jsx
    hooks/
      useAuth.js
      useFetch.js
      useForm.js
      usePagination.js

  presentation/
    components/common/
      Button.jsx
      Modal.jsx
      Table.jsx

    features/
      users/
        pages/UsersPage.jsx
        components/UserTable.jsx
        components/UserForm.jsx
      roles/
        pages/RolesPage.jsx
        components/RoleTable.jsx

    layout/
      AdminLayout.jsx
```

### Kenapa Hybrid Sering Menang
- UI tetap enak dicari karena by-feature.
- Logic tidak duplikasi karena tetap lewat layer shared.
- Cocok untuk pertumbuhan bertahap tanpa refactor besar.
- Balance antara speed dan maintainability.

---

## 5. Decision Guide (Kapan Memakai Apa)

Gunakan `By-Feature` jika:
- Anda sedang prototyping.
- Fitur masih sedikit.
- Deadline sangat ketat.
- Tim sangat kecil.

Gunakan `Clean 4-Layer` jika:
- Aplikasi akan berkembang besar.
- Banyak flow lintas fitur.
- Perlu quality gate dan testing yang kuat.
- Ada rencana maintain jangka panjang.

Gunakan `Hybrid` jika:
- Anda ingin tetap cepat, tapi tidak ingin technical debt terlalu cepat menumpuk.
- Sudah punya beberapa fitur dan mulai merasakan duplikasi logic.
- Ingin migrasi bertahap, bukan rewrite penuh.

---

## 6. Red Flags (Tanda Harus Ganti Pendekatan)

Tanda by-feature mulai bermasalah:
- Logic token refresh ada di banyak file.
- Banyak hook mirip hanya beda endpoint.
- Bug fix harus copy ke banyak fitur.
- Folder `shared/` menjadi acak dan sulit dipelihara.

Tanda clean 4-layer terlalu berat:
- Fitur sangat sedikit, tapi struktur terlalu kompleks.
- Developer sering bypass architecture karena merasa terlalu lambat.

---

## 7. Strategi Migrasi By-Feature -> Hybrid (Tanpa Rewrite)

Langkah aman bertahap:
1. Standarkan `api client` tunggal dengan interceptor global.
2. Buat `BaseRepository` untuk pola CRUD umum.
3. Pindahkan hook generic (`useFetch`, `useForm`, `usePagination`) ke `domain/hooks`.
4. Sisakan UI spesifik tetap di folder fitur (`presentation/features/...`).
5. Pindahkan komponen reusable ke `presentation/components/common`.
6. Tambahkan aturan import sederhana (misal: presentation tidak akses data langsung, lewat domain hook).
7. Refactor per fitur, bukan sekali besar.

---

## 8. Aturan Praktis untuk Menjaga Arsitektur Tetap Sehat

- Satu sumber kebenaran untuk auth token handling: `data/api/client.js`.
- Semua call backend lewat repository, jangan langsung `axios` di page.
- Page fokus pada komposisi UI, bukan business logic berat.
- Hook domain fokus pada state, orchestration, dan transform data.
- Komponen common harus benar-benar generic, bukan specific satu fitur.
- Gunakan naming konsisten: `useUsers`, `UserRepository`, `UsersPage`.

---

## 9. Rekomendasi untuk Gaya Project Anda

Karena Anda terbiasa `by-feature` (fitur berisi `database/context/page`), pendekatan paling realistis adalah `Hybrid`.

Strategi yang disarankan:
- Tetap by-feature untuk `presentation/features` agar developer nyaman.
- Pusatkan data access dan auth handling di `data` layer.
- Pusatkan business hook reusable di `domain` layer.
- Gunakan `core` untuk constants, route map, dan entity factory.

Hasilnya:
- Kurva belajar tetap landai.
- Kualitas arsitektur naik.
- Refactor bertahap tanpa mengganggu delivery.

---

## 10. Ringkasan Singkat

- `By-Feature`: cepat dan intuitif, tapi rawan duplikasi saat skala naik.
- `Clean 4-Layer`: rapi, scalable, maintainable, tapi butuh disiplin dan setup awal.
- `Hybrid`: kompromi terbaik untuk banyak tim produk modern.

Jika tujuan Anda adalah membangun aplikasi baru yang cepat jalan tapi tetap sehat jangka panjang, pilih `Hybrid` sebagai default.
