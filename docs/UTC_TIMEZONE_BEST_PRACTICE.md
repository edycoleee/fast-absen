# Best Practice: UTC & Timezone pada Aplikasi fast-absen

> Panduan ini merangkum pelajaran dari proses debugging timezone yang terjadi pada project ini.
> Berlaku untuk stack: **FastAPI (Python)** + **React (Vite)** + **PostgreSQL**.

---

## Prinsip Utama

> **Simpan selalu dalam UTC. Tampilkan dalam timezone lokal (WIB).**

| Layer | Aturan |
|-------|--------|
| Database | Simpan kolom timestamp sebagai `TIMESTAMP WITH TIME ZONE` (PostgreSQL) |
| Backend Python | Selalu gunakan `datetime.now(timezone.utc)`, bukan `datetime.now()` |
| API Response | Serialisasi timestamp dengan offset eksplisit: `2026-03-06T01:50:24+00:00` atau `Z` |
| Frontend JS | Parse timestamp lalu format ulang dengan `timeZone: 'Asia/Jakarta'` |

---

## Backend (Python / FastAPI)

### ❌ Salah — naive datetime (tidak ada info timezone)

```python
from datetime import datetime

record.jam_masuk = datetime.now()          # naive: "2026-03-06T01:50:24"
record.deleted_at = datetime.now()         # browser bisa salah interpretasi
cutoff = datetime.now() - timedelta(hours=8)
```

### ✅ Benar — aware datetime dengan UTC

```python
from datetime import datetime, timezone

record.jam_masuk = datetime.now(timezone.utc)       # "2026-03-06T01:50:24+00:00"
record.deleted_at = datetime.now(timezone.utc)
cutoff = datetime.now(timezone.utc) - timedelta(hours=8)
```

### Mengapa penting?

- `datetime.now()` menghasilkan **naive datetime** — tidak ada informasi timezone.
- FastAPI / Pydantic akan serialisasi naive datetime tanpa suffix `+00:00` atau `Z`.
- Browser JavaScript yang menerima `"2026-03-06T01:50:24"` (tanpa suffix) akan **menganggapnya sebagai waktu lokal pengguna**, bukan UTC.
- Jika pengguna di WIB (UTC+7), jam `01:50` UTC akan ditampilkan sebagai `01:50 WIB` (salah), seharusnya `08:50 WIB`.

### SQLAlchemy — pastikan kolom aware

```python
# models/base.py atau model masing-masing
from sqlalchemy import DateTime
from sqlalchemy.sql import func

# Kolom dengan timezone
created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
```

### Perbandingan aware vs naive di Python

```python
from datetime import datetime, timezone

naive = datetime.now()
print(naive)           # 2026-03-06 08:50:24.123456  ← tidak ada tz info
print(naive.tzinfo)    # None  ← BAHAYA

aware = datetime.now(timezone.utc)
print(aware)           # 2026-03-06 01:50:24.123456+00:00
print(aware.tzinfo)    # UTC  ← aman
```

---

## Frontend (React / JavaScript)

### ❌ Salah — tidak ada timeZone, bergantung pada sistem OS

```js
// Hasilnya beda-beda tergantung timezone OS user
new Date(isoString).toLocaleString('id-ID')
new Date(isoString).getHours()   // jam UTC bukan WIB
new Date(isoString).getDate()    // tanggal UTC bukan WIB
```

### ✅ Benar — selalu eksplisit dengan timeZone

```js
const TZ = 'Asia/Jakarta';

// Format tanggal
new Intl.DateTimeFormat('id-ID', { timeZone: TZ, dateStyle: 'full' }).format(new Date(iso));

// Format jam
new Intl.DateTimeFormat('id-ID', {
  timeZone: TZ,
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
}).format(new Date(iso));

// Ambil nilai jam WIB (untuk logika, bukan tampilan)
const getWIBHour = (iso) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour: 'numeric', hour12: false
  }).formatToParts(new Date(iso));
  return parseInt(parts.find(p => p.type === 'hour').value);
};

// Tanggal hari ini dalam WIB (format YYYY-MM-DD)
const todayWIB = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
// en-CA secara default menghasilkan format YYYY-MM-DD
```

### Konstanta yang dipakai di project ini

```js
// Definisikan sekali, pakai di seluruh file
const TZ     = 'Asia/Jakarta';
const LOCALE = 'id-ID';
```

### Utility file terpusat

File: `frontend/src/utils/dateUtils.js`

```js
const TZ     = 'Asia/Jakarta';
const LOCALE = 'id-ID';

export const formatDate         = (iso) => new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, dateStyle: 'long' }).format(new Date(iso));
export const formatTime         = (iso) => new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
export const formatDateTime     = (iso) => new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
export const todayStr           = ()    => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
```

> Import dari sini di semua page/komponen agar konsisten.

---

## Database (PostgreSQL)

### Definisi kolom

```sql
-- Gunakan TIMESTAMPTZ (alias TIMESTAMP WITH TIME ZONE)
CREATE TABLE absensi (
    id          SERIAL PRIMARY KEY,
    jam_masuk   TIMESTAMPTZ NOT NULL,
    jam_keluar  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Mengapa TIMESTAMPTZ?

- PostgreSQL menyimpan `TIMESTAMPTZ` secara internal selalu dalam UTC.
- Saat dibaca, PostgreSQL mengkonversi ke timezone session (default `UTC` di Docker).
- `TIMESTAMP` tanpa zone bisa menyimpan nilai ambigu jika server pernah berubah timezone.

### Set timezone session di koneksi (backup)

```python
# config/database.py
engine = create_async_engine(
    DATABASE_URL,
    connect_args={"options": "-c timezone=UTC"}
)
```

---

## Keamanan: Manipulasi Jam oleh User

### Pertanyaan: Jika user memundurkan jam di komputernya, apakah bisa memanipulasi waktu absen?

**Jawaban: TIDAK.** Jam yang dicatat adalah **jam server**, bukan jam browser/komputer user.

```
User manipulasi jam komputer → klik Check-In
        ↓
Browser hanya mengirim HTTP REQUEST
(tidak ada timestamp dari client dalam payload)
        ↓
FastAPI menerima request
jam_masuk = datetime.now(timezone.utc)  ← DIAMBIL DARI JAM SERVER
        ↓
Disimpan ke PostgreSQL dengan jam server
```

### Mengapa aman?

- `datetime.now(timezone.utc)` berjalan di **proses Python di server**, bukan di browser.
- Endpoint check-in tidak menerima parameter `jam_masuk` dari client — nilai ini di-generate server-side.
- User hanya bisa mempengaruhi tampilan tanggal/jam di browser mereka sendiri.

### Yang masih bisa dimanipulasi user (dan mitigasinya)

| Vektor | Risiko | Mitigasi di project ini |
|--------|--------|------------------------|
| Manipulasi jam komputer | ❌ Tidak berpengaruh ke DB | `datetime.now(timezone.utc)` server-side |
| Kirim request dari luar browser (curl, Postman) | ⚠️ Bisa absen dari mana saja | IP whitelist (`ip_whitelist` table) |
| Pinjam token JWT orang lain | ⚠️ Absen atas nama orang lain | Token bound ke `user_id`, sesi di-track |
| Face spoofing (foto/video) | ⚠️ Bypass face recognition | InsightFace liveness detection |

> **Kesimpulan:** Selama timestamp di-generate di server dan tidak dipercayakan ke input dari client, manipulasi jam komputer user tidak ada dampaknya terhadap data absensi.

---

## Alur Data Lengkap

```
[Browser WIB]                [FastAPI]               [PostgreSQL]
     |                           |                        |
     |  POST /api/v1/absensi     |                        |
     |-------------------------> |                        |
     |                           | datetime.now(utc)      |
     |                           | jam_masuk = 01:50 UTC  |
     |                           |----------------------->|
     |                           |                        | TIMESTAMPTZ
     |                           |                        | 2026-03-06 01:50:24+00
     |                           |                        |
     |  GET /api/v1/absensi      |                        |
     |-------------------------> |                        |
     |                           |<-----------------------|
     |                           | "2026-03-06T01:50:24+00:00"
     |<--------------------------|
     |                           |
     | new Date("...+00:00")     |
     | Intl → timeZone: Asia/Jakarta
     | Tampil: "06 Maret 2026, 08:50 WIB" ✅
```

---

## Checklist Saat Menambah Fitur Baru

### Backend
- [ ] Semua `datetime.now()` diganti `datetime.now(timezone.utc)`
- [ ] Semua `datetime.utcnow()` diganti `datetime.now(timezone.utc)` (utcnow deprecated Python 3.12+)
- [ ] Kolom model SQLAlchemy pakai `DateTime(timezone=True)`
- [ ] Response Pydantic schema pakai `datetime` (bukan `str`) agar serialisasi otomatis dengan offset

### Frontend
- [ ] Semua `toLocaleString()` / `toLocaleDateString()` / `toLocaleTimeString()` pakai `{ timeZone: TZ }`
- [ ] Tidak ada `.getHours()`, `.getDate()`, `.getMonth()` langsung pada hasil `new Date(iso)` — gunakan `Intl.DateTimeFormat` untuk ekstrak nilai
- [ ] Import format utility dari `src/utils/dateUtils.js`
- [ ] Komponen clock real-time: `useState(new Date())` + `setInterval` + Intl format with TZ

---

## Gotcha / Jebakan Umum

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Jam tampil 7 jam lebih awal | `datetime.now()` naive, browser anggap lokal | `datetime.now(timezone.utc)` |
| `new Date("2026-03-06T01:50:24")` salah | Tanpa suffix, browser pakai local TZ | Pastikan backend kirim `+00:00` atau `Z` |
| `getHours()` tidak sesuai WIB | Metode `.get*()` pakai local TZ OS | Pakai `Intl.DateTimeFormat` dengan `timeZone: TZ` |
| Tanggal beda 1 hari di tengah malam | `getDate()` pakai UTC, bukan WIB | Pakai `en-CA` + `timeZone: TZ` untuk dapat YYYY-MM-DD |
| `datetime.utcnow()` deprecated | Python 3.12+ | Ganti ke `datetime.now(timezone.utc)` |
| Cooldown timer tidak akurat | Parse `jam_masuk` salah TZ | `new Date(iso).getTime()` sudah benar jika iso punya offset |

---

## File yang Sudah Diubah di Project Ini

### Backend
| File | Perubahan |
|------|-----------|
| `services/absensi_service.py` | `jam_masuk` → `datetime.now(timezone.utc)` |
| `repositories/absensi_repository.py` | `jam_masuk`, `jam_keluar` |
| `repositories/user_session_repository.py` | `last_activity`, `logout_at`, `cutoff_time`, `expiry_time` |
| `models/base.py` | `deleted_at` |
| `services/approval_pengajuan_absensi_service.py` | `diputuskan_pada` |
| `services/penilaian_shift_absensi_service.py` | `evaluated_at` |
| `api/v1/endpoints/user_sessions.py` | `today_start` |

### Frontend
| File | Perubahan |
|------|-----------|
| `pages/attendance/AttendanceDashboardPage.jsx` | `todayStr()`, `getWIBHour()`, semua formatter, LiveClock |
| `utils/dateUtils.js` | Utility terpusat (dibuat baru) |
| `data/repositories/PegawaiRepository.js` | `getPhotoUrl()` fallback URL |

---

*Dibuat: 6 Maret 2026 — fast-absen project*
