import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../domain/hooks';
import StatsRepository from '../../../data/repositories/StatsRepository';
import AbsensiRepository from '../../../data/repositories/AbsensiRepository';

// Status configuration with colors
const STATUS_CONFIG = {
  HADIR: { label: 'Hadir', emoji: '✅', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  IZIN: { label: 'Izin', emoji: '📝', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  SAKIT: { label: 'Sakit', emoji: '🤒', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  ALPHA: { label: 'Alpha', emoji: '❌', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  TERLAMBAT: { label: 'Terlambat', emoji: '⏰', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  CUTI: { label: 'Cuti', emoji: '🏖️', color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50' },
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [totalUsers, setTotalUsers] = useState('-');
  const [totalPegawai, setTotalPegawai] = useState('-');
  const [totalRoles, setTotalRoles] = useState('-');
  const [absensiToday, setAbsensiToday] = useState('-');
  const [todayAbsensiList, setTodayAbsensiList] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState({});
  const [loadingAbsensi, setLoadingAbsensi] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await StatsRepository.getStats();
        const data = response?.data || {};

        setTotalUsers(data.users_total ?? '-');
        setTotalPegawai(data.pegawai_total ?? '-');
        setTotalRoles(data.roles_total ?? '-');
        setAbsensiToday(data.absensi_today ?? '-');
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
    };

    const loadTodayAbsensi = async () => {
      try {
        setLoadingAbsensi(true);
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Fetch all absensi (will be filtered on server if endpoint supports it)
        // For now, we'll get recent absensi and filter client-side
        const response = await AbsensiRepository.getAll(1, 1000);
        const items = response?.data?.items || [];

        // Filter for today's absensi
        const todayItems = items.filter(item => {
          if (!item.tanggal) return false;
          const itemDate = new Date(item.tanggal).toISOString().split('T')[0];
          return itemDate === todayStr;
        });

        setTodayAbsensiList(todayItems);

        // Calculate status breakdown
        const breakdown = todayItems.reduce((acc, item) => {
          const status = item.status || 'HADIR';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});

        setStatusBreakdown(breakdown);
      } catch (err) {
        console.error('Failed to load today absensi:', err);
      } finally {
        setLoadingAbsensi(false);
      }
    };

    loadStats();
    loadTodayAbsensi();
  }, []);

  const stats = useMemo(() => ([
    { label: 'Total Users', value: totalUsers, icon: '👥', color: 'bg-blue-500' },
    { label: 'Total Pegawai', value: totalPegawai, icon: '👨‍💼', color: 'bg-green-500' },
    { label: 'Absensi Hari Ini', value: absensiToday, icon: '📝', color: 'bg-yellow-500' },
    { label: 'Total Roles', value: totalRoles, icon: '🔐', color: 'bg-purple-500' },
  ]), [totalUsers, totalPegawai, absensiToday, totalRoles]);

  return (
    <div>
      <div className="mb-6 lg:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Selamat datang, <span className="font-medium">{user?.username}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            window.location.href = '/login';
          }}
          className="btn-secondary w-full sm:w-auto"
        >
          Logout
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs sm:text-sm">{stat.label}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center`}>
                <span className="text-2xl sm:text-3xl">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow-lg p-6 sm:p-8 text-white">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Selamat Datang di Admin Dashboard</h2>
        <p className="text-sm sm:text-base text-primary-100">
          Sistem Absensi RSUD Sulfat - Kelola data pegawai, absensi, dan pengaturan sistem dengan mudah.
        </p>
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <p className="text-xs text-primary-100">Role</p>
            <p className="font-medium">{user?.roles?.[0] || 'User'}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <p className="text-xs text-primary-100">Status</p>
            <p className="font-medium">Active</p>
          </div>
        </div>
      </div>

      {/* Absensi Breakdown by Status */}
      <div className="mt-6 lg:mt-8">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Absensi Hari Ini - Status Breakdown</h2>
        {loadingAbsensi ? (
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center">
            <div className="text-sm sm:text-base text-gray-500">Loading absensi data...</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = statusBreakdown[status] || 0;
              return (
                <div key={status} className={`${config.bgLight} rounded-lg shadow-md p-3 sm:p-5 border-2 border-${config.color.replace('bg-', 'border-')}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl sm:text-3xl">{config.emoji}</span>
                    <div className={`${config.color} w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center`}>
                      <span className="text-white font-bold text-sm sm:text-lg">{count}</span>
                    </div>
                  </div>
                  <p className={`font-semibold ${config.textColor} text-sm`}>{config.label}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {count === 0 ? 'Tidak ada' : `${count} pegawai`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 lg:mt-8">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <a
            href="/pegawai"
            className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">👨‍💼</div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900">Kelola Pegawai</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Tambah, edit, atau hapus data pegawai</p>
          </a>
          <a
            href="/absensi"
            className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">📝</div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900">Lihat Absensi</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Monitor kehadiran pegawai</p>
          </a>
          <a
            href="/sessions-monitor"
            className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">📡</div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900">Monitor Sesi</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Pantau sesi login pengguna</p>
          </a>
          <a
            href="/users"
            className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">👥</div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-900">Kelola Users</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Atur akses pengguna sistem</p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
