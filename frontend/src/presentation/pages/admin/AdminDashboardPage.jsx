import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../domain/hooks';
import StatsRepository from '../../../data/repositories/StatsRepository';
import AbsensiRepository from '../../../data/repositories/AbsensiRepository';
import ApprovalRepository from '../../../data/repositories/ApprovalRepository';
import { formatErrorMessage } from '../../../utils/errorHandler';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  HADIR:     { label: 'Hadir',     emoji: '✅', color: 'bg-green-500',  textColor: 'text-green-700',  bgLight: 'bg-green-50'  },
  IZIN:      { label: 'Izin',      emoji: '📝', color: 'bg-blue-500',   textColor: 'text-blue-700',   bgLight: 'bg-blue-50'   },
  SAKIT:     { label: 'Sakit',     emoji: '🤒', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  ALPHA:     { label: 'Alpha',     emoji: '❌', color: 'bg-red-500',    textColor: 'text-red-700',    bgLight: 'bg-red-50'    },
  TERLAMBAT: { label: 'Terlambat', emoji: '⏰', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  CUTI:      { label: 'Cuti',      emoji: '🏖️', color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50' },
};

const today = new Date().toISOString().split('T')[0];

const ErrorBanner = ({ message }) =>
  message ? (
    <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
      <span className="text-xl">⚠️</span>
      <pre className="text-sm whitespace-pre-wrap font-sans flex-1">{message}</pre>
    </div>
  ) : null;

// ---------------------------------------------------------------------------
// 1. ADMIN PANEL  (menu_guard.is_admin === true)
// ---------------------------------------------------------------------------

const AdminPanel = ({ user, menuGuard }) => {
  const [totalUsers, setTotalUsers]       = useState('-');
  const [totalPegawai, setTotalPegawai]   = useState('-');
  const [totalRoles, setTotalRoles]       = useState('-');
  const [absensiToday, setAbsensiToday]   = useState('-');
  const [kpiSummary, setKpiSummary]       = useState(null);
  const [statusBreakdown, setStatusBreakdown] = useState({});
  const [loadingAbsensi, setLoadingAbsensi]   = useState(false);
  const [error, setError]       = useState(null);
  const [statsError, setStatsError] = useState(null);

  const kpiEndpoint = menuGuard?.menus?.kpi_unit_role?.endpoint || '/stats/kpi/unit-role';

  useEffect(() => {
    const loadStats = async () => {
      try {
        setStatsError(null);
        const [statsRes, kpiRes] = await Promise.all([
          StatsRepository.getStats(),
          StatsRepository.getKpiUnitRole({ start_date: today, end_date: today }, kpiEndpoint),
        ]);
        const d = statsRes?.data || {};
        setTotalUsers(d.users_total ?? '-');
        setTotalPegawai(d.pegawai_total ?? '-');
        setTotalRoles(d.roles_total ?? '-');
        setAbsensiToday(d.absensi_today ?? '-');
        setKpiSummary(kpiRes?.data?.summary || null);
      } catch (err) {
        setStatsError(formatErrorMessage(err, 'Gagal memuat statistik', user));
      }
    };

    const loadTodayAbsensi = async () => {
      try {
        setLoadingAbsensi(true);
        setError(null);
        const res = await AbsensiRepository.getStatistics(today, today);
        const d = res?.data || {};
        setStatusBreakdown(d.by_status || {});
        if (d.today_count != null) setAbsensiToday(d.today_count);
      } catch (err) {
        setError(formatErrorMessage(err, 'Gagal memuat absensi hari ini', user));
      } finally {
        setLoadingAbsensi(false);
      }
    };

    loadStats();
    loadTodayAbsensi();
  }, [kpiEndpoint]);

  const stats = useMemo(() => [
    { label: 'Total Users',    value: totalUsers,   icon: '👥', color: 'bg-blue-500'   },
    { label: 'Total Pegawai',  value: totalPegawai, icon: '👨‍💼', color: 'bg-green-500'  },
    { label: 'Absensi Hari Ini', value: absensiToday, icon: '📝', color: 'bg-yellow-500' },
    { label: 'Total Roles',    value: totalRoles,   icon: '🔐', color: 'bg-purple-500'  },
  ], [totalUsers, totalPegawai, absensiToday, totalRoles]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Selamat datang, <span className="font-medium">{user?.username}</span>
            {' · '}
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700">
              {user?.roles?.[0] || 'admin'}
            </span>
          </p>
        </div>
      </div>

      <ErrorBanner message={statsError} />
      <ErrorBanner message={error} />

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 flex items-center gap-4">
            <div className={`${s.color} w-12 h-12 rounded-lg flex items-center justify-center shrink-0`}>
              <span className="text-2xl">{s.icon}</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* KPI Shift */}
      {kpiSummary && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3">KPI Shift — Hari Ini</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Terlambat',       value: kpiSummary.late               ?? 0, color: 'text-yellow-600' },
              { label: 'Pulang Cepat',    value: kpiSummary.early_leave        ?? 0, color: 'text-orange-600' },
              { label: 'Mangkir',         value: kpiSummary.mangkir            ?? 0, color: 'text-red-600'    },
              { label: 'Missing Checkout',value: kpiSummary.missing_checkout   ?? 0, color: 'text-rose-600'   },
              { label: 'Terjadwal',       value: kpiSummary.terjadwal_total    ?? 0, color: 'text-blue-600'   },
              { label: 'Tidak Terjadwal', value: kpiSummary.tidak_terjadwal_total ?? 0, color: 'text-gray-600' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">{m.label}</p>
                <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status breakdown */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-700 mb-3">Status Absensi — Hari Ini</h2>
        {loadingAbsensi ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            Memuat data…
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
              const count = statusBreakdown[status] || 0;
              return (
                <div key={status} className={`${cfg.bgLight} rounded-xl border border-gray-200 p-4`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl">{cfg.emoji}</span>
                    <span className={`text-lg font-bold ${cfg.textColor}`}>{count}</span>
                  </div>
                  <p className={`text-xs font-semibold ${cfg.textColor}`}>{cfg.label}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: '/pegawai',          icon: '👨‍💼', label: 'Kelola Pegawai',   desc: 'Tambah, edit, hapus pegawai'    },
            { href: '/absensi',          icon: '📝', label: 'Monitoring Absensi', desc: 'Pantau kehadiran pegawai'       },
            { href: '/approval',         icon: '✅', label: 'Approval',           desc: 'Kelola pengajuan koreksi'       },
            { href: '/rekap-unit-role',  icon: '📈', label: 'KPI Unit/Role',      desc: 'Rekap performa per unit'        },
            { href: '/roster-upload',    icon: '📄', label: 'Roster Upload',      desc: 'Import roster dari Excel'       },
            { href: '/penilaian-shift',  icon: '⚖️', label: 'Evaluasi Shift',     desc: 'Jalankan evaluasi roster'       },
            { href: '/sessions-monitor', icon: '📡', label: 'Monitor Sesi',       desc: 'Pantau sesi login pengguna'     },
            { href: '/users',            icon: '👥', label: 'Kelola Users',       desc: 'Atur akses pengguna sistem'     },
          ].map((a) => (
            <Link key={a.href} to={a.href} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-2">{a.icon}</div>
              <h3 className="text-sm font-semibold text-gray-900">{a.label}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2. KA-UNIT PANEL  (menu_guard.is_kepala_unit === true)
// ---------------------------------------------------------------------------

const KaUnitPanel = ({ user, menuGuard }) => {
  const [kpiSummary, setKpiSummary]       = useState(null);
  const [watermark, setWatermark]         = useState(null);
  const [approvalCount, setApprovalCount] = useState(null);
  const [statusBreakdown, setStatusBreakdown] = useState({});
  const [loadingAbsensi, setLoadingAbsensi]   = useState(false);
  const [error, setError] = useState(null);

  const kpiEndpoint = menuGuard?.menus?.kpi_unit_role?.endpoint || '/stats/kpi/unit-role/my-unit';
  const scopeId     = menuGuard?.kepala_unit_scope_id;

  useEffect(() => {
    const loadAll = async () => {
      try {
        setError(null);
        const kpiRes = await StatsRepository.getKpiUnitRole(
          { start_date: today, end_date: today },
          kpiEndpoint
        );
        setKpiSummary(kpiRes?.data?.summary || null);
        setWatermark(kpiRes?.data?.watermark || null);
      } catch (err) {
        // 403: endpoint belum dikonfigurasi untuk role ini — tampilkan dashboard
        // tanpa KPI daripada memblokir seluruh halaman dengan error besar
        if (err?.response?.status === 403) {
          console.warn('KPI endpoint tidak dapat diakses oleh role ini (403). KPI disembunyikan.');
          setKpiSummary(null);
          setWatermark(null);
        } else {
          setError(formatErrorMessage(err, 'Gagal memuat KPI unit', user));
        }
      }
    };

    const loadApproval = async () => {
      try {
        const res = await ApprovalRepository.getAssigned(0, 1);
        const d = res?.data?.data ?? res?.data ?? {};
        setApprovalCount(d.total ?? null);
      } catch (_) { /* approval count optional */ }
    };

    const loadAbsensi = async () => {
      try {
        setLoadingAbsensi(true);
        const params = scopeId ? { id_unit: scopeId } : {};
        const res = await AbsensiRepository.getStatistics(today, today, params);
        setStatusBreakdown(res?.data?.by_status || {});
      } catch (_) { /* absensi breakdown optional */ } finally {
        setLoadingAbsensi(false);
      }
    };

    loadAll();
    loadApproval();
    loadAbsensi();
  }, [kpiEndpoint, scopeId]);

  const freshnessColor = (minutes) => {
    if (minutes == null) return 'text-gray-500';
    if (minutes < 60) return 'text-green-600';
    if (minutes < 240) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard Kepala Unit</h1>
          <p className="text-sm text-gray-500 mt-1">
            Selamat datang, <span className="font-medium">{user?.username}</span>
            {scopeId && (
              <>
                {' · '}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                  Unit #{scopeId}
                </span>
              </>
            )}
          </p>
        </div>
        {approvalCount !== null && approvalCount > 0 && (
          <Link
            to="/approval"
            className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
          >
            ⏳ {approvalCount} pengajuan menunggu keputusan
          </Link>
        )}
      </div>

      <ErrorBanner message={error} />

      {/* Watermark */}
      {watermark && (
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>📅 Per tanggal: <strong>{watermark.as_of ?? '-'}</strong></span>
          <span>🕐 Terakhir dievaluasi: <strong>{watermark.last_evaluated_at ? new Date(watermark.last_evaluated_at).toLocaleString('id-ID') : '-'}</strong></span>
          <span>
            ⚡ Kesegaran data:{' '}
            <strong className={freshnessColor(watermark.data_freshness_minutes)}>
              {watermark.data_freshness_minutes != null ? `${watermark.data_freshness_minutes} mnt lalu` : '-'}
            </strong>
          </span>
        </div>
      )}

      {/* KPI metrics */}
      {kpiSummary ? (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-3">KPI Unit — Hari Ini</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Terlambat',        value: kpiSummary.late                      ?? 0, color: 'text-yellow-600' },
              { label: 'Pulang Cepat',     value: kpiSummary.early_leave               ?? 0, color: 'text-orange-600' },
              { label: 'Mangkir',          value: kpiSummary.mangkir                   ?? 0, color: 'text-red-600'    },
              { label: 'Missing Checkout', value: kpiSummary.missing_checkout          ?? 0, color: 'text-rose-600'   },
              { label: 'Terjadwal',        value: kpiSummary.terjadwal_total           ?? 0, color: 'text-blue-600'   },
              { label: 'Belum Dievaluasi', value: kpiSummary.scheduled_unassessed_total ?? 0, color: 'text-gray-500'  },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">{m.label}</p>
                <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !error && (
          <div className="mb-6 bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            Memuat KPI…
          </div>
        )
      )}

      {/* Status breakdown */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-700 mb-3">Status Absensi Unit — Hari Ini</h2>
        {loadingAbsensi ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">Memuat…</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
              const count = statusBreakdown[status] || 0;
              return (
                <div key={status} className={`${cfg.bgLight} rounded-xl border border-gray-200 p-4`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl">{cfg.emoji}</span>
                    <span className={`text-lg font-bold ${cfg.textColor}`}>{count}</span>
                  </div>
                  <p className={`text-xs font-semibold ${cfg.textColor}`}>{cfg.label}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Akses Cepat</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            menuGuard?.menus?.monitoring_absensi?.visible && { href: '/absensi',         icon: '📝', label: 'Monitoring Absensi', desc: 'Pantau kehadiran unit' },
            menuGuard?.menus?.approval?.visible            && { href: '/approval',        icon: '✅', label: 'Approval',           desc: 'Proses pengajuan koreksi' },
            menuGuard?.menus?.kpi_unit_role?.visible       && { href: '/rekap-unit-role', icon: '📈', label: 'Rekap KPI',          desc: 'Detail performa unit' },
            menuGuard?.menus?.user_sessions?.visible       && { href: '/sessions-monitor',icon: '📡', label: 'Monitor Sesi',       desc: 'Sesi login pegawai' },
          ].filter(Boolean).map((a) => (
            <Link key={a.href} to={a.href} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-2">{a.icon}</div>
              <h3 className="text-sm font-semibold text-gray-900">{a.label}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3. USER PANEL  (pegawai yang login via admin login)
// ---------------------------------------------------------------------------

const UserPanel = ({ user, menuGuard }) => {
  const navigate = useNavigate();
  const canApproval = !!menuGuard?.menus?.approval?.visible;

  return (
    <div className="max-w-lg mx-auto mt-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">👤</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Halo, {user?.username}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {user?.roles?.[0] || 'User'} · Akun pegawai
        </p>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-left text-sm text-amber-800">
          <p className="font-semibold mb-1">ℹ️ Anda masuk melalui halaman admin</p>
          <p>Halaman absensi harian tersedia di portal pegawai. Klik tombol di bawah untuk berpindah.</p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => navigate('/absensi-dashboard')}
            className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Buka Portal Absensi →
          </button>
          {canApproval && (
            <Link
              to="/approval"
              className="w-full bg-white border border-gray-200 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
            >
              ✅ Lihat Pengajuan Saya
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root — picks the right panel based on menu_guard
// ---------------------------------------------------------------------------

const Dashboard = () => {
  const { user } = useAuth();
  const menuGuard = user?.menu_guard ?? {};

  if (menuGuard.is_admin) return <AdminPanel user={user} menuGuard={menuGuard} />;
  if (menuGuard.is_kepala_unit) return <KaUnitPanel user={user} menuGuard={menuGuard} />;
  return <UserPanel user={user} menuGuard={menuGuard} />;
};

export default Dashboard;
