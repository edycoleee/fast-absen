# DOC MAPPING FRONTEND

Panduan ringkas untuk tim frontend agar menu dan route React mengikuti kontrak backend `menu_guard` dari endpoint auth.

- Source kontrak: `POST /api/v1/auth/login` dan `POST /api/v1/auth/refresh`
- Base API: `/api/v1`

---

## 1) Struktur Data yang Dipakai Frontend

Response auth (`data`) minimal yang dipakai:

```json
{
  "access_token": "...",
  "token_type": "bearer",
  "user_id": 1,
  "username": "admin",
  "roles": ["admin"],
  "permissions": ["penilaian_shift_absensi.read", "absensi.read"],
  "menu_guard": {
    "is_admin": true,
    "is_kepala_unit": false,
    "kepala_unit_scope_id": null,
    "menus": {
      "dashboard": { "visible": true },
      "kpi_unit_role": {
        "visible": true,
        "endpoint": "/api/v1/stats/kpi/unit-role",
        "force_my_unit_scope": false,
        "allow_optional_unit_filter": true
      },
      "monitoring_absensi": { "visible": true },
      "approval": { "visible": true, "can_decide": true },
      "user_sessions": { "visible": true }
    }
  }
}
```

---

## 2) Prinsip Implementasi UI

1. **Jangan hardcode role -> menu** di frontend.
2. **Selalu gunakan `menu_guard.menus.*.visible`** sebagai sumber visibilitas menu.
3. Untuk KPI unit/role, **selalu gunakan endpoint dari `menu_guard.menus.kpi_unit_role.endpoint`**.
4. Jika `force_my_unit_scope=true`, frontend **tidak mengirim `id_unit`**.
5. Jika `allow_optional_unit_filter=true`, frontend boleh tampilkan filter unit.

---

## 3) Mapping Menu Sidebar React

## A. Mapping Keys

- `menu_guard.menus.dashboard.visible` -> menu `Dashboard`
- `menu_guard.menus.kpi_unit_role.visible` -> menu `Rekap Unit/Role`
- `menu_guard.menus.monitoring_absensi.visible` -> menu `Monitoring Absensi`
- `menu_guard.menus.approval.visible` -> menu `Approval`
- `menu_guard.menus.user_sessions.visible` -> menu `User Sessions`

## B. Contoh Konfigurasi Menu

```ts
type MenuGuard = {
  menus: {
    dashboard?: { visible?: boolean }
    kpi_unit_role?: {
      visible?: boolean
      endpoint?: string
      force_my_unit_scope?: boolean
      allow_optional_unit_filter?: boolean
    }
    monitoring_absensi?: { visible?: boolean }
    approval?: { visible?: boolean; can_decide?: boolean }
    user_sessions?: { visible?: boolean }
  }
}

const buildSidebarItems = (menuGuard: MenuGuard) => {
  const menus = menuGuard?.menus ?? {}

  return [
    { key: 'dashboard', label: 'Dashboard', path: '/dashboard', visible: !!menus.dashboard?.visible },
    { key: 'kpi', label: 'Rekap Unit/Role', path: '/rekap-unit-role', visible: !!menus.kpi_unit_role?.visible },
    { key: 'monitoring', label: 'Monitoring Absensi', path: '/monitoring-absensi', visible: !!menus.monitoring_absensi?.visible },
    { key: 'approval', label: 'Approval', path: '/approval', visible: !!menus.approval?.visible },
    { key: 'sessions', label: 'User Sessions', path: '/user-sessions', visible: !!menus.user_sessions?.visible },
  ].filter(item => item.visible)
}
```

---

## 4) Mapping Route Guard React

Contoh util route guard berbasis `menu_guard`:

```ts
const canAccessRoute = (path: string, menuGuard: any) => {
  const menus = menuGuard?.menus ?? {}

  if (path.startsWith('/dashboard')) return !!menus.dashboard?.visible
  if (path.startsWith('/rekap-unit-role')) return !!menus.kpi_unit_role?.visible
  if (path.startsWith('/monitoring-absensi')) return !!menus.monitoring_absensi?.visible
  if (path.startsWith('/approval')) return !!menus.approval?.visible
  if (path.startsWith('/user-sessions')) return !!menus.user_sessions?.visible

  return false
}
```

Behavior saat tidak punya akses:
- redirect ke halaman pertama yang visible, atau
- tampilkan halaman `403`.

---

## 5) Mapping API Call untuk KPI Unit/Role

Frontend KPI page harus memilih endpoint dinamis:

```ts
const endpoint = auth.menu_guard?.menus?.kpi_unit_role?.endpoint
const forceMyUnit = !!auth.menu_guard?.menus?.kpi_unit_role?.force_my_unit_scope

const params: Record<string, string> = {}
if (startDate) params.start_date = startDate
if (endDate) params.end_date = endDate

// Hanya kirim id_unit jika backend mengizinkan optional filter unit
if (!forceMyUnit && selectedUnitId) {
  params.id_unit = String(selectedUnitId)
}

await api.get(endpoint, { params })
```

---

## 5B) Mapping API Call untuk Monitoring Absensi (P1-2)

Endpoint monitoring:
- `GET /api/v1/absensi/`

Filter produksi yang tersedia:
- `start_date` (YYYY-MM-DD)
- `end_date` (YYYY-MM-DD)
- `id_pegawai`
- `id_unit`
- `shift` (`PAGI|SORE|MALAM|ON_CALL|CUSTOM`)
- `status` (`HADIR|IZIN|SAKIT|ALPHA|TERLAMBAT|CUTI`)
- pagination: `skip`, `limit`

Response pagination selalu:
- `data.items`
- `data.total`
- `data.skip`
- `data.limit`

## A. Mapping State Filter -> Query Param

```ts
type MonitoringFilterState = {
  startDate?: string
  endDate?: string
  idPegawai?: string
  idUnit?: number
  shift?: 'PAGI' | 'SORE' | 'MALAM' | 'ON_CALL' | 'CUSTOM'
  status?: 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPHA' | 'TERLAMBAT' | 'CUTI'
  page: number
  limit: number
}

const buildMonitoringQuery = (state: MonitoringFilterState) => {
  const params: Record<string, string> = {}

  if (state.startDate) params.start_date = state.startDate
  if (state.endDate) params.end_date = state.endDate
  if (state.idPegawai) params.id_pegawai = state.idPegawai
  if (state.idUnit) params.id_unit = String(state.idUnit)
  if (state.shift) params.shift = state.shift
  if (state.status) params.status = state.status

  params.skip = String((state.page - 1) * state.limit)
  params.limit = String(state.limit)

  return params
}
```

## B. Contoh Fetch + Parse Pagination

```ts
const fetchMonitoringAbsensi = async (state: MonitoringFilterState) => {
  const params = buildMonitoringQuery(state)
  const res = await api.get('/api/v1/absensi/', { params })

  const payload = res.data?.data ?? {}
  return {
    items: payload.items ?? [],
    total: payload.total ?? 0,
    skip: payload.skip ?? 0,
    limit: payload.limit ?? state.limit,
  }
}
```

## C. Mapping Table Column Monitoring

Field item yang disarankan dipakai langsung di tabel:
- `id_pegawai`, `pegawai_nama`
- `tanggal`, `jam_masuk`, `jam_keluar`
- `status`
- `id_unit`, `nama_unit`
- `jenis_shift`, `status_final_shift`
- `keterangan`

## D. Behavior UI Pagination

- Saat user ubah filter (`tanggal/unit/shift/status/id_pegawai`), reset `page=1` (`skip=0`).
- Hitung total halaman dari `total/limit`.
- Jangan hitung total dari `items.length`; selalu gunakan `data.total` dari backend.

---

## 6) Mapping UI Berdasarkan Jenis User

## Admin / Super Admin

- endpoint KPI: `/api/v1/stats/kpi/unit-role`
- filter unit: tampil (`allow_optional_unit_filter=true`)
- scope: lintas unit

## KA-UNIT

- endpoint KPI: `/api/v1/stats/kpi/unit-role/my-unit`
- filter unit: sembunyikan/disable (`force_my_unit_scope=true`)
- scope: otomatis ke `kepala_unit_scope_id`

## User biasa

- jika `menus.kpi_unit_role.visible=false`, menu KPI tidak ditampilkan

---

## 7) Checklist Implementasi Frontend

- [ ] Simpan `permissions` dan `menu_guard` dari login ke auth store
- [ ] Refresh token flow memperbarui `menu_guard` dari `/auth/refresh`
- [ ] Sidebar dibangun dari `menu_guard.menus`
- [ ] Route guard memakai `menu_guard` (bukan role hardcoded)
- [ ] KPI page memakai endpoint dinamis dari `menu_guard`
- [ ] Unit filter mengikuti `allow_optional_unit_filter`
- [ ] Tambah fallback UI jika `menu_guard` kosong (safe default: hide)

---

## 8) Referensi

- [API_ENDPOINTS.md](API_ENDPOINTS.md)
- [ADMIN_GUIDE.md](ADMIN_GUIDE.md)
- [USER_GUIDE.md](USER_GUIDE.md)
- [KAUNIT_GUIDE.md](KAUNIT_GUIDE.md)

---

## 9) Matrix Final QA/UAT

Matrix ini menjadi acuan verifikasi akses per role untuk UI dan endpoint backend.

Keterangan scope:
- `ALL` = lintas unit
- `OWN_UNIT` = hanya unit sesuai `menu_guard.kepala_unit_scope_id`
- `SELF` = data milik user login

| Role | Menu | Endpoint Utama | Permission Minimum | Scope Data | Ekspektasi UI |
|---|---|---|---|---|---|
| admin / super-admin | Dashboard | `GET /api/v1/stats/` | `absensi.read` *(atau permission stats terkait)* | `ALL` | Menu tampil |
| admin / super-admin | Rekap Unit/Role | `GET /api/v1/stats/kpi/unit-role` | `penilaian_shift_absensi.read` | `ALL` | Menu tampil, filter unit aktif |
| admin / super-admin | Monitoring Absensi | `GET /api/v1/absensi/` | `absensi.read` | `ALL` | Menu tampil, filter lengkap (tanggal/unit/shift/status/id_pegawai) |
| admin / super-admin | Approval | `GET /api/v1/approval-pengajuan-absensi/assigned` + `POST /decision` | `approval_pengajuan_absensi.read` + `approval_pengajuan_absensi.update` | `ALL` *(sesuai assignment approval)* | Menu tampil, aksi decide aktif |
| admin / super-admin | User Sessions | `GET /api/v1/user-sessions/active` | `user_sessions.read` | `ALL` | Menu tampil |
| ka-unit | Dashboard | `GET /api/v1/stats/` | `absensi.read` *(atau permission stats terkait)* | `OWN_UNIT` *(operasional via menu guard)* | Menu tampil |
| ka-unit | Rekap Unit/Role | `GET /api/v1/stats/kpi/unit-role/my-unit` | `penilaian_shift_absensi.read` | `OWN_UNIT` | Menu tampil, filter unit hidden/disabled |
| ka-unit | Monitoring Absensi | `GET /api/v1/absensi/` | `absensi.read` | `OWN_UNIT` *(enforced by flow produk/menu guard + kebijakan)* | Menu tampil, default filter id_unit = scope unit |
| ka-unit | Approval | `GET /api/v1/approval-pengajuan-absensi/assigned` + `POST /decision` | `approval_pengajuan_absensi.read` + `approval_pengajuan_absensi.update` | `OWN_UNIT` *(sesuai assignment)* | Menu tampil, aksi decide aktif pada antrean assigned |
| ka-unit | User Sessions | `GET /api/v1/user-sessions/active` | `user_sessions.read` *(jika diberikan)* | `OWN_UNIT/ALL` tergantung policy | Menu tampil hanya jika `menu_guard.menus.user_sessions.visible=true` |
| user | Dashboard | `GET /api/v1/absensi/today`, `GET /history`, `GET /summary` | `absensi.read` | `SELF` | Menu dashboard personal tampil |
| user | Rekap Unit/Role | - | - | - | Menu tidak tampil jika `menu_guard.menus.kpi_unit_role.visible=false` |
| user | Monitoring Absensi | - *(atau endpoint personal)* | `absensi.read` | `SELF` | Jangan tampilkan monitoring admin jika guard false |
| user | Approval | `GET /api/v1/approval-pengajuan-absensi/mine` | `approval_pengajuan_absensi.read` | `SELF` | Tampilkan menu/halaman approval personal bila guard true |
| user | User Sessions | `POST /api/v1/user-sessions/`, `POST /heartbeat` | `user_sessions.create` | `SELF` | Fitur personal session, bukan monitoring global |

## A. Checklist QA (Per Role)

- Verifikasi respons login mengandung `permissions` dan `menu_guard`.
- Verifikasi sidebar hanya menampilkan menu dengan `visible=true`.
- Verifikasi route guard menolak akses halaman yang `visible=false` (redirect/403).
- Verifikasi endpoint KPI mengikuti `menu_guard.menus.kpi_unit_role.endpoint`.
- Verifikasi ka-unit tidak bisa akses KPI lintas unit (harus `403` bila memaksa).
- Verifikasi pagination monitoring konsisten: `items,total,skip,limit`.

## B. Checklist UAT (Skenario Cepat)

- **Admin**: buka rekap lintas unit, ubah filter unit, data berubah sesuai filter.
- **KA-UNIT**: buka rekap, pastikan unit filter tidak bisa dipilih manual dan data hanya unit sendiri.
- **User**: login, pastikan menu admin tidak muncul dan hanya menu personal yang tersedia.
- **Approval flow**: role dengan `can_decide=true` bisa submit decision; role lain tidak.
- **Monitoring**: filter tanggal/unit/shift/status mengubah data tabel dan total pagination secara benar.

Last updated: 22 Februari 2026

---

## 10) P1-4 API Freeze & W2 Test Gate (Final)

Status freeze kontrak (backend ↔ frontend):
- Auth contract (`permissions`, `menu_guard`) **frozen**.
- KPI contract (`/stats/kpi/unit-role` + `/my-unit`, watermark, audit) **frozen**.
- Monitoring absensi filter + pagination (`items,total,skip,limit`) **frozen**.
- Roster import validation behavior (invalid header/file + overlap roster) **frozen**.

W2 gate yang sudah tervalidasi:
- E2E endpoint flow: `import -> evaluate -> approval create -> approval decision`.
- Negative import test: invalid header/file handling.
- Negative import test: overlap roster terdeteksi dan masuk ringkasan error.
- Full endpoint regression: **133 passed**.

Definisi Done P1-4:
- Kontrak endpoint final didokumentasikan.
- QA/UAT matrix final tersedia.
- Test gate W2 hijau.
