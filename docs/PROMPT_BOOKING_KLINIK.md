# Prompt: Aplikasi Booking Klinik — Slot Per Jam / Per Tanggal

Dokumen ini adalah **prompt reusable** untuk membangun fitur booking slot klinik (perjam, by tanggal) dengan halaman admin dan halaman pasien/user. Seluruh kode mengikuti konvensi aplikasi ini: React + Tailwind CSS (frontend) dan FastAPI + SQLAlchemy (backend).

---

## Konteks Fitur

- **Pasien/User**: Memilih tanggal → melihat slot tersedia per jam → booking slot → melihat riwayat booking
- **Admin/Dokter**: Mendefinisikan jadwal per dokter/poli per hari → melihat dashboard booking per hari/minggu → konfirmasi / batalkan booking → statistik harian

---

## Stack & Konvensi Aplikasi Ini

| Layer | Teknologi | Konvensi |
|---|---|---|
| Frontend | React, Tailwind CSS | `btn-primary`, `btn-secondary`, `input-field`, `.card` |
| State | useState, useCallback | Custom hook per entitas |
| API | axios via `apiClient` | Repository pattern (`[Nama]Repository.js`) |
| Backend | FastAPI, SQLAlchemy | Router → Service → Repository, `success_response()` |
| Auth | JWT Bearer + cookies | `require_permission(PermissionKeys.X)` |
| Timezone | Asia/Jakarta (WIB) | Simpan UTC di DB, format WIB di UI |

---

## 1. Database Model (SQLAlchemy)

```python
# models/booking_slot.py
from sqlalchemy import Column, Integer, String, Date, Time, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base
import datetime

class JadwalDokter(Base):
    """Master jadwal dokter: kapan dokter tersedia dan dengan berapa slot per jam."""
    __tablename__ = "jadwal_dokter"

    id            = Column(Integer, primary_key=True, index=True)
    id_dokter     = Column(String, ForeignKey("pegawai.id_pegawai"), nullable=False)
    id_poli       = Column(Integer, ForeignKey("unit.id_unit"), nullable=True)
    hari          = Column(Integer, nullable=False)     # 0=Senin … 6=Minggu
    jam_mulai     = Column(Time, nullable=False)        # e.g. 08:00
    jam_selesai   = Column(Time, nullable=False)        # e.g. 12:00
    durasi_menit  = Column(Integer, default=30)         # durasi 1 slot dalam menit
    kuota_per_slot = Column(Integer, default=5)         # max pasien per slot
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.datetime.utcnow)


class BookingSlot(Base):
    """Satu record booking oleh satu pasien untuk satu slot jam pada satu tanggal."""
    __tablename__ = "booking_slot"

    id              = Column(Integer, primary_key=True, index=True)
    id_pasien       = Column(String, ForeignKey("pegawai.id_pegawai"), nullable=False)  # atau tabel pasien
    id_dokter       = Column(String, ForeignKey("pegawai.id_pegawai"), nullable=False)
    id_poli         = Column(Integer, ForeignKey("unit.id_unit"), nullable=True)
    tanggal         = Column(Date, nullable=False)
    jam_mulai       = Column(Time, nullable=False)
    jam_selesai     = Column(Time, nullable=False)
    status          = Column(String, default="MENUNGGU")  # MENUNGGU | DIKONFIRMASI | SELESAI | BATAL
    catatan_pasien  = Column(Text, nullable=True)
    catatan_admin   = Column(Text, nullable=True)
    nomor_antrian   = Column(Integer, nullable=True)
    created_at      = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
```

---

## 2. Schema Pydantic

```python
# schemas/booking_slot.py
from pydantic import BaseModel
from datetime import date, time, datetime
from typing import Optional

class SlotAvailable(BaseModel):
    jam_mulai: str          # "08:00"
    jam_selesai: str        # "08:30"
    total_kuota: int
    terisi: int
    tersedia: int
    is_available: bool

class BookingCreate(BaseModel):
    id_dokter: str
    id_poli: Optional[int] = None
    tanggal: date
    jam_mulai: str          # "08:00"
    catatan_pasien: Optional[str] = None

class BookingUpdate(BaseModel):
    status: Optional[str] = None
    catatan_admin: Optional[str] = None
    nomor_antrian: Optional[int] = None

class BookingResponse(BaseModel):
    id: int
    id_pasien: str
    id_dokter: str
    id_poli: Optional[int]
    tanggal: date
    jam_mulai: str
    jam_selesai: str
    status: str
    catatan_pasien: Optional[str]
    catatan_admin: Optional[str]
    nomor_antrian: Optional[int]
    nama_pasien: Optional[str] = None
    nama_dokter: Optional[str] = None
    nama_poli: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
```

---

## 3. Backend — FastAPI Endpoints

### 3.1 Router Struktur

```
/booking/
  GET  /available-slots          → slot tersedia per tanggal & dokter
  POST /                          → buat booking baru (user)
  GET  /                          → daftar booking saya (user)
  GET  /admin                     → semua booking (admin, dengan filter)
  GET  /admin/summary             → statistik per tanggal
  PATCH /{id}/status              → ubah status booking (admin)
  DELETE /{id}                    → batal booking (user/admin)

/jadwal-dokter/
  GET  /                          → list jadwal dokter
  POST /                          → buat jadwal dokter (admin)
  PUT  /{id}                      → edit jadwal dokter (admin)
  DELETE /{id}                    → hapus jadwal (admin)
```

### 3.2 Endpoint: Slot Tersedia

```python
@router.get("/available-slots", response_model=dict)
async def get_available_slots(
    id_dokter: str,
    tanggal: date,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Hitung slot tersedia untuk dokter pada tanggal tertentu.
    Return list jam dengan info kuota tersisa.
    """
    # Hari dalam seminggu (0=Senin)
    hari = tanggal.weekday()

    # Ambil jadwal dokter hari itu
    jadwal_list = db.query(JadwalDokter).filter(
        JadwalDokter.id_dokter == id_dokter,
        JadwalDokter.hari == hari,
        JadwalDokter.is_active == True,
    ).all()

    slots = []
    for jadwal in jadwal_list:
        current = datetime.combine(tanggal, jadwal.jam_mulai)
        end     = datetime.combine(tanggal, jadwal.jam_selesai)

        while current + timedelta(minutes=jadwal.durasi_menit) <= end:
            slot_mulai   = current.time()
            slot_selesai = (current + timedelta(minutes=jadwal.durasi_menit)).time()

            # Hitung booking yang sudah ada untuk slot ini
            terisi = db.query(BookingSlot).filter(
                BookingSlot.id_dokter == id_dokter,
                BookingSlot.tanggal  == tanggal,
                BookingSlot.jam_mulai == slot_mulai,
                BookingSlot.status.notin_(["BATAL"]),
            ).count()

            tersedia = jadwal.kuota_per_slot - terisi

            slots.append({
                "jam_mulai":    slot_mulai.strftime("%H:%M"),
                "jam_selesai":  slot_selesai.strftime("%H:%M"),
                "total_kuota":  jadwal.kuota_per_slot,
                "terisi":       terisi,
                "tersedia":     max(0, tersedia),
                "is_available": tersedia > 0,
            })

            current += timedelta(minutes=jadwal.durasi_menit)

    return success_response(
        message="Available slots retrieved",
        data={"tanggal": str(tanggal), "id_dokter": id_dokter, "slots": slots}
    )
```

### 3.3 Response Format (Standar Aplikasi)

```json
{
  "success": true,
  "message": "Available slots retrieved",
  "data": {
    "tanggal": "2026-03-15",
    "id_dokter": "DR001",
    "slots": [
      { "jam_mulai": "08:00", "jam_selesai": "08:30", "total_kuota": 5, "terisi": 2, "tersedia": 3, "is_available": true },
      { "jam_mulai": "08:30", "jam_selesai": "09:00", "total_kuota": 5, "terisi": 5, "tersedia": 0, "is_available": false }
    ]
  }
}
```

---

## 4. Frontend — Repository

```js
// src/data/repositories/BookingRepository.js
import apiClient from '../api/client';

/** Ambil slot tersedia per dokter per tanggal. */
const getAvailableSlots = async (idDokter, tanggal) => {
  const params = new URLSearchParams({ id_dokter: idDokter, tanggal });
  const res = await apiClient.get(`/booking/available-slots?${params}`);
  return res.data;
};

/** Buat booking baru. */
const create = async (payload) => {
  const res = await apiClient.post('/booking/', payload);
  return res.data;
};

/** Daftar booking saya (user). */
const getMine = async (skip = 0, limit = 20) => {
  const res = await apiClient.get(`/booking/?skip=${skip}&limit=${limit}`);
  return res.data;
};

/** Daftar semua booking (admin). */
const getAdmin = async ({ skip = 0, limit = 20, tanggal, id_dokter, status } = {}) => {
  const params = new URLSearchParams({ skip, limit });
  if (tanggal)    params.append('tanggal', tanggal);
  if (id_dokter)  params.append('id_dokter', id_dokter);
  if (status)     params.append('status', status);
  const res = await apiClient.get(`/booking/admin?${params}`);
  return res.data;
};

/** Statistik harian untuk admin. */
const getSummary = async (tanggal) => {
  const res = await apiClient.get(`/booking/admin/summary?tanggal=${tanggal}`);
  return res.data;
};

/** Update status booking (admin). */
const updateStatus = async (id, payload) => {
  const res = await apiClient.patch(`/booking/${id}/status`, payload);
  return res.data;
};

/** Batalkan booking. */
const cancel = async (id) => {
  const res = await apiClient.delete(`/booking/${id}`);
  return res.data;
};

const BookingRepository = { getAvailableSlots, create, getMine, getAdmin, getSummary, updateStatus, cancel };
export default BookingRepository;
```

---

## 5. Frontend — Custom Hook

```js
// src/domain/hooks/useBooking.js
import { useState, useCallback } from 'react';
import BookingRepository from '../../data/repositories/BookingRepository';

export const useBooking = () => {
  const [bookings,   setBookings]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const fetchMine = useCallback(async (page = 1, limit = 20) => {
    try {
      setLoading(true); setError(null);
      const res = await BookingRepository.getMine((page - 1) * limit, limit);
      setBookings(res?.data?.items ?? []);
      setPagination({ page, limit, total: res?.data?.total ?? 0 });
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Gagal memuat booking');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAdmin = useCallback(async (filters = {}, page = 1, limit = 20) => {
    try {
      setLoading(true); setError(null);
      const res = await BookingRepository.getAdmin({ ...filters, skip: (page - 1) * limit, limit });
      setBookings(res?.data?.items ?? []);
      setPagination({ page, limit, total: res?.data?.total ?? 0 });
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Gagal memuat booking');
    } finally {
      setLoading(false);
    }
  }, []);

  return { bookings, loading, error, pagination, fetchMine, fetchAdmin };
};
```

---

## 6. Halaman Pasien — Booking Slot

> Gunakan konvensi dari `AttendanceDashboardPage.jsx`: sidebar, live clock, status badge berwarna, toast sukses.

```jsx
// src/presentation/pages/booking/BookingPage.jsx

/**
 * Konvensi warna status — identik dengan pola STATUS_COLORS di AttendanceDashboardPage
 */
const STATUS_COLORS = {
  MENUNGGU:    { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  DIKONFIRMASI:{ bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200'  },
  SELESAI:     { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200'   },
  BATAL:       { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200'    },
};

const STATUS_LABEL = {
  MENUNGGU:     '⏳ Menunggu',
  DIKONFIRMASI: '✅ Dikonfirmasi',
  SELESAI:      '🏁 Selesai',
  BATAL:        '❌ Batal',
};

const TZ = 'Asia/Jakarta';
const NAMA_BULAN = ['','Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'];
const NAMA_HARI  = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

// ─── Komponen Slot Grid ──────────────────────────────────────────────────────
/**
 * Grid jam dalam sehari, mirip dengan KodeBadge di RosterAdapterPage.
 * Slot penuh = abu-abu, tersedia = hijau/kuning berdasarkan kapasitas.
 */
const SlotGrid = ({ slots, onSelect, selectedSlot }) => {
  if (!slots.length) return (
    <div className="text-center py-12 text-gray-400">
      <div className="text-5xl mb-3">📅</div>
      <p className="font-medium">Tidak ada jadwal tersedia hari ini</p>
    </div>
  );

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {slots.map((slot) => {
        const isSelected = selectedSlot?.jam_mulai === slot.jam_mulai;
        const isFull     = !slot.is_available;
        const pct        = slot.total_kuota > 0 ? slot.terisi / slot.total_kuota : 0;

        // Warna berdasarkan kapasitas terisi (identik pola RosterAdapterPage JENIS_COLOR_MAP)
        let colorClass = 'bg-green-50 border-green-300 text-green-800 hover:bg-green-100';
        if (pct >= 0.8 && !isFull) colorClass = 'bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100';
        if (isFull)  colorClass = 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed';
        if (isSelected) colorClass = 'bg-primary-600 border-primary-700 text-white ring-2 ring-primary-400';

        return (
          <button
            key={slot.jam_mulai}
            disabled={isFull}
            onClick={() => !isFull && onSelect(slot)}
            className={`flex flex-col items-center py-3 px-2 rounded-lg border text-xs font-medium transition-all ${colorClass}`}
          >
            <span className="text-base font-bold">{slot.jam_mulai}</span>
            <span className="mt-1 opacity-75">s/d {slot.jam_selesai}</span>
            <span className="mt-1.5">
              {isFull
                ? '✕ Penuh'
                : `${slot.tersedia}/${slot.total_kuota} sisa`}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// ─── Halaman Utama ───────────────────────────────────────────────────────────
const BookingPage = () => {
  const { user } = useAuth();
  const now = new Date();

  // ─ Filter
  const [selectedDate, setSelectedDate] = useState(
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now)  // "YYYY-MM-DD"
  );
  const [selectedDokter, setSelectedDokter] = useState('');

  // ─ Slot data
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // ─ Booking form
  const [catatan, setCatatan] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);

  // ─ Riwayat
  const [activeView, setActiveView] = useState('booking'); // 'booking' | 'riwayat'
  const { bookings, loading: riwayatLoading, fetchMine } = useBooking();

  // Load slot setiap kali tanggal/dokter berubah
  useEffect(() => {
    if (!selectedDokter || !selectedDate) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSelectedSlot(null);
    BookingRepository.getAvailableSlots(selectedDokter, selectedDate)
      .then(res => { if (!cancelled) setSlots(res?.data?.slots ?? []); })
      .catch(() => { if (!cancelled) setSlots([]); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDate, selectedDokter]);

  useEffect(() => {
    if (activeView === 'riwayat') fetchMine(1);
  }, [activeView, fetchMine]);

  const handleBook = async () => {
    if (!selectedSlot || !selectedDokter) return;
    setBookingLoading(true);
    setBookingError('');
    try {
      await BookingRepository.create({
        id_dokter: selectedDokter,
        tanggal: selectedDate,
        jam_mulai: selectedSlot.jam_mulai,
        catatan_pasien: catatan || null,
      });
      setSuccessMsg({ jam: selectedSlot.jam_mulai, tanggal: selectedDate });
      setSelectedSlot(null);
      setCatatan('');
      // Refresh slots
      const res = await BookingRepository.getAvailableSlots(selectedDokter, selectedDate);
      setSlots(res?.data?.slots ?? []);
    } catch (err) {
      setBookingError(err.response?.data?.detail ?? 'Gagal membuat booking');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Success Toast — identik SuccessToast di AttendanceDashboardPage ── */}
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[92vw] max-w-md
          rounded-2xl shadow-2xl px-6 py-5 flex items-start gap-4 bg-green-600 text-white">
          <span className="text-4xl">✅</span>
          <div className="flex-1">
            <p className="font-bold text-lg">Booking Berhasil!</p>
            <p className="text-sm opacity-90 mt-0.5">
              Jadwal {successMsg.jam} — {successMsg.tanggal}
            </p>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-white opacity-70 hover:opacity-100 text-xl">✕</button>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Klinik</h1>
            <p className="text-gray-500 text-sm mt-1">Pilih dokter, tanggal, dan slot jam yang tersedia</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('booking')}
              className={activeView === 'booking' ? 'btn-primary' : 'btn-secondary'}
            >
              📅 Booking
            </button>
            <button
              onClick={() => setActiveView('riwayat')}
              className={activeView === 'riwayat' ? 'btn-primary' : 'btn-secondary'}
            >
              📋 Riwayat
            </button>
          </div>
        </div>

        {activeView === 'booking' ? (
          <>
            {/* ── Filter ── */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now)}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dokter / Poli</label>
                  {/* Gunakan PegawaiSearchInput atau dropdown dokter */}
                  <select
                    value={selectedDokter}
                    onChange={e => setSelectedDokter(e.target.value)}
                    className="input-field"
                  >
                    <option value="">-- Pilih Dokter --</option>
                    {/* options dari API dokter */}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Slot Grid ── */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                Slot Tersedia — {NAMA_BULAN[parseInt(selectedDate.split('-')[1])]} {selectedDate.split('-')[2]}, {selectedDate.split('-')[0]}
              </h2>
              {slotsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
                  <p className="mt-3 text-gray-500 text-sm">Memuat jadwal...</p>
                </div>
              ) : (
                <SlotGrid slots={slots} onSelect={setSelectedSlot} selectedSlot={selectedSlot} />
              )}

              {/* Legenda */}
              <div className="mt-4 flex flex-wrap gap-3 border-t pt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-green-200 border border-green-300" /> Tersedia
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-yellow-200 border border-yellow-300" /> Hampir penuh
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gray-200 border border-gray-300" /> Penuh
                </span>
              </div>
            </div>

            {/* ── Form Konfirmasi Booking ── */}
            {selectedSlot && (
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-primary-500">
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                  Konfirmasi Booking
                </h2>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-gray-500 text-xs">Tanggal</p>
                    <p className="font-semibold">{selectedDate}</p>
                  </div>
                  <div className="bg-green-50 rounded p-3">
                    <p className="text-gray-500 text-xs">Jam</p>
                    <p className="font-semibold text-green-700">{selectedSlot.jam_mulai} – {selectedSlot.jam_selesai}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keluhan / Catatan <span className="text-gray-400 text-xs">(opsional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={catatan}
                    onChange={e => setCatatan(e.target.value)}
                    className="input-field resize-none"
                    placeholder="Tuliskan keluhan atau catatan untuk dokter..."
                  />
                </div>

                {bookingError && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
                    {bookingError}
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <button className="btn-secondary" onClick={() => setSelectedSlot(null)}>
                    Batal
                  </button>
                  <button
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={bookingLoading}
                    onClick={handleBook}
                  >
                    {bookingLoading ? 'Memproses...' : '✅ Konfirmasi Booking'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ── Tampilan Riwayat ── */
          <RiwayatBookingView bookings={bookings} loading={riwayatLoading} />
        )}
      </div>
    </div>
  );
};
```

---

## 7. Komponen Riwayat Booking (User)

```jsx
/**
 * Mirip pola RiwayatView di AttendanceDashboardPage:
 * list card per record + badge status berwarna.
 */
const RiwayatBookingView = ({ bookings, loading }) => (
  <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
    <h2 className="text-lg font-bold text-gray-900 mb-4">Riwayat Booking</h2>
    {loading ? (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
      </div>
    ) : bookings.length === 0 ? (
      <div className="text-center py-12 text-gray-400">
        <div className="text-5xl mb-3">📋</div>
        <p className="font-medium">Belum ada riwayat booking</p>
      </div>
    ) : (
      <div className="space-y-3">
        {bookings.map(b => {
          const colors = STATUS_COLORS[b.status] ?? STATUS_COLORS.MENUNGGU;
          return (
            <div key={b.id} className="flex items-start justify-between gap-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{b.nama_dokter ?? b.id_dokter}</span>
                  {b.nama_poli && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{b.nama_poli}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  📅 {b.tanggal} &nbsp;🕐 {b.jam_mulai} – {b.jam_selesai}
                </p>
                {b.catatan_pasien && (
                  <p className="text-xs text-gray-400 mt-1 truncate">📝 {b.catatan_pasien}</p>
                )}
                {b.nomor_antrian && (
                  <p className="text-sm font-bold text-primary-600 mt-1">Antrian #{b.nomor_antrian}</p>
                )}
              </div>
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border} whitespace-nowrap`}>
                {STATUS_LABEL[b.status]}
              </span>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
```

---

## 8. Halaman Admin — Dashboard Booking

> Mengikuti pola admin pages aplikasi ini: header + filter bar + tabel dengan pagination + modal update status.

```jsx
// src/presentation/pages/admin/BookingAdminPage.jsx

const NAMA_HARI_FULL = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];

/**
 * Summary Card — identik pola DashboardView di AttendanceDashboardPage.
 * Tampilkan 4 kartu statistik di atas tabel.
 */
const SummaryCards = ({ summary }) => {
  if (!summary) return null;
  const cards = [
    { label: 'Total Booking', value: summary.total,        icon: '📋', cls: 'bg-blue-50   border-blue-200   text-blue-700'   },
    { label: 'Menunggu',      value: summary.menunggu,     icon: '⏳', cls: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    { label: 'Dikonfirmasi',  value: summary.dikonfirmasi, icon: '✅', cls: 'bg-green-50  border-green-200  text-green-700'  },
    { label: 'Batal',         value: summary.batal,        icon: '❌', cls: 'bg-red-50    border-red-200    text-red-700'    },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon, cls }) => (
        <div key={label} className={`rounded-lg border p-4 text-center ${cls}`}>
          <p className="text-3xl font-bold">{value ?? 0}</p>
          <p className="text-xs mt-1">{icon} {label}</p>
        </div>
      ))}
    </div>
  );
};

const BookingAdminPage = () => {
  const { user } = useAuth();
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);

  // ─ Filter
  const [filterDate,   setFilterDate]   = useState(today);
  const [filterDokter, setFilterDokter] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  const { bookings, loading, error, pagination, fetchAdmin } = useBooking();
  const [summary, setSummary] = useState(null);

  // ─ Update status modal
  const [editItem,    setEditItem]    = useState(null);
  const [editForm,    setEditForm]    = useState({ status: '', catatan_admin: '', nomor_antrian: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError,   setEditError]   = useState('');

  const loadData = useCallback(() => {
    fetchAdmin({ tanggal: filterDate, id_dokter: filterDokter || undefined, status: filterStatus || undefined }, page);
  }, [fetchAdmin, filterDate, filterDokter, filterStatus, page]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!filterDate) return;
    BookingRepository.getSummary(filterDate)
      .then(res => setSummary(res?.data ?? null))
      .catch(() => setSummary(null));
  }, [filterDate]);

  // Esc untuk tutup modal
  useEffect(() => {
    if (!editItem) return;
    const onEsc = (e) => { if (e.key === 'Escape') setEditItem(null); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [editItem]);

  const openEditModal = (item) => {
    setEditForm({ status: item.status, catatan_admin: item.catatan_admin ?? '', nomor_antrian: item.nomor_antrian ?? '' });
    setEditError('');
    setEditItem(item);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      await BookingRepository.updateStatus(editItem.id, {
        status:          editForm.status,
        catatan_admin:   editForm.catatan_admin || null,
        nomor_antrian:   editForm.nomor_antrian ? Number(editForm.nomor_antrian) : null,
      });
      setEditItem(null);
      loadData();
    } catch (err) {
      setEditError(formatErrorMessage(err, 'Gagal mengupdate status', user));
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Booking Klinik</h1>
          <p className="text-gray-600 mt-1">Kelola jadwal dan konfirmasi booking pasien</p>
        </div>
        <button className="btn-primary" onClick={() => {/* open jadwal modal */}}>
          + Tambah Jadwal Dokter
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
            <input
              type="date"
              value={filterDate}
              onChange={e => { setFilterDate(e.target.value); setPage(1); }}
              className="input-field w-auto"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dokter</label>
            <select
              value={filterDokter}
              onChange={e => { setFilterDokter(e.target.value); setPage(1); }}
              className="input-field w-auto"
            >
              <option value="">Semua Dokter</option>
              {/* populate from API */}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              className="input-field w-auto"
            >
              <option value="">Semua Status</option>
              <option value="MENUNGGU">⏳ Menunggu</option>
              <option value="DIKONFIRMASI">✅ Dikonfirmasi</option>
              <option value="SELESAI">🏁 Selesai</option>
              <option value="BATAL">❌ Batal</option>
            </select>
          </div>
          <button onClick={() => { setPage(1); loadData(); }} className="btn-primary">
            🔍 Filter
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="mb-4">
        <SummaryCards summary={summary} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* ── Tabel Booking ── */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['#','Pasien','Dokter / Poli','Tanggal','Jam','Antrian','Status','Aksi'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-10 text-center text-gray-400">
                        <div className="text-4xl mb-2">📋</div>
                        Tidak ada booking pada filter ini
                      </td>
                    </tr>
                  ) : bookings.map(b => {
                    const colors = STATUS_COLORS[b.status] ?? {};
                    return (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{b.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm">{b.nama_pasien ?? b.id_pasien}</div>
                          <div className="text-xs text-gray-400">{b.id_pasien}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{b.nama_dokter ?? b.id_dokter}</div>
                          {b.nama_poli && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{b.nama_poli}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{b.tanggal}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">{b.jam_mulai} – {b.jam_selesai}</td>
                        <td className="px-4 py-3 text-center">
                          {b.nomor_antrian ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm">
                              {b.nomor_antrian}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
                            {STATUS_LABEL[b.status] ?? b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-primary-600 hover:text-primary-900 mr-3"
                            onClick={() => openEditModal(b)}
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination — identik semua halaman admin */}
            {pagination.total > bookings.length && (
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {Math.ceil(pagination.total / pagination.limit) || 1}
                  &nbsp;·&nbsp;{pagination.total} total
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={bookings.length < pagination.limit}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal Update Status ── identik ShiftKelompokAturanPage modal ── */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Update Status Booking #{editItem.id}</h2>
              <button onClick={() => setEditItem(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {/* Info pasien */}
            <div className="px-6 pt-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1 mb-4">
                <p><span className="font-medium">Pasien:</span> {editItem.nama_pasien ?? editItem.id_pasien}</p>
                <p><span className="font-medium">Dokter:</span> {editItem.nama_dokter ?? editItem.id_dokter}</p>
                <p><span className="font-medium">Jadwal:</span> {editItem.tanggal} &nbsp;{editItem.jam_mulai} – {editItem.jam_selesai}</p>
                {editItem.catatan_pasien && (
                  <p><span className="font-medium">Catatan Pasien:</span> {editItem.catatan_pasien}</p>
                )}
              </div>
            </div>

            <form onSubmit={handleUpdateStatus} className="px-6 pb-6 space-y-4">
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">{editError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status Baru</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="input-field"
                  required
                >
                  <option value="MENUNGGU">⏳ Menunggu</option>
                  <option value="DIKONFIRMASI">✅ Dikonfirmasi</option>
                  <option value="SELESAI">🏁 Selesai</option>
                  <option value="BATAL">❌ Batal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Antrian</label>
                <input
                  type="number"
                  min={1}
                  value={editForm.nomor_antrian}
                  onChange={e => setEditForm(f => ({ ...f, nomor_antrian: e.target.value }))}
                  placeholder="Nomor urut antrian..."
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catatan Admin <span className="text-gray-400 text-xs">(opsional)</span>
                </label>
                <textarea
                  rows={3}
                  value={editForm.catatan_admin}
                  onChange={e => setEditForm(f => ({ ...f, catatan_admin: e.target.value }))}
                  placeholder="Catatan untuk pasien..."
                  className="input-field resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setEditItem(null)} className="btn-secondary" disabled={editLoading}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={editLoading}>
                  {editLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 9. Checklist Implementasi

### Backend
- [ ] Model `JadwalDokter` dan `BookingSlot` dibuat dan di-migrate
- [ ] Schema Pydantic (`SlotAvailable`, `BookingCreate`, `BookingUpdate`, `BookingResponse`)
- [ ] Router `/booking/` dengan 6 endpoint
- [ ] Router `/jadwal-dokter/` dengan CRUD
- [ ] Response `available-slots` menghitung kuota real-time dari DB
- [ ] Permission keys ditambahkan ke `PermissionKeys`
- [ ] Endpoint terdaftar di `api/v1/__init__.py`

### Frontend
- [ ] `BookingRepository.js` dengan 6 method
- [ ] `useBooking.js` hook (fetchMine, fetchAdmin)
- [ ] `BookingPage.jsx` (user) dengan SlotGrid + form konfirmasi
- [ ] `RiwayatBookingView` komponen
- [ ] `BookingAdminPage.jsx` dengan SummaryCards + tabel + modal update
- [ ] Route ditambahkan ke React Router
- [ ] Menu navigation ditambahkan ke sidebar admin

---

## 10. Best Practices dari Aplikasi Ini yang Diterapkan

| Pattern | Sumber | Diterapkan pada |
|---|---|---|
| `STATUS_COLORS` + badge berwarna | `AttendanceDashboardPage` | Badge status booking |
| `Success Toast` (fixed overlay) | `AttendanceDashboardPage` | Notifikasi booking berhasil |
| `SlotGrid` badge warna kapasitas | `RosterAdapterPage.KodeBadge` + `JENIS_COLOR_MAP` | Grid jam tersedia/penuh |
| Modal header + `&times;` + Esc | `ShiftKelompokAturanPage`, `PegawaiShiftKelompokPage` | Modal update status |
| `SummaryCards` 4-kolom | `RiwayatView.summaryItems` | Statistik harian admin |
| Filter bar + tabel + pagination | Semua admin pages | Tabel booking admin |
| `useCallback` + cancellation flag (`cancelled`) | `EmployeesPage` `useEffect` | Load slot tersedia |
| `btn-primary` / `btn-secondary` / `input-field` | `index.css` | Semua form & tombol |
| Section header uppercase dalam modal (`<h3>`) | `ShiftKelompokAturanPage` | Grouping form fields |
| Toggle switch CSS-only | `ShiftKelompokPage`, `PegawaiShiftKelompokPage` | Toggle `is_active` jadwal |
| `PegawaiSearchInput` / `UnitSearchInput` | Komponen existing | Dropdown dokter / poli |
| Timezone WIB `en-CA` locale trick | `AttendanceDashboardPage.todayStr()` | Tanggal default filter |

---

## 11. Catatan Penting

| Topik | Keputusan |
|---|---|
| Kuota real-time | Hitung `terisi` dari DB saat `GET /available-slots` — jangan cache, agar tidak overbooking |
| Slot generation | Generate slot di backend saat query (bukan pre-generate ke DB), untuk fleksibilitas jadwal |
| Batal booking | Soft delete via `status = BATAL`, bukan `DELETE` fisik, untuk audit trail |
| Antrian nomor | Di-assign admin saat konfirmasi, bukan saat booking — agar bisa diurutkan per kedatangan |
| Validasi duplikat | Cek apakah pasien sudah punya booking `!= BATAL` pada dokter + tanggal + jam yang sama |
| Timezone | Simpan `tanggal` sebagai `Date` (tanpa jam) dan `jam_mulai/jam_selesai` sebagai `Time` — hindari masalah UTC drift |
| Hari dalam seminggu | `date.weekday()` Python: 0=Senin, 6=Minggu. Sesuaikan jika frontend pakai `getDay()`: 0=Minggu |
| `input type="date"` min | Set `min` ke hari ini (WIB) menggunakan `en-CA` locale trick untuk hindari booking masa lalu |
