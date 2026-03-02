import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../domain/hooks';
import { useAbsensi } from '../../../domain/hooks/useAbsensi';
import RosterShiftRepository from '../../../data/repositories/RosterShiftRepository';
import AbsensiRepository from '../../../data/repositories/AbsensiRepository';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'HADIR',     label: 'Hadir',     emoji: '✅' },
  { value: 'IZIN',      label: 'Izin',      emoji: '📝' },
  { value: 'SAKIT',     label: 'Sakit',     emoji: '🤒' },
  { value: 'ALPHA',     label: 'Alpha',     emoji: '❌' },
  { value: 'TERLAMBAT', label: 'Terlambat', emoji: '⏰' },
  { value: 'CUTI',      label: 'Cuti',      emoji: '🏖️' },
];

const REQUIRES_KETERANGAN = ['IZIN', 'SAKIT', 'TERLAMBAT', 'CUTI'];

const STATUS_COLORS = {
  HADIR:     { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200'  },
  IZIN:      { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200'   },
  SAKIT:     { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  ALPHA:     { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200'    },
  TERLAMBAT: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  CUTI:      { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
};

const RIWAYAT_PAGE_SIZE = 15;

// ─────────────────────────────────────────────────────────────────────────────
// Calendar constants & helpers
// ─────────────────────────────────────────────────────────────────────────────

const NAMA_BULAN_FULL = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const NAMA_HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const pad2 = (n) => String(n).padStart(2, '0');

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try { return new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return dateString; }
};

const formatTime = (dateString) => {
  if (!dateString) return 'N/A';
  try { return new Date(dateString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return dateString; }
};

const formatTimeShort = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
};

const getDayName = (dateString) => {
  if (!dateString) return '';
  try { return new Date(dateString).toLocaleDateString('id-ID', { weekday: 'long' }); }
  catch { return ''; }
};

const isNightShift = (s) => {
  if (!s.jam_mulai || !s.jam_selesai) return false;
  return new Date(s.jam_selesai) < new Date(s.jam_mulai) ||
    new Date(s.jam_selesai).getDate() !== new Date(s.jam_mulai).getDate();
};

const shiftColorClass = (s) => {
  const h = s.jam_mulai ? new Date(s.jam_mulai).getHours() : -1;
  if (h >= 5  && h < 12) return 'bg-amber-50  text-amber-800  border-amber-200';
  if (h >= 12 && h < 18) return 'bg-sky-50    text-sky-800    border-sky-200';
  if (h !== -1)          return 'bg-indigo-50 text-indigo-800 border-indigo-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
};

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'dashboard', icon: '📊', label: 'Dashboard'       },
  { key: 'riwayat',   icon: '📝', label: 'Riwayat Absensi' },
  { key: 'jadwal',    icon: '📅', label: 'Jadwal Shift'     },
  { key: 'profil',    icon: '👤', label: 'Profil Saya'      },
];

const AppSidebar = ({ user, activeMenu, setActiveMenu, sidebarOpen, setSidebarOpen, onLogout }) => (
  <aside className={`fixed top-0 left-0 w-64 h-full bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
  } lg:translate-x-0`}>
    {/* Mobile close */}
    <div className="lg:hidden absolute top-4 right-4">
      <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    {/* Logo */}
    <div className="p-6 border-b border-gray-200">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
          <span className="text-white text-2xl">🏥</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-green-600">RSUD Sulfat</h1>
          <p className="text-sm text-gray-500">Portal Absensi</p>
        </div>
      </div>
    </div>

    {/* Nav */}
    <nav className="p-4">
      <ul className="space-y-2">
        {NAV_ITEMS.map(({ key, icon, label }) => (
          <li key={key}>
            <button
              onClick={() => { setActiveMenu(key); setSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeMenu === key
                  ? 'bg-green-50 text-green-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>

    {/* User footer */}
    <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-green-700 font-medium">{user?.username?.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{user?.username}</p>
          <p className="text-xs text-gray-500">{user?.roles?.[0] || 'user'}</p>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold flex items-center justify-center space-x-2"
      >
        <span>🚪</span><span>Logout</span>
      </button>
    </div>
  </aside>
);

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard sub-components
// ─────────────────────────────────────────────────────────────────────────────

const TodayStatusCard = ({ todayStatus }) => {
  if (!todayStatus) return null;
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Status Absensi Hari Ini</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-lg p-4 border ${todayStatus.has_checked_in ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className="text-sm text-gray-600 mb-1">Check-In</p>
          <p className={`font-bold text-lg ${todayStatus.has_checked_in ? 'text-green-600' : 'text-gray-400'}`}>
            {todayStatus.has_checked_in ? '✅ Sudah' : '⏳ Belum'}
          </p>
        </div>
        <div className={`rounded-lg p-4 border ${todayStatus.can_check_out ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className="text-sm text-gray-600 mb-1">Check-Out</p>
          <p className={`font-bold text-lg ${todayStatus.can_check_out ? 'text-blue-600' : 'text-gray-400'}`}>
            {todayStatus.absensi?.jam_keluar ? '✅ Sudah' : todayStatus.can_check_out ? '⏳ Bisa' : '❌ Belum'}
          </p>
        </div>
        {todayStatus.absensi?.jam_masuk && (
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <p className="text-sm text-gray-600 mb-1">🕐 Jam Masuk</p>
            <p className="font-bold text-lg text-purple-600">{formatTime(todayStatus.absensi.jam_masuk)}</p>
          </div>
        )}
        {todayStatus.absensi?.jam_keluar && (
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <p className="text-sm text-gray-600 mb-1">🕐 Jam Keluar</p>
            <p className="font-bold text-lg text-orange-600">{formatTime(todayStatus.absensi.jam_keluar)}</p>
          </div>
        )}
        {todayStatus.absensi?.status && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <p className="text-sm text-gray-600 mb-1">📝 Status</p>
            <p className="font-bold text-lg text-yellow-700">
              {STATUS_OPTIONS.find(s => s.value === todayStatus.absensi.status)?.emoji || ''}{' '}
              {todayStatus.absensi.status}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const DeviceSessionCard = ({ user, deviceInfo, todayStatus }) => (
  <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Informasi Perangkat & Session</h3>
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-shrink-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold mb-3 shadow-lg">
          {user?.username?.charAt(0).toUpperCase() || '?'}
        </div>
        <p className="text-sm font-semibold text-gray-900 text-center">{user?.username || 'Guest'}</p>
        <p className="text-xs text-gray-500 text-center">{user?.roles?.[0] || 'user'}</p>
      </div>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xl">🟢</span>
            <p className="text-sm font-medium text-gray-600">Status Session</p>
          </div>
          <p className="font-bold text-lg text-green-600">Active</p>
          <p className="text-xs text-gray-500 mt-1">Online</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xl">{deviceInfo.device === 'Mobile' ? '📱' : '💻'}</span>
            <p className="text-sm font-medium text-gray-600">Perangkat</p>
          </div>
          <p className="font-bold text-lg text-purple-600">{deviceInfo.device}</p>
          <p className="text-xs text-gray-500 mt-1">{deviceInfo.os}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xl">🌐</span>
            <p className="text-sm font-medium text-gray-600">Browser</p>
          </div>
          <p className="font-bold text-lg text-orange-600">{deviceInfo.browser}</p>
          <p className="text-xs text-gray-500 mt-1">Web Browser</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xl">🌐</span>
            <p className="text-sm font-medium text-gray-600">IP Address</p>
          </div>
          <p className="font-bold text-sm text-blue-600 break-all">{todayStatus?.absensi?.ip_address || 'N/A'}</p>
          <p className="text-xs text-gray-500 mt-1">Current IP</p>
        </div>
        {todayStatus?.absensi?.lokasi && (
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-4 border border-yellow-200 sm:col-span-2">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xl">📍</span>
              <p className="text-sm font-medium text-gray-600">Lokasi Check-In</p>
            </div>
            <p className="font-semibold text-yellow-700 text-sm break-words">{todayStatus.absensi.lokasi}</p>
            <p className="text-xs text-gray-500 mt-1">GPS Location</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

const DashboardView = ({
  user, todayStatus, deviceInfo,
  checkInLoading, checkInError, checkInSuccess, checkOutSuccess,
  status, setStatus, keterangan, setKeterangan,
  onCheckIn, onCheckOut,
}) => (
  <>
    {/* Welcome */}
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Selamat Datang di Absensi Dashboard</h2>
      <p className="text-sm sm:text-base text-gray-600 mb-4">Sistem Absensi RSUD Sulfat</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-gray-600 mb-1">Username</p>
          <p className="font-semibold text-gray-900">{user?.username || 'N/A'}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-gray-600 mb-1">Role</p>
          <p className="font-semibold text-gray-900">{user?.roles?.[0] || 'user'}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <p className="text-sm text-gray-600 mb-1">Status</p>
          <p className="font-semibold text-green-600">Active</p>
        </div>
      </div>
    </div>

    <TodayStatusCard todayStatus={todayStatus} />
    <DeviceSessionCard user={user} deviceInfo={deviceInfo} todayStatus={todayStatus} />

    {/* Actions */}
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Absensi Actions</h3>

      {(todayStatus?.can_check_in ?? !todayStatus?.has_checked_in) && (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Kehadiran <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</option>
              ))}
            </select>
          </div>

          {REQUIRES_KETERANGAN.includes(status) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keterangan <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 ml-2">(Wajib diisi untuk status {status})</span>
              </label>
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder={`Masukkan alasan ${status.toLowerCase()}...`}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          )}

          <button
            onClick={onCheckIn}
            disabled={checkInLoading}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {checkInLoading ? 'Processing…' : '✅ Check-In Sekarang'}
          </button>
        </div>
      )}

      {todayStatus?.can_check_out && !todayStatus?.absensi?.jam_keluar && (
        <button
          onClick={onCheckOut}
          disabled={checkInLoading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {checkInLoading ? 'Processing…' : '🚪 Check-Out Sekarang'}
        </button>
      )}

      {todayStatus?.completed_today && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          ✅ Anda sudah menyelesaikan absensi hari ini (Silahkan Check-In lagi).
        </div>
      )}

      {checkInSuccess  && <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">✅ Check-in berhasil! Absensi Anda telah tercatat.</div>}
      {checkOutSuccess && <div className="mt-4 bg-blue-50  border border-blue-200  text-blue-700  px-4 py-3 rounded-lg">✅ Check-out berhasil! Waktu keluar Anda telah tercatat.</div>}
      {checkInError    && <div className="mt-4 bg-red-50   border border-red-200   text-red-700   px-4 py-3 rounded-lg">❌ {checkInError}</div>}
    </div>

    {/* Info */}
    <div className="bg-blue-50 rounded-lg p-4 sm:p-6 border border-blue-200">
      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">ℹ️ Informasi</h3>
      <ul className="space-y-2 text-sm text-gray-700">
        <li>• Klik tombol <strong>Check-In</strong> untuk mencatat kehadiran Anda</li>
        <li>• Lihat riwayat absensi lengkap di menu <strong>Riwayat Absensi</strong></li>
        <li>• IP address Anda akan tercatat secara otomatis saat check-in</li>
      </ul>
    </div>
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
// Riwayat View  (stateful — manages its own data fetching)
// ─────────────────────────────────────────────────────────────────────────────

const RiwayatView = () => {
  const now = new Date();
  const [bulan,  setBulan]  = useState(now.getMonth() + 1);
  const [tahun,  setTahun]  = useState(now.getFullYear());
  const [page,   setPage]   = useState(1);

  const [monthRecords, setMonthRecords] = useState([]);
  const [summary,      setSummary]      = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setPage(1);
    const sd = `${tahun}-${pad2(bulan)}-01`;
    const ed = `${tahun}-${pad2(bulan)}-${pad2(new Date(tahun, bulan, 0).getDate())}`;
    try {
      const [monthRes, summaryRes] = await Promise.all([
        AbsensiRepository.getMyAbsensi(1, 100, sd, ed),
        AbsensiRepository.getSummary(sd, ed),
      ]);
      setMonthRecords(monthRes?.data?.items ?? []);
      setSummary(summaryRes?.data ?? null);
    } catch {
      setError('Gagal memuat riwayat absensi.');
    } finally {
      setLoading(false);
    }
  }, [bulan, tahun]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Calendar ──────────────────────────────────────────────────────────────
  const today        = todayStr();
  const daysInMonth  = new Date(tahun, bulan, 0).getDate();
  const firstDow     = new Date(tahun, bulan - 1, 1).getDay();
  const recordByDay  = {};
  monthRecords.forEach(r => {
    if (!r.tanggal) return;
    const d = parseInt(r.tanggal.split('-')[2], 10);
    if (!recordByDay[d]) recordByDay[d] = [];
    recordByDay[d].push(r);
  });
  const calCells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  // ── Summary chips ─────────────────────────────────────────────────────────
  const summaryTotal = summary
    ? (summary.total_hadir||0)+(summary.total_izin||0)+(summary.total_sakit||0)
      +(summary.total_alpha||0)+(summary.total_terlambat||0)+(summary.total_cuti||0)
    : 0;
  const summaryItems = summary ? [
    { key: 'total',     label: 'Total',        value: summaryTotal,               cls: 'bg-white border text-gray-800'               },
    { key: 'HADIR',     label: '✅ Hadir',      value: summary.total_hadir     ??0, cls: 'bg-green-50  border-green-200  text-green-700'  },
    { key: 'IZIN',      label: '📝 Izin',       value: summary.total_izin      ??0, cls: 'bg-blue-50   border-blue-200   text-blue-700'   },
    { key: 'SAKIT',     label: '🤒 Sakit',      value: summary.total_sakit     ??0, cls: 'bg-orange-50 border-orange-200 text-orange-700' },
    { key: 'ALPHA',     label: '❌ Alpha',      value: summary.total_alpha     ??0, cls: 'bg-red-50    border-red-200    text-red-700'    },
    { key: 'TERLAMBAT', label: '⏰ Terlambat',  value: summary.total_terlambat ??0, cls: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    { key: 'CUTI',      label: '🏖️ Cuti',       value: summary.total_cuti      ??0, cls: 'bg-purple-50 border-purple-200 text-purple-700' },
  ] : [];

  // ── Paginated list ────────────────────────────────────────────────────────
  const sorted     = [...monthRecords].sort((a, b) => (b.tanggal||'').localeCompare(a.tanggal||''));
  const totalPages = Math.ceil(sorted.length / RIWAYAT_PAGE_SIZE);
  const pageItems  = sorted.slice((page - 1) * RIWAYAT_PAGE_SIZE, page * RIWAYAT_PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header + filter */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Riwayat Absensi</h2>
            <p className="text-sm text-gray-600 mt-1">Riwayat kehadiran berdasarkan bulan</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={bulan}
              onChange={e => setBulan(parseInt(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
            >
              {NAMA_BULAN_FULL.slice(1).map((n, i) => (
                <option key={i + 1} value={i + 1}>{n}</option>
              ))}
            </select>
            <input
              type="number" value={tahun}
              onChange={e => setTahun(parseInt(e.target.value))}
              min="2020" max="2100"
              className="border rounded-lg px-3 py-2 text-sm w-24 focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={loadData} disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? '⏳' : '🔄'} Muat
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">❌ {error}</div>
      )}

      {/* Summary chips */}
      {!loading && summaryItems.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {summaryItems.map(({ key, label, value, cls }) => (
            <div key={key} className={`${cls} border rounded-lg px-4 py-3 text-center shadow-sm min-w-[72px]`}>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-700">📅 Kalender {NAMA_BULAN_FULL[bulan]} {tahun}</h3>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto" />
            <p className="mt-3 text-gray-500 text-sm">Memuat data…</p>
          </div>
        ) : (
          <div className="p-3 sm:p-4">
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 mb-2">
              {NAMA_HARI.map((h, i) => (
                <div key={h} className={`text-center text-xs font-semibold py-1 ${i === 0 ? 'text-red-500' : 'text-gray-500'}`}>{h}</div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {calCells.map((day, idx) => {
                if (day === null) return <div key={`e-${idx}`} />;
                const dow       = (firstDow + day - 1) % 7;
                const records   = recordByDay[day] || [];
                const isToday   = `${tahun}-${pad2(bulan)}-${pad2(day)}` === today;
                const firstRec  = records[0];
                const sc        = firstRec ? STATUS_COLORS[firstRec.status] : null;
                return (
                  <div
                    key={day}
                    className={`rounded-lg border min-h-[56px] p-1 text-xs transition-colors ${
                      isToday ? 'border-green-400 bg-green-50' :
                      sc      ? `${sc.bg} ${sc.border}` :
                      dow === 0 ? 'border-red-100 bg-red-50/30' :
                      'border-gray-100 bg-white'
                    }`}
                  >
                    <div className={`font-bold text-center mb-0.5 ${
                      isToday ? 'text-green-700' : dow === 0 ? 'text-red-400' : 'text-gray-700'
                    }`}>
                      {isToday
                        ? <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-[10px]">{day}</span>
                        : day}
                    </div>
                    {firstRec && (
                      <div className={`text-center text-[9px] font-semibold leading-tight ${sc?.text || ''}`}>
                        {STATUS_OPTIONS.find(s => s.value === firstRec.status)?.emoji}{' '}
                        {firstRec.status === 'TERLAMBAT' ? 'TLB' : (firstRec.status?.slice(0, 3) || '')}
                      </div>
                    )}
                    {records.length > 1 && (
                      <div className="text-[8px] text-center text-gray-400">+{records.length - 1}</div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
              {Object.entries(STATUS_COLORS).map(([k, v]) => (
                <span key={k} className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${v.bg} ${v.text}`}>
                  {STATUS_OPTIONS.find(s => s.value === k)?.emoji}{' '}
                  {k === 'TERLAMBAT' ? 'Terlambat' : k.charAt(0) + k.slice(1).toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Paginated list */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700">
            Daftar Absensi {NAMA_BULAN_FULL[bulan]} {tahun}
            <span className="ml-2 text-xs text-gray-400 font-normal">({monthRecords.length} record)</span>
          </h3>
          {totalPages > 1 && (
            <span className="text-xs text-gray-500">Hal. {page} / {totalPages}</span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto" />
          </div>
        ) : pageItems.length > 0 ? (
          <>
            <div className="space-y-3">
              {pageItems.map((item, idx) => {
                const sc        = item.status ? STATUS_COLORS[item.status] : null;
                const isTodayRow = item.tanggal === today;
                return (
                  <div
                    key={item.id || idx}
                    className={`border rounded-lg p-4 transition-colors ${
                      isTodayRow ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900">
                          {item.tanggal
                            ? new Date(item.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'N/A'}
                        </p>
                        <span className="text-xs text-gray-500">{getDayName(item.tanggal)}</span>
                        {isTodayRow && <span className="text-xs text-green-600 font-bold">← Hari ini</span>}
                      </div>
                      {item.status && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sc?.bg || ''} ${sc?.text || ''}`}>
                          {STATUS_OPTIONS.find(s => s.value === item.status)?.emoji} {item.status}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-gray-500">⏰ Masuk</p>
                        <p className="font-semibold text-gray-800">{item.jam_masuk ? formatTime(item.jam_masuk) : '–'}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-gray-500">🚪 Keluar</p>
                        <p className="font-semibold text-gray-800">{item.jam_keluar ? formatTime(item.jam_keluar) : '–'}</p>
                      </div>
                      {item.ip_address && (
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-gray-500">🌐 IP</p>
                          <p className="font-semibold text-gray-800 truncate">{item.ip_address}</p>
                        </div>
                      )}
                      {item.keterangan && (
                        <div className="bg-gray-50 rounded p-2 col-span-2">
                          <p className="text-gray-500">📝 Keterangan</p>
                          <p className="font-semibold text-gray-800">{item.keterangan}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 border rounded-lg text-sm ${
                      p === page ? 'bg-green-600 text-white border-green-600' : 'hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-10 text-gray-400">
            <div className="text-5xl mb-3">📋</div>
            <p className="font-medium">Tidak ada riwayat absensi</p>
            <p className="text-sm mt-1">{NAMA_BULAN_FULL[bulan]} {tahun}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Jadwal Shift View
// ─────────────────────────────────────────────────────────────────────────────

const JadwalShiftView = ({ jadwalList, jadwalLoading, jadwalError, jadwalBulan, jadwalTahun, setJadwalBulan, setJadwalTahun, onLoad }) => {
  const today = todayStr();
  const daysInMonth = new Date(jadwalTahun, jadwalBulan, 0).getDate();
  const firstDow    = new Date(jadwalTahun, jadwalBulan - 1, 1).getDay();

  // Group shifts by day-of-month
  const shiftByDay = {};
  jadwalList.forEach(s => {
    if (!s.tanggal_shift) return;
    const d = parseInt(s.tanggal_shift.split('-')[2], 10);
    if (!shiftByDay[d]) shiftByDay[d] = [];
    shiftByDay[d].push(s);
  });

  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const pagi  = jadwalList.filter(s => { const h = s.jam_mulai ? new Date(s.jam_mulai).getHours() : -1; return h >= 5  && h < 12; }).length;
  const sore  = jadwalList.filter(s => { const h = s.jam_mulai ? new Date(s.jam_mulai).getHours() : -1; return h >= 12 && h < 18; }).length;
  const malam = jadwalList.filter(s => { const h = s.jam_mulai ? new Date(s.jam_mulai).getHours() : -1; return h >= 18 || (h !== -1 && h < 5); }).length;

  return (
    <div className="space-y-4">
      {/* Header + filter */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">📅 Jadwal Shift Saya</h2>
            <p className="text-sm text-gray-500 mt-1">Jadwal shift berdasarkan bulan</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={jadwalBulan}
              onChange={e => setJadwalBulan(parseInt(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
            >
              {NAMA_BULAN_FULL.slice(1).map((n, i) => (
                <option key={i + 1} value={i + 1}>{n}</option>
              ))}
            </select>
            <input
              type="number" value={jadwalTahun}
              onChange={e => setJadwalTahun(parseInt(e.target.value))}
              min="2020" max="2100"
              className="border rounded-lg px-3 py-2 text-sm w-24 focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={onLoad} disabled={jadwalLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {jadwalLoading ? '⏳' : '🔄'} Muat
            </button>
          </div>
        </div>
      </div>

      {jadwalError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{jadwalError}</div>
      )}

      {/* Summary chips */}
      {!jadwalLoading && (
        <div className="flex flex-wrap gap-3">
          {[
            { value: jadwalList.length, label: 'Total Shift',  cls: 'bg-white border text-gray-800'               },
            { value: pagi,              label: '🌅 Pagi',      cls: 'bg-amber-50  border-amber-200  text-amber-700'  },
            { value: sore,              label: '☀️ Siang/Sore',cls: 'bg-sky-50    border-sky-200    text-sky-700'    },
            { value: malam,             label: '🌙 Malam',     cls: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
          ].map(({ value, label, cls }) => (
            <div key={label} className={`${cls} border rounded-lg px-4 py-3 text-center shadow-sm`}>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-700">{NAMA_BULAN_FULL[jadwalBulan]} {jadwalTahun}</h3>
        </div>
        {jadwalLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto" />
            <p className="mt-3 text-gray-500 text-sm">Memuat jadwal…</p>
          </div>
        ) : (
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-7 mb-2">
              {NAMA_HARI.map((h, i) => (
                <div key={h} className={`text-center text-xs font-semibold py-1 ${i === 0 ? 'text-red-500' : 'text-gray-500'}`}>{h}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (day === null) return <div key={`e-${idx}`} />;
                const dow     = (firstDow + day - 1) % 7;
                const shifts  = shiftByDay[day] || [];
                const isToday = `${jadwalTahun}-${pad2(jadwalBulan)}-${pad2(day)}` === today;
                return (
                  <div
                    key={day}
                    className={`rounded-lg border min-h-[72px] p-1 text-xs transition-colors ${
                      isToday  ? 'border-green-400 bg-green-50' :
                      dow === 0 ? 'border-red-100 bg-red-50/40'  :
                      'border-gray-100 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className={`font-bold mb-1 text-center ${isToday ? 'text-green-700' : dow === 0 ? 'text-red-500' : 'text-gray-700'}`}>
                      {isToday
                        ? <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white rounded-full text-[10px]">{day}</span>
                        : day}
                    </div>
                    {shifts.length === 0 ? (
                      <div className="text-gray-300 text-center text-[10px]">—</div>
                    ) : shifts.map((s, si) => (
                      <div
                        key={si}
                        className={`rounded px-1 py-0.5 border mb-0.5 leading-tight ${shiftColorClass(s)}`}
                        title={`${formatTimeShort(s.jam_mulai)} – ${formatTimeShort(s.jam_selesai)}${isNightShift(s) ? ' (lintas hari)' : ''}`}
                      >
                        <div className="font-semibold truncate">{formatTimeShort(s.jam_mulai)}</div>
                        <div className="opacity-75 truncate">→ {formatTimeShort(s.jam_selesai)}{isNightShift(s) ? ' 🌙' : ''}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Detail table */}
      {!jadwalLoading && jadwalList.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h3 className="font-semibold text-gray-700 mb-3">Daftar Shift {NAMA_BULAN_FULL[jadwalBulan]} {jadwalTahun}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-600">
                  {['#', 'Tanggal', 'Hari', 'Jam Mulai', 'Jam Selesai', 'Status'].map(h => (
                    <th key={h} className="border border-gray-200 px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...jadwalList].sort((a, b) => a.tanggal_shift?.localeCompare(b.tanggal_shift)).map((s, i) => {
                  const isTodayRow = s.tanggal_shift === today;
                  return (
                    <tr key={s.id || i} className={isTodayRow ? 'bg-green-50 font-semibold' : 'hover:bg-gray-50'}>
                      <td className="border border-gray-200 px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="border border-gray-200 px-3 py-2">
                        {s.tanggal_shift ? new Date(s.tanggal_shift + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        {isTodayRow && <span className="ml-1 text-xs text-green-600 font-bold">← Hari ini</span>}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-gray-500">
                        {s.tanggal_shift ? new Date(s.tanggal_shift + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long' }) : '-'}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 font-mono">
                        {s.jam_mulai  ? new Date(s.jam_mulai).toLocaleTimeString('id-ID',  { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 font-mono">
                        {s.jam_selesai ? (
                          <>{new Date(s.jam_selesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}{isNightShift(s) && <span className="ml-1 text-indigo-500">🌙</span>}</>
                        ) : '-'}
                      </td>
                      <td className="border border-gray-200 px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          s.status_roster === 'AKTIF' ? 'bg-green-100 text-green-700' :
                          s.status_roster === 'LIBUR' ? 'bg-gray-100  text-gray-500'  :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{s.status_roster || '-'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!jadwalLoading && jadwalList.length === 0 && !jadwalError && (
        <div className="bg-white rounded-lg shadow-md p-10 text-center text-gray-400">
          <div className="text-5xl mb-3">📅</div>
          <p className="font-medium">Tidak ada jadwal shift</p>
          <p className="text-sm mt-1">{NAMA_BULAN_FULL[jadwalBulan]} {jadwalTahun}</p>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Profil View
// ─────────────────────────────────────────────────────────────────────────────

const ProfilView = ({ user, absensi }) => (
  <div className="space-y-6">
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Profil Saya</h2>
      <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-6 pb-6 border-b border-gray-200">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-green-700 font-bold text-4xl">{user?.username?.charAt(0).toUpperCase()}</span>
        </div>
        <div className="text-center sm:text-left">
          <h3 className="text-xl font-bold text-gray-900">{user?.username}</h3>
          <p className="text-gray-600">{user?.roles?.[0] || 'user'}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">✓ Active</span>
        </div>
      </div>
      <div className="space-y-4">
        {[
          { label: 'Username',    value: user?.username || 'N/A' },
          { label: 'Role',        value: user?.roles?.[0] || 'user' },
          { label: 'User ID',     value: user?.id || 'N/A' },
          { label: 'Status Akun', value: '✓ Aktif', valueClass: 'text-green-600' },
        ].map(({ label, value, valueClass }) => (
          <div key={label}>
            <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className={`font-medium ${valueClass || 'text-gray-900'}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Statistik Akun</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-gray-600 mb-1">Total Absensi</p>
          <p className="text-2xl font-bold text-blue-600">{absensi?.length || 0}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-gray-600 mb-1">Status</p>
          <p className="text-2xl font-bold text-green-600">Active</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <p className="text-sm text-gray-600 mb-1">Member Since</p>
          <p className="text-lg font-bold text-purple-600">2026</p>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Root component
// ─────────────────────────────────────────────────────────────────────────────

const AbsensiDashboard = () => {
  const { user, logout }  = useAuth();
  const navigate          = useNavigate();
  const { absensi, loading, error, getMyAbsensi, checkIn, checkOut: checkOutService, getTodayAbsensi } = useAbsensi();
  const now = new Date();
  // UI state
  const [activeMenu,  setActiveMenu]  = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check-in form
  const [status,          setStatus]          = useState('HADIR');
  const [keterangan,      setKeterangan]      = useState('');
  const [checkInLoading,  setCheckInLoading]  = useState(false);
  const [checkInError,    setCheckInError]    = useState(null);
  const [checkInSuccess,  setCheckInSuccess]  = useState(false);
  const [checkOutSuccess, setCheckOutSuccess] = useState(false);

  // Today status
  const [todayStatus,  setTodayStatus]  = useState(null);
  const [todayLoading, setTodayLoading] = useState(false); // eslint-disable-line no-unused-vars

  // Jadwal shift
  const [jadwalBulan,   setJadwalBulan]   = useState(now.getMonth() + 1);
  const [jadwalTahun,   setJadwalTahun]   = useState(now.getFullYear());
  const [jadwalList,    setJadwalList]    = useState([]);
  const [jadwalLoading, setJadwalLoading] = useState(false);
  const [jadwalError,   setJadwalError]   = useState('');

  // Device info
  const [deviceInfo, setDeviceInfo] = useState({ browser: '', device: '', os: '' });

  // Detect device/browser once
  useEffect(() => {
    const ua = navigator.userAgent;
    let browser = 'Unknown', device = 'Desktop', os = 'Unknown';
    if      (ua.includes('Edg'))                                browser = 'Microsoft Edge';
    else if (ua.includes('Chrome'))                             browser = 'Google Chrome';
    else if (ua.includes('Firefox'))                            browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome'))  browser = 'Safari';
    else if (ua.includes('OPR') || ua.includes('Opera'))       browser = 'Opera';
    if      (/Mobi|Android/i.test(ua)) device = 'Mobile';
    else if (/Tablet|iPad/i.test(ua))  device = 'Tablet';
    if      (ua.includes('Win'))       os = 'Windows';
    else if (ua.includes('Android'))   os = 'Android';
    else if (ua.includes('Mac'))       os = 'MacOS';
    else if (ua.includes('Linux'))     os = 'Linux';
    else if (/iPhone|iPad/.test(ua))   os = 'iOS';
    setDeviceInfo({ browser, device, os });
  }, []);

  // Initial load
  useEffect(() => {
    getMyAbsensi(1, 10);
    loadTodayStatus();
  }, []);

  // Load jadwal when tab active or filters change
  useEffect(() => {
    if (activeMenu === 'jadwal') loadJadwal(jadwalBulan, jadwalTahun);
  }, [activeMenu, jadwalBulan, jadwalTahun]);

  const loadJadwal = useCallback(async (bulan, tahun) => {
    setJadwalLoading(true);
    setJadwalError('');
    try {
      const y = tahun || jadwalTahun;
      const m = bulan || jadwalBulan;
      const tanggal_mulai   = `${y}-${pad2(m)}-01`;
      const tanggal_selesai = `${y}-${pad2(m)}-${pad2(new Date(y, m, 0).getDate())}`;
      const res = await RosterShiftRepository.getAll(0, 200, { id_pegawai: user?.id, tanggal_mulai, tanggal_selesai });
      setJadwalList(res?.data?.items ?? res?.items ?? []);
    } catch {
      setJadwalError('Gagal memuat jadwal shift.');
    } finally {
      setJadwalLoading(false);
    }
  }, [jadwalTahun, jadwalBulan, user?.id]);

  const loadTodayStatus = async () => {
    try {
      setTodayLoading(true);
      const res = await getTodayAbsensi();
      setTodayStatus(res.data);
    } catch { setTodayStatus(null); }
    finally  { setTodayLoading(false); }
  };

  const handleCheckIn = async () => {
    if (REQUIRES_KETERANGAN.includes(status) && !keterangan.trim()) {
      setCheckInError(`Keterangan wajib diisi untuk status ${status}`);
      return;
    }
    try {
      setCheckInLoading(true);
      setCheckInError(null);
      setCheckInSuccess(false);
      await checkIn({ status, ...(keterangan.trim() ? { keterangan: keterangan.trim() } : {}) });
      setCheckInSuccess(true);
      setStatus('HADIR');
      setKeterangan('');
      setTimeout(() => { getMyAbsensi(1, 10); loadTodayStatus(); setCheckInSuccess(false); }, 2000);
    } catch (err) {
      setCheckInError(err.message || 'Gagal melakukan check-in');
    } finally { setCheckInLoading(false); }
  };

  const handleCheckOut = async () => {
    try {
      setCheckInLoading(true);
      setCheckInError(null);
      setCheckOutSuccess(false);
      await checkOutService();
      setCheckOutSuccess(true);
      setTimeout(() => { getMyAbsensi(1, 10); loadTodayStatus(); setCheckOutSuccess(false); }, 2000);
    } catch (err) {
      setCheckInError(err.message || 'Gagal melakukan check-out');
    } finally { setCheckInLoading(false); }
  };

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ } finally { navigate('/login-absensi'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white shadow-md z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
            <span className="text-white text-lg">🏥</span>
          </div>
          <h1 className="text-sm font-bold text-green-600">RSUD Sulfat</h1>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <AppSidebar
        user={user} activeMenu={activeMenu} setActiveMenu={setActiveMenu}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onLogout={handleLogout}
      />

      <main className="lg:ml-64 pt-16 lg:pt-0 p-4 lg:p-8">
        {activeMenu === 'dashboard' && (
          <DashboardView
            user={user} todayStatus={todayStatus} deviceInfo={deviceInfo}
            checkInLoading={checkInLoading} checkInError={checkInError}
            checkInSuccess={checkInSuccess} checkOutSuccess={checkOutSuccess}
            status={status} setStatus={setStatus}
            keterangan={keterangan} setKeterangan={setKeterangan}
            onCheckIn={handleCheckIn} onCheckOut={handleCheckOut}
          />
        )}
        {activeMenu === 'riwayat' && <RiwayatView />}
        {activeMenu === 'jadwal' && (
          <JadwalShiftView
            jadwalList={jadwalList} jadwalLoading={jadwalLoading} jadwalError={jadwalError}
            jadwalBulan={jadwalBulan} jadwalTahun={jadwalTahun}
            setJadwalBulan={setJadwalBulan} setJadwalTahun={setJadwalTahun}
            onLoad={() => loadJadwal(jadwalBulan, jadwalTahun)}
          />
        )}
        {activeMenu === 'profil' && (
          <ProfilView user={user} absensi={absensi} />
        )}
      </main>
    </div>
  );
};

export default AbsensiDashboard;
