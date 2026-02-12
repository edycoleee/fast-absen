import { useAuth } from '../utils/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Total Users', value: '-', icon: '👥', color: 'bg-blue-500' },
    { label: 'Total Pegawai', value: '-', icon: '👨‍💼', color: 'bg-green-500' },
    { label: 'Absensi Hari Ini', value: '-', icon: '📝', color: 'bg-yellow-500' },
    { label: 'Total Roles', value: '-', icon: '🔐', color: 'bg-purple-500' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Selamat datang, <span className="font-medium">{user?.username}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} w-14 h-14 rounded-lg flex items-center justify-center`}>
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-2xl font-bold mb-2">Selamat Datang di Admin Dashboard</h2>
        <p className="text-primary-100">
          Sistem Absensi RSUD Sulfat - Kelola data pegawai, absensi, dan pengaturan sistem dengan mudah.
        </p>
        <div className="mt-6 flex items-center space-x-4">
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

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/pegawai"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-3">👨‍💼</div>
            <h3 className="font-semibold text-gray-900">Kelola Pegawai</h3>
            <p className="text-sm text-gray-500 mt-1">Tambah, edit, atau hapus data pegawai</p>
          </a>
          <a
            href="/absensi"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-3">📝</div>
            <h3 className="font-semibold text-gray-900">Lihat Absensi</h3>
            <p className="text-sm text-gray-500 mt-1">Monitor kehadiran pegawai</p>
          </a>
          <a
            href="/users"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-3">👥</div>
            <h3 className="font-semibold text-gray-900">Kelola Users</h3>
            <p className="text-sm text-gray-500 mt-1">Atur akses pengguna sistem</p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
