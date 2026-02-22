# Frontend Admin Dashboard — Sistem Absensi RSUD Sulfat

Admin dashboard SPA berbasis React untuk mengelola sistem absensi pegawai RSUD Sulfat.

---

## Tech Stack

| Paket | Versi | Keterangan |
|---|---|---|
| React | 18.3.1 | Library UI |
| Vite | 6.4.1 | Build tool + dev server |
| @vitejs/plugin-react-swc | 3.7.2 | SWC compiler (hot reload cepat) |
| React Router DOM | 6.22.0 | Client-side routing SPA |
| Axios | 1.6.7 | HTTP client + interceptors |
| Tailwind CSS | 3.4.1 | Utility-first CSS framework |

---

## Arsitektur: Clean Architecture (Layered)

```
src/
├── core/                        # Layer 1 — Domain entities & konstanta
│   ├── constants/
│   │   ├── config.js            # API_CONFIG, STORAGE_KEYS, dll
│   │   ├── routes.js            # Route path constants
│   │   └── index.js
│   ├── entities/                # Plain object factories (User, Pegawai, dll)
│   │   ├── User.js
│   │   ├── Pegawai.js
│   │   ├── Role.js
│   │   ├── Permission.js
│   │   ├── Absensi.js
│   │   └── index.js
│   └── index.js
│
├── data/                        # Layer 2 — Akses data (API + storage)
│   ├── api/
│   │   └── client.js            # Axios instance + JWT interceptors + auto-refresh
│   ├── repositories/            # Satu file per resource, wraps apiClient
│   │   ├── AuthRepository.js
│   │   ├── UserRepository.js            # + downloadTemplate, importExcel
│   │   ├── PegawaiRepository.js         # + downloadTemplate, importExcel
│   │   ├── RoleRepository.js
│   │   ├── PermissionRepository.js
│   │   ├── UnitRepository.js
│   │   ├── AbsensiRepository.js
│   │   ├── SessionsRepository.js
│   │   ├── ApprovalRepository.js
│   │   ├── StatsRepository.js
│   │   ├── ShiftKelompokRepository.js
│   │   ├── ShiftKelompokAturanRepository.js
│   │   ├── PegawaiShiftKelompokRepository.js  # + downloadTemplate, importExcel
│   │   ├── RosterUploadBatchRepository.js
│   │   ├── RosterShiftRepository.js
│   │   ├── PenilaianShiftAbsensiRepository.js
│   │   └── index.js
│   ├── storage/
│   │   └── LocalStorage.js      # Wrapper aman untuk localStorage
│   └── index.js
│
├── domain/                      # Layer 3 — Business logic / state management
│   ├── contexts/
│   │   └── AuthContext.jsx      # AuthProvider: user, login, logout + token refresh sync
│   ├── hooks/                   # Custom hooks per domain resource
│   │   ├── useUsers.js
│   │   ├── usePegawai.js
│   │   ├── useRoles.js
│   │   ├── useAbsensi.js
│   │   ├── useUnits.js
│   │   ├── useShiftKelompok.js
│   │   ├── useShiftKelompokAturan.js
│   │   ├── usePegawaiShiftKelompok.js
│   │   ├── useRosterUploadBatch.js
│   │   ├── useRosterShift.js
│   │   ├── usePenilaianShiftAbsensi.js
│   │   ├── useSessionHeartbeat.js
│   │   └── index.js
│   └── index.js
│
├── presentation/                # Layer 4 — UI (React components + pages)
│   ├── components/
│   │   ├── layout/
│   │   │   └── Layout.jsx       # Sidebar + header + logout (menu_guard-driven)
│   │   └── common/
│   │       ├── PrivateRoute.jsx           # Guard admin routes (JWT + is_admin)
│   │       ├── AttendancePrivateRoute.jsx # Guard absensi-dashboard
│   │       ├── PegawaiSearchInput.jsx     # Reusable async search + select pegawai
│   │       └── UnitSearchInput.jsx        # Reusable async search + select unit
│   └── pages/
│       ├── auth/
│       │   ├── AdminLoginPage.jsx         # /login-admin
│       │   └── AttendanceLoginPage.jsx    # /login-absensi
│       ├── public/
│       │   └── LandingPage.jsx            # / (pilih portal)
│       ├── attendance/
│       │   └── AttendanceDashboardPage.jsx # /absensi-dashboard (pegawai biasa)
│       └── admin/
│           ├── AdminDashboardPage.jsx     # /dashboard (3-varian: admin, ka-unit, user)
│           ├── UsersPage.jsx              # /users + Excel import
│           ├── RolesPage.jsx              # /roles
│           ├── PermissionsPage.jsx        # /permissions
│           ├── UnitsPage.jsx              # /unit
│           ├── EmployeesPage.jsx          # /pegawai + Excel import
│           ├── AttendanceMonitorPage.jsx  # /absensi
│           ├── SessionMonitorPage.jsx     # /sessions-monitor
│           ├── ApprovalPage.jsx           # /approval
│           ├── KpiUnitRolePage.jsx        # /rekap-unit-role
│           ├── ShiftKelompokPage.jsx      # /shift-kelompok
│           ├── ShiftKelompokAturanPage.jsx # /shift-aturan
│           ├── PegawaiShiftKelompokPage.jsx # /shift-pegawai + Excel import
│           ├── RosterUploadBatchPage.jsx  # /roster-upload
│           ├── RosterShiftPage.jsx        # /roster-shift
│           └── PenilaianShiftAbsensiPage.jsx # /penilaian-shift
│
├── utils/
│   └── errorHandler.js          # formatErrorMessage, formatErrorForAlert
│
├── App.jsx                      # Routing utama + SessionHeartbeatRunner
├── main.jsx                     # Entry point
└── index.css                    # Global styles + Tailwind custom components
```

---

## Routing

### Public
| Path | Komponen | Keterangan |
|---|---|---|
| `/` | `LandingPage` | Halaman pilih portal (Admin / Pegawai) |
| `/login-admin` | `AdminLoginPage` | Login admin / ka-unit |
| `/login-absensi` | `AttendanceLoginPage` | Login pegawai (absensi) |

### Absensi (guard: `AttendancePrivateRoute`)
| Path | Komponen |
|---|---|
| `/absensi-dashboard` | `AttendanceDashboardPage` |

### Admin (guard: `PrivateRoute` — wajib JWT valid)
| Path | Komponen |
|---|---|
| `/dashboard` | `AdminDashboardPage` |
| `/users` | `UsersPage` |
| `/roles` | `RolesPage` |
| `/permissions` | `PermissionsPage` |
| `/unit` | `UnitsPage` |
| `/pegawai` | `EmployeesPage` |
| `/shift-kelompok` | `ShiftKelompokPage` |
| `/shift-aturan` | `ShiftKelompokAturanPage` |
| `/shift-pegawai` | `PegawaiShiftKelompokPage` |
| `/roster-upload` | `RosterUploadBatchPage` |
| `/roster-shift` | `RosterShiftPage` |
| `/penilaian-shift` | `PenilaianShiftAbsensiPage` |
| `/absensi` | `AttendanceMonitorPage` |
| `/sessions-monitor` | `SessionMonitorPage` |
| `/approval` | `ApprovalPage` |
| `/rekap-unit-role` | `KpiUnitRolePage` |
| `*` | `Navigate /` (fallback) |

---

## Auth & menu_guard

### Alur Login
1. `POST /api/v1/auth/login` → response: `access_token` + cookie `refresh_token` (HTTP-only)
2. `access_token` disimpan di `localStorage` via `LocalStorage.js`
3. `AuthContext` menyimpan full `user` object termasuk `menu_guard`, `roles`, `permissions`

### Token Refresh (Otomatis)
- `client.js` interceptor 401 → `POST /auth/refresh` (cookie) → token baru
- Setelah refresh, React state di-sync via custom event `auth:user-refreshed`
- Gagal refresh → clear storage → redirect `/login-admin`

### menu_guard — Sumber Kebenaran Tunggal
Field `menu_guard` dari backend menentukan seluruh perilaku UI frontend:

| Field | Fungsi |
|---|---|
| `is_admin` | Tampilkan menu manajemen data (Users, Roles, Pegawai, dll) |
| `is_kepala_unit` | Tampilkan panel ka-unit di dashboard |
| `kepala_unit_scope_id` | ID unit otomatis untuk scope KPI |
| `menus.*.visible` | Visibilitas tiap item di sidebar |
| `menus.kpi_unit_role.endpoint` | Endpoint KPI yang dipakai (`/kpi/unit-role` atau `/kpi/unit-role/my-unit`) |
| `menus.approval.can_decide` | Tampilkan tombol approve/reject di ApprovalPage |

### Dashboard 3-Varian
`AdminDashboardPage` merender panel berbeda berdasarkan `menu_guard`:
- **Admin panel** (`is_admin = true`) — statistik sistem, quick links manajemen data
- **Ka-unit panel** (`is_kepala_unit = true`) — KPI unit, daftar approval pending
- **User panel** (default) — info user login

---

## Fitur Excel Import / Export

Tiga resource mendukung download template + bulk import dari Excel:

| Halaman | Endpoint Template | Endpoint Import |
|---|---|---|
| `/pegawai` | `GET /pegawai/template/download` | `POST /pegawai/import` |
| `/users` | `GET /users/template/download` | `POST /users/import` |
| `/shift-pegawai` | `GET /pegawai-shift-kelompok/template/download` | `POST /pegawai-shift-kelompok/import` |

**Pola UI di setiap halaman:**
- Header 3 tombol: ↓ Template Excel | 📂 Import Excel | + Tambah
- Modal Import: step guide → file picker → hasil (kartu success/fail/total + tabel error per baris)

---

## Sidebar Menu (Layout.jsx)

Menu dibangun dinamis dari `menu_guard` via `buildMenuItems()`:

**Operational** (semua user yang login):
- Dashboard (selalu ada sebagai fallback)
- Rekap Unit/Role (`kpi_unit_role.visible`)
- Monitoring Absensi (`monitoring_absensi.visible`)
- Approval (`approval.visible`)
- Monitor Sesi (`user_sessions.visible`)

**Admin Management** (hanya `is_admin = true`):
- Users, Roles, Permissions
- Unit, Pegawai
- Shift Kelompok, Shift Aturan, Shift Pegawai
- Roster Upload, Roster Shift
- Penilaian Shift Absensi

Tombol **Logout**: styled pill merah di bagian bawah sidebar.

---

## Komponen Reusable

| Komponen | Lokasi | Fungsi |
|---|---|---|
| `PegawaiSearchInput` | `components/common/` | Async search pegawai dengan debounce |
| `UnitSearchInput` | `components/common/` | Async search unit |
| `Layout` | `components/layout/` | Sidebar menu_guard-driven + logout |
| `PrivateRoute` | `components/common/` | Guard JWT + redirect ke `/login-admin` |
| `AttendancePrivateRoute` | `components/common/` | Guard attendance dashboard |

### Searchable Combobox (UsersPage)
Form tambah/edit user menggunakan custom inline combobox untuk memilih `id_pegawai`:
- Filter real-time by nama/id (max 60 hasil)
- Tombol ✕ clear
- Konfirmasi `✓ Terpilih: ID xxx`

---

## Session Heartbeat

`SessionHeartbeatRunner` (mounting di `App.jsx`) memanggil `POST /user-sessions/heartbeat` setiap **5 menit** selama user login aktif, menjaga sesi hidup di backend.

---

## Error Handling

`utils/errorHandler.js` menyediakan:
- `formatErrorMessage(err, fallback, user)` — ekstrak pesan error dari response backend
- `formatErrorForAlert(msg)` — format string untuk `alert()` dialog

---

## Environment Variables

File `.env`:
```env
VITE_API_BASE_URL=http://192.168.30.21:8000/api/v1
VITE_APP_TITLE=Admin Dashboard - Sistem Absensi RSUD Sulfat
```

---

## Development

```bash
cd /home/sultan/fast-absen/frontend
npm install
npm run dev
# Dev server: http://192.168.30.21:3000
```

## Build Production

```bash
npm run build
# Output: dist/
```

---

## Default Credentials

```
Username: admin
Password: admin123
```

---

## Troubleshooting

| Gejala | Solusi |
|---|---|
| 401 terus-menerus | `localStorage.clear()` lalu login ulang |
| Menu tidak muncul | Cek `menu_guard` di response login via DevTools → Network |
| 403 KPI dashboard | Tambahkan permission `penilaian_shift_absensi.read` ke role |
| Approval 422 | Pastikan `getAssigned(skip, limit)` — bukan object `{skip, limit}` |
| Redirect ke `/login` 404 | Semua redirect harus ke `/login-admin` |
| Foto tidak muncul | Cek CORS + `foto_url` dari API response di Network tab |
| Import Excel gagal | Pastikan kolom sesuai template; kode shift/role harus ada di master data |

---

*Last updated: 22 Februari 2026*
