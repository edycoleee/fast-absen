import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../domain/hooks';
import StatsRepository from '../../../data/repositories/StatsRepository';
import AbsensiRepository from '../../../data/repositories/AbsensiRepository';
import ApprovalRepository from '../../../data/repositories/ApprovalRepository';
import { formatErrorMessage } from '../../../utils/errorHandler';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  HADIR:     { label: 'Hadir',     emoji: '✅', textColor: 'text-green-700',  bgLight: 'bg-green-50'  },
  IZIN:      { label: 'Izin',      emoji: '📝', textColor: 'text-blue-700',   bgLight: 'bg-blue-50'   },
  SAKIT:     { label: 'Sakit',     emoji: '🤒', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  ALPHA:     { label: 'Alpha',     emoji: '❌', textColor: 'text-red-700',    bgLight: 'bg-red-50'    },
  TERLAMBAT: { label: 'Terlambat', emoji: '⏰', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  CUTI:      { label: 'Cuti',      emoji: '🏖️', textColor: 'text-purple-700', bgLight: 'bg-purple-50' },
};

const today = new Date().toISOString().split('T')[0];

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI components
// ─────────────────────────────────────────────────────────────────────────────

/** Full-width error banner */
const ErrorBanner = ({ message }) =>
  message ? (
    <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
      <span className="text-xl">⚠️</span>
      <pre className="text-sm whitespace-pre-wrap font-sans flex-1">{message}</pre>
    </div>
  ) : null;

/** Section heading */
const SectionTitle = ({ children }) => (
  <h2 className="text-base font-semibold text-gray-700 mb-3">{children}</h2>
);

/** Large icon + number card (e.g. Total Users) */
const StatCard = ({ icon, label, value, iconBg = 'bg-primary-500' }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 flex items-center gap-4">
    <div className={`${iconBg} w-12 h-12 rounded-lg flex items-center justify-center shrink-0`}>
      <span className="text-2xl">{icon}</span>
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

/** Small KPI metric card */
const MetricCard = ({ label, value, valueColor = 'text-gray-900' }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
  </div>
);

/** Status absensi card */
const StatusCard = ({ emoji, label, count, textColor, bgLight }) => (
  <div className={`${bgLight} rounded-xl border border-gray-200 p-4`}>
    <div className="flex items-center justify-between mb-1">
      <span className="text-xl">{emoji}</span>
      <span className={`text-lg font-bold ${textColor}`}>{count}</span>
    </div>
    <p className={`text-xs font-semibold ${textColor}`}>{label}</p>
  </div>
);

/** Quick-action link card */
const ActionCard = ({ href, icon, label, desc }) => (
  <Link to={href} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div className="text-3xl mb-2">{icon}</div>
    <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
  </Link>
);

/** Top dashboard header: title + subtitle + optional badge + right slot */
const DashboardHeader = ({ title, subtitle, badge, children }) => (
  <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
      <p className="text-sm text-gray-500 mt-1">
        {subtitle}
        {badge && (
          <>
            {' · '}
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700">
              {badge}
            </span>
          </>
        )}
      </p>
    </div>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 1. DASHBOARD ADMIN
// ─────────────────────────────────────────────────────────────────────────────

const AdminPanel = ({ user, menuGuard }) => {
  const [totalUsers,    setTotalUsers]    = useState('-');
  const [totalPegawai,  setTotalPegawai]  = useState('-');
  const [totalRoles,    setTotalRoles]    = useState('-');
  const [absensiToday,  setAbsensiToday]  = useState('-');
  const [kpiSummary,    setKpiSummary]    = useState(null);
  const [statusBreakdown, setStatusBreakdown] = useState({});
  const [loadingAbsensi,  setLoadingAbsensi]  = useState(false);
  const [error,      setError]      = useState(null);
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

  const statCards = useMemo(() => [
    { icon: '👥', label: 'Total Users',      value: totalUsers,   iconBg: 'bg-blue-500'   },
    { icon: '👨‍💼', label: 'Total Pegawai',    value: totalPegawai, iconBg: 'bg-green-500'  },
    { icon: '📝', label: 'Absensi Hari Ini', value: absensiToday, iconBg: 'bg-yellow-500' },
    { icon: '🔐', label: 'Total Roles',      value: totalRoles,   iconBg: 'bg-purple-500' },
  ], [totalUsers, totalPegawai, absensiToday, totalRoles]);

  const kpiMetrics = kpiSummary ? [
    { label: 'Terlambat',        value: kpiSummary.late                  ?? 0, valueColor: 'text-yellow-600' },
    { label: 'Pulang Cepat',     value: kpiSummary.early_leave           ?? 0, valueColor: 'text-orange-600' },
    { label: 'Mangkir',          value: kpiSummary.mangkir               ?? 0, valueColor: 'text-red-600'    },
    { label: 'Missing Checkout', value: kpiSummary.missing_checkout      ?? 0, valueColor: 'text-rose-600'   },
    { label: 'Terjadwal',        value: kpiSummary.terjadwal_total       ?? 0, valueColor: 'text-blue-600'   },
    { label: 'Tidak Terjadwal',  value: kpiSummary.tidak_terjadwal_total ?? 0, valueColor: 'text-gray-600'   },
  ] : [];

  const quickActions = [
    { href: '/pegawai',          icon: '👨‍💼', label: 'Kelola Pegawai',    desc: 'Tambah, edit, hapus pegawai'   },
    { href: '/absensi',          icon: '📝', label: 'Monitoring Absensi', desc: 'Pantau kehadiran pegawai'      },
    { href: '/approval',         icon: '✅', label: 'Approval',           desc: 'Kelola pengajuan koreksi'      },
    { href: '/rekap-unit-role',  icon: '📈', label: 'KPI Unit/Role',      desc: 'Rekap performa per unit'       },
    { href: '/roster-upload',    icon: '📄', label: 'Roster Upload',      desc: 'Import roster dari Excel'      },
    { href: '/penilaian-shift',  icon: '⚖️', label: 'Evaluasi Shift',     desc: 'Jalankan evaluasi roster'      },
    { href: '/sessions-monitor', icon: '📡', label: 'Monitor Sesi',       desc: 'Pantau sesi login pengguna'    },
    { href: '/users',            icon: '👥', label: 'Kelola Users',       desc: 'Atur akses pengguna sistem'    },
  ];

  return (
    <div>
      <DashboardHeader
        title="Dashboard Admin"
        subtitle={`Selamat datang, ${user?.username}`}
        badge={user?.roles?.[0] || 'admin'}
      />

      <ErrorBanner message={statsError} />
      <ErrorBanner message={error} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {kpiMetrics.length > 0 && (
        <div className="mb-6">
          <SectionTitle>KPI Shift — Hari Ini</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpiMetrics.map((m) => <MetricCard key={m.label} {...m} />)}
          </div>
        </div>
      )}

      <div className="mb-6">
        <SectionTitle>Status Absensi — Hari Ini</SectionTitle>
        {loadingAbsensi ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">Memuat data…</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <StatusCard key={key} emoji={cfg.emoji} label={cfg.label}
                count={statusBreakdown[key] || 0} textColor={cfg.textColor} bgLight={cfg.bgLight} />
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionTitle>Akses Cepat</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((a) => <ActionCard key={a.href} {...a} />)}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. DASHBOARD KEPALA UNIT
// ─────────────────────────────────────────────────────────────────────────────

const KaUnitPanel = ({ user, menuGuard }) => {
  const [kpiSummary,      setKpiSummary]      = useState(null);
  const [watermark,       setWatermark]       = useState(null);
  const [approvalCount,   setApprovalCount]   = useState(null);
  const [statusBreakdown, setStatusBreakdown] = useState({});
  const [loadingAbsensi,  setLoadingAbsensi]  = useState(false);
  const [error, setError] = useState(null);

  const kpiEndpoint = menuGuard?.menus?.kpi_unit_role?.endpoint || '/stats/kpi/unit-role/my-unit';
  const scopeId     = menuGuard?.kepala_unit_scope_id;

  useEffect(() => {
    const loadKpi = async () => {
      try {
        setError(null);
        const res = await StatsRepository.getKpiUnitRole(
          { start_date: today, end_date: today },
          kpiEndpoint
        );
        setKpiSummary(res?.data?.summary || null);
        setWatermark(res?.data?.watermark || null);
      } catch (err) {
        if (err?.response?.status === 403) {
          console.warn('KPI endpoint tidak dapat diakses (403) — disembunyikan.');
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
      } catch (_) { /* opsional */ }
    };

    const loadAbsensi = async () => {
      try {
        setLoadingAbsensi(true);
        const params = scopeId ? { id_unit: scopeId } : {};
        const res = await AbsensiRepository.getStatistics(today, today, params);
        setStatusBreakdown(res?.data?.by_status || {});
      } catch (_) { /* opsional */ } finally {
        setLoadingAbsensi(false);
      }
    };

    loadKpi();
    loadApproval();
    loadAbsensi();
  }, [kpiEndpoint, scopeId]);

  const freshnessColor = (minutes) => {
    if (minutes == null) return 'text-gray-500';
    if (minutes < 60)    return 'text-green-600';
    if (minutes < 240)   return 'text-yellow-600';
    return 'text-red-600';
  };

  const kpiMetrics = kpiSummary ? [
    { label: 'Terlambat',         value: kpiSummary.late                       ?? 0, valueColor: 'text-yellow-600' },
    { label: 'Pulang Cepat',      value: kpiSummary.early_leave                ?? 0, valueColor: 'text-orange-600' },
    { label: 'Mangkir',           value: kpiSummary.mangkir                    ?? 0, valueColor: 'text-red-600'    },
    { label: 'Missing Checkout',  value: kpiSummary.missing_checkout           ?? 0, valueColor: 'text-rose-600'   },
    { label: 'Terjadwal',         value: kpiSummary.terjadwal_total            ?? 0, valueColor: 'text-blue-600'   },
    { label: 'Belum Dievaluasi',  value: kpiSummary.scheduled_unassessed_total ?? 0, valueColor: 'text-gray-500'   },
  ] : [];

  const quickActions = [
    menuGuard?.menus?.monitoring_absensi?.visible && { href: '/absensi',          icon: '📝', label: 'Monitoring Absensi', desc: 'Pantau kehadiran unit'    },
    menuGuard?.menus?.approval?.visible            && { href: '/approval',         icon: '✅', label: 'Approval',           desc: 'Proses pengajuan koreksi' },
    menuGuard?.menus?.kpi_unit_role?.visible       && { href: '/rekap-unit-role',  icon: '📈', label: 'Rekap KPI',          desc: 'Detail performa unit'     },
    menuGuard?.menus?.user_sessions?.visible       && { href: '/sessions-monitor', icon: '📡', label: 'Monitor Sesi',       desc: 'Sesi login pegawai'       },
  ].filter(Boolean);

  return (
    <div>
      <DashboardHeader
        title="Dashboard Kepala Unit"
        subtitle={`Selamat datang, ${user?.username}`}
        badge={scopeId ? `Unit #${scopeId}` : undefined}
      >
        {approvalCount > 0 && (
          <Link
            to="/approval"
            className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
          >
            ⏳ {approvalCount} pengajuan menunggu keputusan
          </Link>
        )}
      </DashboardHeader>

      <ErrorBanner message={error} />

      {watermark && (
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>📅 Per tanggal: <strong>{watermark.as_of ?? '-'}</strong></span>
          <span>🕐 Terakhir dievaluasi: <strong>
            {watermark.last_evaluated_at
              ? new Date(watermark.last_evaluated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
              : '-'}
          </strong></span>
          <span>
            ⚡ Kesegaran data:{' '}
            <strong className={freshnessColor(watermark.data_freshness_minutes)}>
              {watermark.data_freshness_minutes != null
                ? `${watermark.data_freshness_minutes} mnt lalu`
                : '-'}
            </strong>
          </span>
        </div>
      )}

      {kpiMetrics.length > 0 ? (
        <div className="mb-6">
          <SectionTitle>KPI Unit — Hari Ini</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpiMetrics.map((m) => <MetricCard key={m.label} {...m} />)}
          </div>
        </div>
      ) : (
        !error && (
          <div className="mb-6 bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">Memuat KPI…</div>
        )
      )}

      <div className="mb-6">
        <SectionTitle>Status Absensi Unit — Hari Ini</SectionTitle>
        {loadingAbsensi ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">Memuat…</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <StatusCard key={key} emoji={cfg.emoji} label={cfg.label}
                count={statusBreakdown[key] || 0} textColor={cfg.textColor} bgLight={cfg.bgLight} />
            ))}
          </div>
        )}
      </div>

      {quickActions.length > 0 && (
        <div>
          <SectionTitle>Akses Cepat</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((a) => <ActionCard key={a.href} {...a} />)}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. DASHBOARD PEGAWAI  (pegawai login via portal admin)
// ─────────────────────────────────────────────────────────────────────────────

const UserPanel = ({ user, menuGuard }) => {
  const navigate    = useNavigate();
  const canApproval = !!menuGuard?.menus?.approval?.visible;

  return (
    <div className="max-w-lg mx-auto mt-8">
      <DashboardHeader
        title="Dashboard Pegawai"
        subtitle={user?.username}
        badge={user?.roles?.[0] || 'pegawai'}
      />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">👤</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Halo, {user?.username}</h2>
        <p className="text-sm text-gray-500 mt-1">{user?.roles?.[0] || 'Pegawai'} · Akun pegawai</p>

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

// ─────────────────────────────────────────────────────────────────────────────
// Root — memilih panel sesuai menu_guard
// ─────────────────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const { user } = useAuth();
  const menuGuard = user?.menu_guard ?? {};

  if (menuGuard.is_admin)       return <AdminPanel  user={user} menuGuard={menuGuard} />;
  if (menuGuard.is_kepala_unit) return <KaUnitPanel user={user} menuGuard={menuGuard} />;
  return                               <UserPanel   user={user} menuGuard={menuGuard} />;
};

export default Dashboard;
