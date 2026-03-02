import { useState, useEffect, useCallback } from 'react';
import RosterShiftRepository from '../../../data/repositories/RosterShiftRepository';
import { useRosterShift, useAuth } from '../../../domain/hooks';
import { formatErrorMessage, formatErrorForAlert } from '../../../utils/errorHandler';
import PegawaiSearchInput from '../../components/common/PegawaiSearchInput';
import UnitSearchInput from '../../components/common/UnitSearchInput';
import apiClient from '../../../data/api/client';

const STATUS_ROSTER_OPTIONS = ['AKTIF', 'BATAL', 'DIUBAH'];

const STATUS_COLORS = {
  AKTIF: 'bg-green-100 text-green-800',
  BATAL: 'bg-red-100 text-red-800',
  DIUBAH: 'bg-yellow-100 text-yellow-800',
};

const emptyForm = {
  id_pegawai: '',
  pegawai_nama: '',
  shift_kelompok_id: '',
  id_unit: '',
  tanggal_shift: '',
  jam_mulai_date: '',
  jam_mulai_time: '',
  jam_selesai_date: '',
  jam_selesai_time: '',
  nomor_sesi: 1,
  grace_telat_override_menit: '',
  toleransi_pulang_cepat_override_menit: '',
  status_roster: 'AKTIF',
  catatan: '',
};

const emptyFilter = {
  id_pegawai: '',
  pegawai_display: '',   // label untuk chip, tidak dikirim ke backend
  tanggal_mulai: '',
  tanggal_selesai: '',
  status_roster: '',
  shift_kelompok_id: '',
  id_unit: '',
};

const formatDatetime = (isoStr) => {
  if (!isoStr) return '-';
  try {
    return new Date(isoStr).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
};

// Convert ISO datetime → { date: 'YYYY-MM-DD', time: 'HH:mm' }
const splitIsoDatetime = (isoStr) => {
  if (!isoStr) return { date: '', time: '' };
  try {
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, '0');
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  } catch {
    return { date: '', time: '' };
  }
};

// Normalize time text input → HH:MM (24h), auto-insert colon
const normalizeTimeInput = (raw) => {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

// CSV / Excel export (BOM-prefixed, opens correctly in Excel)
const exportToCSV = (data, filename) => {
  const headers = [
    'ID', 'ID Pegawai', 'Nama Pegawai', 'Unit', 'Shift Kelompok',
    'Tanggal Shift', 'Jam Mulai', 'Jam Selesai',
    'Sesi', 'Status', 'Grace Override (mnt)', 'Tol Pulang (mnt)', 'Catatan',
  ];
  const rows = data.map(item => [
    item.id,
    item.id_pegawai ?? '',
    item.pegawai_nama ?? '',
    item.unit_nama ?? (item.id_unit ? `ID ${item.id_unit}` : ''),
    item.shift_kelompok_nama ?? (item.shift_kelompok_id ? `ID ${item.shift_kelompok_id}` : ''),
    item.tanggal_shift ?? '',
    item.jam_mulai ? new Date(item.jam_mulai).toLocaleString('id-ID') : '',
    item.jam_selesai ? new Date(item.jam_selesai).toLocaleString('id-ID') : '',
    item.nomor_sesi ?? '',
    item.status_roster ?? '',
    item.grace_telat_override_menit ?? '',
    item.toleransi_pulang_cepat_override_menit ?? '',
    item.catatan ?? '',
  ]);
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const NAMA_BULAN_CAL = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const NAMA_HARI_CAL = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const RosterShiftPage = () => {
  const { user } = useAuth();
  const { shifts, loading, error, pagination, fetchShifts, createShift, updateShift, deleteShift } = useRosterShift();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // ─ View mode
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'calendar'

  // ─ Filters
  const [filters, setFilters] = useState(emptyFilter);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilter);

  // ─ Calendar state
  const nowCal = new Date();
  const [calBulan, setCalBulan] = useState(nowCal.getMonth() + 1);
  const [calTahun, setCalTahun] = useState(nowCal.getFullYear());
  const [calPegawaiId, setCalPegawaiId] = useState('');
  const [calPegawaiDisplay, setCalPegawaiDisplay] = useState('');
  const [calUnitId, setCalUnitId] = useState('');
  const [calShifts, setCalShifts] = useState([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calError, setCalError] = useState('');

  // ─ Modal
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // ─ Lists
  const [shiftKelompokList, setShiftKelompokList] = useState([]);
  const [unitList, setUnitList] = useState([]);

  // ─ Delete
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ─ Export / UI
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const totalPages = Math.ceil(pagination.total / pageSize) || 1;
  const hasActiveFilter = Object.entries(appliedFilters)
    .filter(([k]) => k !== 'pegawai_display')
    .some(([, v]) => v !== '');

  const loadCalendar = useCallback(async () => {
    setCalLoading(true);
    setCalError('');
    try {
      const pad = (n) => String(n).padStart(2, '0');
      const lastDay = new Date(calTahun, calBulan, 0).getDate();
      const calFilters = {
        tanggal_mulai:  `${calTahun}-${pad(calBulan)}-01`,
        tanggal_selesai: `${calTahun}-${pad(calBulan)}-${pad(lastDay)}`,
      };
      if (calPegawaiId) calFilters.id_pegawai = calPegawaiId;
      if (calUnitId)    calFilters.id_unit    = calUnitId;
      const res = await RosterShiftRepository.getAll(0, 1000, calFilters);
      setCalShifts(res?.data?.items ?? res?.items ?? []);
    } catch {
      setCalError('Gagal memuat data kalender.');
    } finally {
      setCalLoading(false);
    }
  }, [calBulan, calTahun, calPegawaiId, calUnitId]);

  useEffect(() => {
    if (viewMode === 'calendar') loadCalendar();
  }, [viewMode]);

  // Load shift kelompok + unit list once
  useEffect(() => {
    apiClient.get('/shift-kelompok/', { params: { skip: 0, limit: 500 } })
      .then(res => {
        const items = res.data?.data?.items ?? res.data?.items ?? [];
        setShiftKelompokList(items);
      })
      .catch(() => {});
    apiClient.get('/unit/', { params: { skip: 0, limit: 500 } })
      .then(res => {
        const items = res.data?.data?.items ?? res.data?.items ?? [];
        setUnitList(items);
      })
      .catch(() => {});
  }, []);

  // Fetch when page or applied filters change
  useEffect(() => {
    fetchShifts(page, pageSize, appliedFilters);
  }, [fetchShifts, page, pageSize, appliedFilters]);

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...filters });
    setPage(1);
  }, [filters]);

  const resetFilters = useCallback(() => {
    setFilters(emptyFilter);
    setAppliedFilters(emptyFilter);
    setPage(1);
  }, []);

  // ─ Export all filtered records as CSV
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const data = await RosterShiftRepository.getAll(0, 99999, appliedFilters);
      const items = data?.data?.items ?? data?.items ?? [];
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
      exportToCSV(items, `roster_shift_${ts}.csv`);
    } catch (err) {
      alert(formatErrorForAlert(formatErrorMessage(err, 'Gagal mengekspor data', user)));
    } finally {
      setExporting(false);
    }
  }, [appliedFilters, user]);

  // ─ CRUD
  const openCreate = useCallback(() => {
    setEditTarget(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  }, []);

  const openEdit = useCallback((item) => {
    setEditTarget(item);
    const mulai = splitIsoDatetime(item.jam_mulai);
    const selesai = splitIsoDatetime(item.jam_selesai);
    setForm({
      id_pegawai: item.id_pegawai ?? '',
      pegawai_nama: item.pegawai_nama ?? '',
      shift_kelompok_id: item.shift_kelompok_id ?? '',
      id_unit: item.id_unit ?? '',
      tanggal_shift: item.tanggal_shift ?? '',
      jam_mulai_date: mulai.date,
      jam_mulai_time: mulai.time,
      jam_selesai_date: selesai.date,
      jam_selesai_time: selesai.time,
      nomor_sesi: item.nomor_sesi ?? 1,
      grace_telat_override_menit: item.grace_telat_override_menit ?? '',
      toleransi_pulang_cepat_override_menit: item.toleransi_pulang_cepat_override_menit ?? '',
      status_roster: item.status_roster ?? 'AKTIF',
      catatan: item.catatan ?? '',
    });
    setFormError('');
    setShowModal(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.id_pegawai)       { setFormError('ID Pegawai wajib diisi'); return; }
    if (!form.tanggal_shift)    { setFormError('Tanggal shift wajib diisi'); return; }
    if (!form.jam_mulai_time)   { setFormError('Jam mulai wajib diisi'); return; }
    if (!form.jam_selesai_time) { setFormError('Jam selesai wajib diisi'); return; }

    const mulaiDate   = form.jam_mulai_date   || form.tanggal_shift;
    const selesaiDate = form.jam_selesai_date || form.tanggal_shift;
    const dtMulai   = new Date(`${mulaiDate}T${form.jam_mulai_time}`);
    const dtSelesai = new Date(`${selesaiDate}T${form.jam_selesai_time}`);

    if (isNaN(dtMulai.getTime()))   { setFormError('Format jam mulai tidak valid'); return; }
    if (isNaN(dtSelesai.getTime())) { setFormError('Format jam selesai tidak valid'); return; }
    if (dtSelesai <= dtMulai)       { setFormError('Jam selesai harus lebih besar dari jam mulai'); return; }

    setSaving(true);
    setFormError('');
    try {
      const payload = {
        id_pegawai: form.id_pegawai,
        shift_kelompok_id: form.shift_kelompok_id !== '' ? Number(form.shift_kelompok_id) : null,
        id_unit: form.id_unit !== '' ? Number(form.id_unit) : null,
        tanggal_shift: form.tanggal_shift,
        jam_mulai: dtMulai.toISOString(),
        jam_selesai: dtSelesai.toISOString(),
        nomor_sesi: Number(form.nomor_sesi) || 1,
        grace_telat_override_menit: form.grace_telat_override_menit !== '' ? Number(form.grace_telat_override_menit) : null,
        toleransi_pulang_cepat_override_menit: form.toleransi_pulang_cepat_override_menit !== '' ? Number(form.toleransi_pulang_cepat_override_menit) : null,
        status_roster: form.status_roster,
        catatan: form.catatan || null,
      };
      if (editTarget) {
        await updateShift(editTarget.id, payload);
      } else {
        await createShift(payload);
      }
      setShowModal(false);
      fetchShifts(page, pageSize, appliedFilters);
    } catch (err) {
      setFormError(formatErrorMessage(err, 'Gagal menyimpan data roster', user));
    } finally {
      setSaving(false);
    }
  }, [form, editTarget, createShift, updateShift, fetchShifts, page, pageSize, appliedFilters, user]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteShift(confirmDelete.id);
      setConfirmDelete(null);
      fetchShifts(page, pageSize, appliedFilters);
    } catch (err) {
      alert(formatErrorForAlert(formatErrorMessage(err, 'Gagal menghapus roster', user)));
    } finally {
      setDeleting(false);
    }
  }, [confirmDelete, deleteShift, fetchShifts, page, pageSize, appliedFilters, user]);

  // ─────────────────────────────────────────────────── Render ─────────────────

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🗓️ Roster Shift</h1>
          <p className="text-gray-500 text-sm mt-0.5">Jadwal shift resmi pegawai</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              📋 Tabel
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              📅 Kalender
            </button>
          </div>
          {viewMode === 'table' && (
            <>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-4 py-2 text-sm border border-green-400 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50 transition-colors font-medium"
              >
                {exporting ? '⏳ Mengekspor...' : '⬇️ Export CSV'}
              </button>
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium border ${showFilters || hasActiveFilter ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                🔍 Filter{hasActiveFilter ? ' ●' : ''}
              </button>
            </>
          )}
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            + Tambah Roster
          </button>
        </div>
      </div>

      {/* ── Calendar View ── */}
      {viewMode === 'calendar' && (() => {
        const pad = (n) => String(n).padStart(2, '0');
        const daysInMonth = new Date(calTahun, calBulan, 0).getDate();
        const firstDow = new Date(calTahun, calBulan - 1, 1).getDay();
        const todayStr = `${nowCal.getFullYear()}-${pad(nowCal.getMonth()+1)}-${pad(nowCal.getDate())}`;

        // Group shifts by day
        const shiftByDay = {};
        calShifts.forEach(s => {
          if (!s.tanggal_shift) return;
          const d = parseInt(s.tanggal_shift.split('-')[2], 10);
          if (!shiftByDay[d]) shiftByDay[d] = [];
          shiftByDay[d].push(s);
        });

        const cells = [];
        for (let i = 0; i < firstDow; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);

        const fmtTime = (iso) => {
          if (!iso) return '';
          try { return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
          catch { return iso; }
        };

        const isNight = (s) => {
          if (!s.jam_mulai || !s.jam_selesai) return false;
          return new Date(s.jam_selesai) < new Date(s.jam_mulai) ||
            new Date(s.jam_selesai).getDate() !== new Date(s.jam_mulai).getDate();
        };

        const shiftColor = (s) => {
          const h = s.jam_mulai ? new Date(s.jam_mulai).getHours() : -1;
          if (h >= 5  && h < 12) return 'bg-amber-50  text-amber-800  border-amber-200';
          if (h >= 12 && h < 18) return 'bg-sky-50    text-sky-800    border-sky-200';
          if (h >= 0)            return 'bg-indigo-50 text-indigo-800 border-indigo-200';
          return                        'bg-gray-50   text-gray-600   border-gray-200';
        };

        const total  = calShifts.length;
        const pagi   = calShifts.filter(s => { const h = s.jam_mulai ? new Date(s.jam_mulai).getHours() : -1; return h >= 5  && h < 12; }).length;
        const sore   = calShifts.filter(s => { const h = s.jam_mulai ? new Date(s.jam_mulai).getHours() : -1; return h >= 12 && h < 18; }).length;
        const malam  = calShifts.filter(s => { const h = s.jam_mulai ? new Date(s.jam_mulai).getHours() : -1; return h >= 18 || (h >= 0 && h < 5); }).length;
        const pegawaiSet = new Set(calShifts.map(s => s.id_pegawai).filter(Boolean));

        return (
          <div className="space-y-4">
            {/* Calendar filter bar */}
            <div className="bg-white border rounded-xl p-4 shadow-sm">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Pegawai</label>
                  <PegawaiSearchInput
                    value={calPegawaiId}
                    displayValue={calPegawaiDisplay}
                    onChange={(id, nama) => { setCalPegawaiId(id ?? ''); setCalPegawaiDisplay(nama ?? ''); }}
                    placeholder="Semua pegawai"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
                  <select
                    value={calUnitId}
                    onChange={e => setCalUnitId(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[160px]"
                  >
                    <option value="">Semua unit</option>
                    {unitList.map(u => <option key={u.id_unit} value={u.id_unit}>{u.nama_unit}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bulan</label>
                  <select
                    value={calBulan}
                    onChange={e => setCalBulan(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {NAMA_BULAN_CAL.slice(1).map((n, i) => <option key={i+1} value={i+1}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tahun</label>
                  <input
                    type="number" min="2020" max="2100"
                    value={calTahun}
                    onChange={e => setCalTahun(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <button
                  onClick={loadCalendar}
                  disabled={calLoading}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {calLoading ? '⏳' : '🔄'} Muat
                </button>
                {(calPegawaiId || calUnitId) && (
                  <button
                    onClick={() => { setCalPegawaiId(''); setCalPegawaiDisplay(''); setCalUnitId(''); }}
                    className="px-3 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {calError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{calError}</div>
            )}

            {/* Summary chips */}
            {!calLoading && (
              <div className="flex flex-wrap gap-3">
                <div className="bg-white border rounded-xl px-4 py-3 text-center shadow-sm">
                  <div className="text-2xl font-bold text-gray-800">{total}</div>
                  <div className="text-xs text-gray-500">Total Shift</div>
                </div>
                <div className="bg-white border rounded-xl px-4 py-3 text-center shadow-sm">
                  <div className="text-2xl font-bold text-blue-700">{pegawaiSet.size}</div>
                  <div className="text-xs text-gray-500">Pegawai</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center shadow-sm">
                  <div className="text-2xl font-bold text-amber-700">{pagi}</div>
                  <div className="text-xs text-amber-600">🌅 Pagi</div>
                </div>
                <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-center shadow-sm">
                  <div className="text-2xl font-bold text-sky-700">{sore}</div>
                  <div className="text-xs text-sky-600">☀️ Siang/Sore</div>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-center shadow-sm">
                  <div className="text-2xl font-bold text-indigo-700">{malam}</div>
                  <div className="text-xs text-indigo-600">🌙 Malam</div>
                </div>
              </div>
            )}

            {/* Calendar card */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">
                  {NAMA_BULAN_CAL[calBulan]} {calTahun}
                  {calPegawaiDisplay && <span className="ml-2 text-sm font-normal text-blue-600">— {calPegawaiDisplay}</span>}
                  {calUnitId && !calPegawaiDisplay && <span className="ml-2 text-sm font-normal text-blue-600">— {unitList.find(u => String(u.id_unit) === String(calUnitId))?.nama_unit}</span>}
                </h3>
                {calLoading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
              </div>

              {calLoading ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
                  <p className="mt-3 text-gray-400 text-sm">Memuat jadwal…</p>
                </div>
              ) : (
                <div className="p-3 sm:p-4">
                  <div className="grid grid-cols-7 mb-2">
                    {NAMA_HARI_CAL.map((h, i) => (
                      <div key={h} className={`text-center text-xs font-semibold py-1 ${
                        i === 0 ? 'text-red-500' : 'text-gray-500'
                      }`}>{h}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((day, idx) => {
                      if (day === null) return <div key={`e-${idx}`} />;
                      const dow = (firstDow + day - 1) % 7;
                      const dayShifts = shiftByDay[day] || [];
                      const isToday = `${calTahun}-${pad(calBulan)}-${pad(day)}` === todayStr;
                      return (
                        <div
                          key={day}
                          className={`rounded-lg border min-h-[80px] p-1 text-xs ${
                            isToday ? 'border-blue-400 bg-blue-50'
                              : dow === 0 ? 'border-red-100 bg-red-50/40'
                              : 'border-gray-100 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <div className={`font-bold mb-1 text-center ${
                            isToday ? 'text-blue-700'
                              : dow === 0 ? 'text-red-500' : 'text-gray-700'
                          }`}>
                            {isToday ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-[10px]">{day}</span>
                            ) : day}
                          </div>
                          {dayShifts.length === 0 ? (
                            <div className="text-gray-300 text-center text-[10px]">—</div>
                          ) : (
                            <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
                              {dayShifts.map((s, si) => (
                                <div
                                  key={si}
                                  className={`rounded px-1 py-0.5 border leading-tight cursor-pointer hover:opacity-80 ${
                                    shiftColor(s)
                                  }${s.status_roster === 'BATAL' ? ' opacity-40 line-through' : ''}`}
                                  title={`${s.pegawai_nama || s.id_pegawai} | ${fmtTime(s.jam_mulai)}–${fmtTime(s.jam_selesai)}${isNight(s) ? ' (lintas)' : ''} | ${s.status_roster}`}
                                  onClick={() => openEdit(s)}
                                >
                                  <div className="font-semibold truncate text-[10px]">{s.pegawai_nama || s.id_pegawai}</div>
                                  <div className="opacity-75 truncate">{fmtTime(s.jam_mulai)}–{fmtTime(s.jam_selesai)}{isNight(s) ? ' 🌙' : ''}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Detail table */}
            {!calLoading && calShifts.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <h3 className="font-semibold text-gray-700 text-sm">Daftar Shift — {NAMA_BULAN_CAL[calBulan]} {calTahun}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b text-xs uppercase tracking-wide">
                        <th className="px-4 py-3 text-left text-gray-500">#</th>
                        <th className="px-4 py-3 text-left text-gray-500">Pegawai</th>
                        <th className="px-4 py-3 text-left text-gray-500">Unit</th>
                        <th className="px-4 py-3 text-left text-gray-500">Tanggal</th>
                        <th className="px-4 py-3 text-left text-gray-500">Hari</th>
                        <th className="px-4 py-3 text-left text-gray-500">Jam Mulai</th>
                        <th className="px-4 py-3 text-left text-gray-500">Jam Selesai</th>
                        <th className="px-4 py-3 text-left text-gray-500">Status</th>
                        <th className="px-4 py-3 text-left text-gray-500">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {calShifts
                        .slice()
                        .sort((a, b) => (a.tanggal_shift || '').localeCompare(b.tanggal_shift || '') || (a.pegawai_nama || '').localeCompare(b.pegawai_nama || ''))
                        .map((s, i) => {
                          const isToday = s.tanggal_shift === todayStr;
                          return (
                            <tr key={s.id || i} className={isToday ? 'bg-blue-50 font-medium' : 'hover:bg-gray-50'}>
                              <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                              <td className="px-4 py-2">
                                <div className="font-medium text-gray-900 text-sm">{s.pegawai_nama || '-'}</div>
                                <div className="text-xs text-gray-400 font-mono">{s.id_pegawai}</div>
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-600">{s.unit_nama || '-'}</td>
                              <td className="px-4 py-2 text-xs">
                                {s.tanggal_shift ? new Date(s.tanggal_shift + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                {isToday && <span className="ml-1 text-blue-600 font-bold text-[10px]">← Hari ini</span>}
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-500">
                                {s.tanggal_shift ? new Date(s.tanggal_shift + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long' }) : '-'}
                              </td>
                              <td className="px-4 py-2 text-xs font-mono">{fmtTime(s.jam_mulai) || '-'}</td>
                              <td className="px-4 py-2 text-xs font-mono">
                                {fmtTime(s.jam_selesai) || '-'}
                                {isNight(s) && <span className="ml-1 text-indigo-500">🌙</span>}
                              </td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[s.status_roster] || 'bg-gray-100 text-gray-800'}`}>
                                  {s.status_roster}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex gap-1">
                                  <button onClick={() => openEdit(s)} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">Edit</button>
                                  <button onClick={() => setConfirmDelete(s)} className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">Hapus</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!calLoading && calShifts.length === 0 && !calError && (
              <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
                <div className="text-5xl mb-3">📅</div>
                <p className="font-medium">Tidak ada jadwal shift</p>
                <p className="text-sm mt-1">{NAMA_BULAN_CAL[calBulan]} {calTahun}</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Filter Panel ── */}
      {viewMode === 'table' && showFilters && (
        <div className="bg-white border border-blue-100 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="text-sm font-semibold text-gray-700">Filter Data</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Pegawai</label>
              <PegawaiSearchInput
                value={filters.id_pegawai}
                displayValue={filters.pegawai_display}
                onChange={(id, nama) => setFilters(f => ({
                  ...f,
                  id_pegawai: id ?? '',
                  pegawai_display: nama ?? '',
                }))}
                placeholder="Cari nama / ID pegawai..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={filters.tanggal_mulai}
                onChange={e => setFilters(f => ({ ...f, tanggal_mulai: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal Selesai</label>
              <input
                type="date"
                value={filters.tanggal_selesai}
                onChange={e => setFilters(f => ({ ...f, tanggal_selesai: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Shift Kelompok</label>
              <select
                value={filters.shift_kelompok_id}
                onChange={e => setFilters(f => ({ ...f, shift_kelompok_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Semua kelompok</option>
                {shiftKelompokList.map(sk => (
                  <option key={sk.id} value={sk.id}>{sk.kode} – {sk.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={filters.status_roster}
                onChange={e => setFilters(f => ({ ...f, status_roster: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Semua status</option>
                {STATUS_ROSTER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
              <select
                value={filters.id_unit}
                onChange={e => setFilters(f => ({ ...f, id_unit: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Semua unit</option>
                {unitList.map(u => (
                  <option key={u.id_unit} value={u.id_unit}>{u.nama_unit}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={applyFilters}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Terapkan Filter
            </button>
            {hasActiveFilter && (
              <button onClick={resetFilters} className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Table-mode sections ── */}
      {viewMode === 'table' && (
        <>

      {/* ── Active Filter Chips ── */}
      {hasActiveFilter && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500">Filter aktif:</span>
          {appliedFilters.id_pegawai && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs">
              Pegawai: {appliedFilters.pegawai_display || appliedFilters.id_pegawai}
              <button onClick={() => { setFilters(f=>({...f,id_pegawai:'',pegawai_display:''})); setAppliedFilters(f=>({...f,id_pegawai:'',pegawai_display:''})); setPage(1); }}>✕</button>
            </span>
          )}
          {(appliedFilters.tanggal_mulai || appliedFilters.tanggal_selesai) && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs">
              Tgl: {appliedFilters.tanggal_mulai||'...'} – {appliedFilters.tanggal_selesai||'...'}
              <button onClick={() => { setFilters(f=>({...f,tanggal_mulai:'',tanggal_selesai:''})); setAppliedFilters(f=>({...f,tanggal_mulai:'',tanggal_selesai:''})); setPage(1); }}>✕</button>
            </span>
          )}
          {appliedFilters.status_roster && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs">
              Status: {appliedFilters.status_roster}
              <button onClick={() => { setFilters(f=>({...f,status_roster:''})); setAppliedFilters(f=>({...f,status_roster:''})); setPage(1); }}>✕</button>
            </span>
          )}
          {appliedFilters.shift_kelompok_id && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs">
              Kelompok: {shiftKelompokList.find(s=>String(s.id)===String(appliedFilters.shift_kelompok_id))?.kode ?? appliedFilters.shift_kelompok_id}
              <button onClick={() => { setFilters(f=>({...f,shift_kelompok_id:''})); setAppliedFilters(f=>({...f,shift_kelompok_id:''})); setPage(1); }}>✕</button>
            </span>
          )}
          {appliedFilters.id_unit && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs">
              Unit: {unitList.find(u=>String(u.id_unit)===String(appliedFilters.id_unit))?.nama_unit ?? `ID ${appliedFilters.id_unit}`}
              <button onClick={() => { setFilters(f=>({...f,id_unit:''})); setAppliedFilters(f=>({...f,id_unit:''})); setPage(1); }}>✕</button>
            </span>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border rounded-xl px-4 py-3">
          <div className="text-xs text-gray-500">Total Roster</div>
          <div className="text-2xl font-bold text-gray-900 mt-0.5">{pagination.total.toLocaleString('id-ID')}</div>
          {hasActiveFilter && <div className="text-xs text-blue-500 mt-0.5">hasil filter</div>}
        </div>
        <div className="bg-white border rounded-xl px-4 py-3">
          <div className="text-xs text-gray-500">Halaman Ini</div>
          <div className="text-2xl font-bold text-gray-900 mt-0.5">{shifts.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">dari {pageSize} per hal.</div>
        </div>
        <div className="bg-white border rounded-xl px-4 py-3">
          <div className="text-xs text-gray-500">Aktif (hal. ini)</div>
          <div className="text-2xl font-bold text-green-700 mt-0.5">
            {shifts.filter(s => s.status_roster === 'AKTIF').length}
          </div>
        </div>
        <div className="bg-white border rounded-xl px-4 py-3">
          <div className="text-xs text-gray-500">Halaman</div>
          <div className="text-2xl font-bold text-gray-900 mt-0.5">
            {page} <span className="text-sm font-normal text-gray-400">/ {totalPages}</span>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-700">
            {loading ? 'Memuat...' : (
              <>Menampilkan <strong>{pagination.total === 0 ? 0 : ((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, pagination.total)}</strong> dari <strong>{pagination.total.toLocaleString('id-ID')}</strong> roster</>
            )}
          </span>
          {loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">Pegawai</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">Unit</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">Kelompok</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">Tanggal</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">Jam Mulai</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">Jam Selesai</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">Sesi</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">Override</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-500 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center">
                    <div className="text-gray-400">
                      <div className="text-4xl mb-2">📭</div>
                      <div className="font-medium">{hasActiveFilter ? 'Tidak ada data yang cocok dengan filter' : 'Belum ada data roster shift'}</div>
                      {hasActiveFilter && (
                        <button onClick={resetFilters} className="mt-2 text-sm text-blue-600 hover:underline">Reset filter</button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                shifts.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{item.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">{item.pegawai_nama || '-'}</div>
                      <div className="text-xs text-gray-400 font-mono">{item.id_pegawai}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{item.unit_nama || (item.id_unit ? `ID ${item.id_unit}` : <span className="text-gray-300">—</span>)}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      {item.shift_kelompok_nama || (item.shift_kelompok_id ? `ID ${item.shift_kelompok_id}` : <span className="text-gray-300">—</span>)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 text-xs whitespace-nowrap">{item.tanggal_shift || '-'}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{formatDatetime(item.jam_mulai)}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{formatDatetime(item.jam_selesai)}</td>
                    <td className="px-4 py-3 text-center text-gray-700 text-xs">{item.nomor_sesi}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[item.status_roster] || 'bg-gray-100 text-gray-800'}`}>
                        {item.status_roster}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 space-y-0.5">
                      {item.grace_telat_override_menit != null && (
                        <div title="Grace telat override">⏱ {item.grace_telat_override_menit} mnt</div>
                      )}
                      {item.toleransi_pulang_cepat_override_menit != null && (
                        <div title="Tol. pulang cepat override">🚪 {item.toleransi_pulang_cepat_override_menit} mnt</div>
                      )}
                      {item.catatan && (
                        <div className="text-gray-400 truncate max-w-[80px]" title={item.catatan}>📝 {item.catatan}</div>
                      )}
                      {item.grace_telat_override_menit == null && item.toleransi_pulang_cepat_override_menit == null && !item.catatan && (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDelete(item)}
                          className="px-3 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors font-medium"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap text-sm text-gray-500">
          <span>
            Total <strong className="text-gray-800">{pagination.total.toLocaleString('id-ID')}</strong> data
            {hasActiveFilter && <span className="text-blue-500 ml-1">(terfilter)</span>}
          </span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(1)}
              className="px-2 py-1 rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50 text-xs">«</button>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">‹ Prev</button>
            <span className="px-3 py-1 font-medium text-gray-700">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">Next ›</button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}
              className="px-2 py-1 rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50 text-xs">»</button>
          </div>
        </div>
      </div>

        </> /* end viewMode === 'table' */
      )}

      {/* ── Create/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {editTarget ? 'Edit Roster Shift' : 'Tambah Roster Shift'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm whitespace-pre-wrap">{formError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pegawai <span className="text-red-500">*</span></label>
                <PegawaiSearchInput
                  value={form.id_pegawai}
                  displayValue={form.pegawai_nama}
                  onChange={(id, nama, id_unit) => setForm(f => ({
                    ...f,
                    id_pegawai: id ?? '',
                    pegawai_nama: nama ?? '',
                    id_unit: id_unit != null ? String(id_unit) : f.id_unit,
                  }))}
                  placeholder="Cari pegawai..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shift Kelompok</label>
                  <select value={form.shift_kelompok_id}
                    onChange={e => setForm(f => ({ ...f, shift_kelompok_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                    <option value="">— Tidak ada —</option>
                    {shiftKelompokList.map(sk => (
                      <option key={sk.id} value={sk.id}>{sk.kode} – {sk.nama}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <UnitSearchInput
                    value={form.id_unit}
                    onChange={(id) => setForm(f => ({ ...f, id_unit: id ?? '' }))}
                    placeholder="Pilih unit..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Shift <span className="text-red-500">*</span></label>
                  <input type="date" value={form.tanggal_shift}
                    onChange={e => setForm(f => ({
                      ...f, tanggal_shift: e.target.value,
                      jam_mulai_date: f.jam_mulai_date || e.target.value,
                      jam_selesai_date: f.jam_selesai_date || e.target.value,
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jam Mulai <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input type="date" value={form.jam_mulai_date}
                      onChange={e => setForm(f => ({ ...f, jam_mulai_date: e.target.value }))}
                      className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                    <input type="text" value={form.jam_mulai_time}
                      onChange={e => setForm(f => ({ ...f, jam_mulai_time: normalizeTimeInput(e.target.value) }))}
                      placeholder="HH:MM" maxLength={5}
                      className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jam Selesai <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input type="date" value={form.jam_selesai_date}
                      onChange={e => setForm(f => ({ ...f, jam_selesai_date: e.target.value }))}
                      className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                    <input type="text" value={form.jam_selesai_time}
                      onChange={e => setForm(f => ({ ...f, jam_selesai_time: normalizeTimeInput(e.target.value) }))}
                      placeholder="HH:MM" maxLength={5}
                      className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Sesi</label>
                  <input type="number" min={1} value={form.nomor_sesi}
                    onChange={e => setForm(f => ({ ...f, nomor_sesi: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Roster</label>
                  <select value={form.status_roster}
                    onChange={e => setForm(f => ({ ...f, status_roster: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                    {STATUS_ROSTER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grace Telat Override (menit)</label>
                  <input type="number" min={0} value={form.grace_telat_override_menit}
                    onChange={e => setForm(f => ({ ...f, grace_telat_override_menit: e.target.value }))}
                    placeholder="Default dari aturan"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tol. Pulang Cepat Override (menit)</label>
                  <input type="number" min={0} value={form.toleransi_pulang_cepat_override_menit}
                    onChange={e => setForm(f => ({ ...f, toleransi_pulang_cepat_override_menit: e.target.value }))}
                    placeholder="Default dari aturan"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea rows={2} value={form.catatan}
                  onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
                  placeholder="Catatan opsional..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Konfirmasi Hapus</h3>
            <p className="text-sm text-gray-600">
              Yakin hapus roster shift ID <strong>{confirmDelete.id}</strong> untuk pegawai{' '}
              <strong>{confirmDelete.pegawai_nama || confirmDelete.id_pegawai}</strong>
              {confirmDelete.tanggal_shift && <> tanggal <strong>{confirmDelete.tanggal_shift}</strong></>}?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterShiftPage;
