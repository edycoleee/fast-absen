import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../domain/hooks';
import { useAbsensi } from '../../domain/hooks/useAbsensi';

// Status options for attendance
const STATUS_OPTIONS = [
  { value: 'HADIR', label: 'Hadir', emoji: '✅' },
  { value: 'IZIN', label: 'Izin', emoji: '📝' },
  { value: 'SAKIT', label: 'Sakit', emoji: '🤒' },
  { value: 'ALPHA', label: 'Alpha', emoji: '❌' },
  { value: 'TERLAMBAT', label: 'Terlambat', emoji: '⏰' },
  { value: 'CUTI', label: 'Cuti', emoji: '🏖️' },
];

// Statuses that require keterangan (explanation)
const REQUIRES_KETERANGAN = ['IZIN', 'SAKIT', 'TERLAMBAT', 'CUTI'];

const AbsensiDashboard = () => {
  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString('id-ID', options);
    } catch (error) {
      return dateString;
    }
  };

  // Helper function to format time
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (error) {
      return dateString;
    }
  };

  // Helper function to get day name
  const getDayName = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', { weekday: 'long' });
    } catch (error) {
      return '';
    }
  };
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { absensi, loading, error, getMyAbsensi, checkIn, checkOut: checkOutService, getTodayAbsensi } = useAbsensi();
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInError, setCheckInError] = useState(null);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [checkOutSuccess, setCheckOutSuccess] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  
  // Check-in form state
  const [status, setStatus] = useState('HADIR');
  const [keterangan, setKeterangan] = useState('');
  
  // Today's attendance status
  const [todayStatus, setTodayStatus] = useState(null);
  const [todayLoading, setTodayLoading] = useState(false);

  useEffect(() => {
    // Load user's absensi history and today's status
    getMyAbsensi(1, 10);
    loadTodayStatus();
  }, []);

  const loadTodayStatus = async () => {
    try {
      setTodayLoading(true);
      const response = await getTodayAbsensi();
      setTodayStatus(response.data);
    } catch (err) {
      console.error('Failed to load today status:', err);
      setTodayStatus(null);
    } finally {
      setTodayLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setCheckInLoading(true);
      setCheckInError(null);
      setCheckInSuccess(false);

      // Validate keterangan for required statuses
      if (REQUIRES_KETERANGAN.includes(status) && !keterangan.trim()) {
        setCheckInError(`Keterangan wajib diisi untuk status ${status}`);
        setCheckInLoading(false);
        return;
      }

      // Create absensi data
      // IP address will be captured by backend automatically
      const absensiData = {
        status: status,
      };

      // Add keterangan if provided or required
      if (keterangan.trim()) {
        absensiData.keterangan = keterangan.trim();
      }
      
      await checkIn(absensiData);
      setCheckInSuccess(true);
      
      // Reset form
      setStatus('HADIR');
      setKeterangan('');
      
      // Reload absensi list and today status
      setTimeout(() => {
        getMyAbsensi(1, 10);
        loadTodayStatus();
        setCheckInSuccess(false);
      }, 2000);
    } catch (err) {
      setCheckInError(err.message || 'Gagal melakukan check-in');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setCheckInLoading(true);
      setCheckInError(null);
      setCheckOutSuccess(false);
      
      await checkOutService();
      setCheckOutSuccess(true);
      
      // Reload absensi list and today status
      setTimeout(() => {
        getMyAbsensi(1, 10);
        loadTodayStatus();
        setCheckOutSuccess(false);
      }, 2000);
    } catch (err) {
      setCheckInError(err.message || 'Gagal melakukan check-out');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login-absensi');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/login-absensi');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 w-64 h-full bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl">🏥</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-green-600">RSUD Sulfat</h1>
              <p className="text-sm text-gray-500">User Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveMenu('dashboard')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeMenu === 'dashboard'
                    ? 'bg-green-50 text-green-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">📊</span>
                <span>Dashboard</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveMenu('riwayat')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeMenu === 'riwayat'
                    ? 'bg-green-50 text-green-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">📝</span>
                <span>Riwayat Absensi</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveMenu('profil')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeMenu === 'profil'
                    ? 'bg-green-50 text-green-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">👤</span>
                <span>Profil Saya</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="mb-3">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-700 font-medium">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-500">{user?.roles?.[0] || 'user'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm font-semibold flex items-center justify-center space-x-2"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Dashboard View */}
        {activeMenu === 'dashboard' && (
          <>
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Selamat Datang di Absensi Dashboard
          </h2>
          <p className="text-gray-600 mb-4">Sistem Absensi RSUD Sulfat</p>

          {/* User Info */}
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Username</p>
              <p className="font-semibold text-gray-900">{user?.username || 'N/A'}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Role</p>
              <p className="font-semibold text-gray-900">
                {user?.roles?.[0] || 'user'}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <p className="font-semibold text-green-600">Active</p>
            </div>
          </div>
        </div>

        {/* Today's Status */}
        {todayStatus && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Status Absensi Hari Ini</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`rounded-lg p-4 border ${todayStatus.has_checked_in ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-sm text-gray-600 mb-1">Check-In</p>
                <p className={`font-bold text-lg ${todayStatus.has_checked_in ? 'text-green-600' : 'text-gray-400'}`}>
                  {todayStatus.has_checked_in ? '✅ Sudah' : '⏳ Belum'}
                </p>
              </div>
              <div className={`rounded-lg p-4 border ${todayStatus.can_check_out ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-sm text-gray-600 mb-1">Check-Out</p>
                <p className={`font-bold text-lg ${todayStatus.can_check_out ? 'text-blue-600' : 'text-gray-400'}`}>
                  {todayStatus.absensi?.jam_keluar ? '✅ Sudah' : (todayStatus.can_check_out ? '⏳ Bisa' : '❌ Belum')}
                </p>
              </div>
              {todayStatus.absensi?.jam_masuk && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">🕐 Jam Masuk</p>
                  <p className="font-bold text-lg text-purple-600">
                    {formatTime(todayStatus.absensi.jam_masuk)}
                  </p>
                </div>
              )}
              {todayStatus.absensi?.jam_keluar && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <p className="text-sm text-gray-600 mb-1">🕐 Jam Keluar</p>
                  <p className="font-bold text-lg text-orange-600">
                    {formatTime(todayStatus.absensi.jam_keluar)}
                  </p>
                </div>
              )}
              {todayStatus.absensi?.status && (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <p className="text-sm text-gray-600 mb-1">📝 Status</p>
                  <p className="font-bold text-lg text-yellow-700">
                    {STATUS_OPTIONS.find(s => s.value === todayStatus.absensi.status)?.emoji || ''} {todayStatus.absensi.status}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Absensi Actions</h3>
          
          {/* Check-in Form */}
          {!todayStatus?.has_checked_in && (
            <div className="space-y-4 mb-6">
              {/* Status Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status Kehadiran <span className="text-red-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.emoji} {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditional Keterangan Textarea */}
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

              {/* Check-in Button */}
              <div>
                <button
                  onClick={handleCheckIn}
                  disabled={checkInLoading}
                  className="w-full md:w-auto px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {checkInLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    '✅ Check-In Sekarang'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Check-out Button */}
          {todayStatus?.can_check_out && !todayStatus?.absensi?.jam_keluar && (
            <div className="space-y-4">
              <div>
                <button
                  onClick={handleCheckOut}
                  disabled={checkInLoading}
                  className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {checkInLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    '🚪 Check-Out Sekarang'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Already completed message */}
          {todayStatus?.has_checked_in && todayStatus?.absensi?.jam_keluar && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              ✅ Anda sudah menyelesaikan absensi hari ini (Check-in dan Check-out).
            </div>
          )}

          {/* Success Messages */}
          {checkInSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mt-4">
              ✅ Check-in berhasil! Absensi Anda telah tercatat.
            </div>
          )}

          {checkOutSuccess && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mt-4">
              ✅ Check-out berhasil! Waktu keluar Anda telah tercatat.
            </div>
          )}

          {/* Error Message */}
          {checkInError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4">
              ❌ {checkInError}
            </div>
          )}
        </div>

        {/* Quick Info */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-bold text-gray-900 mb-3">ℹ️ Informasi</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Klik tombol <strong>Check-In</strong> untuk mencatat kehadiran Anda</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Lihat riwayat absensi lengkap di menu <strong>Riwayat Absensi</strong></span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>IP address Anda akan tercatat secara otomatis saat check-in</span>
            </li>
          </ul>
        </div>
          </>
        )}

        {/* Riwayat Absensi View */}
        {activeMenu === 'riwayat' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Riwayat Absensi</h2>
                <p className="text-gray-600 mt-1">Daftar lengkap riwayat absensi Anda</p>
              </div>
              <button
                onClick={() => getMyAbsensi(1, 10)}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-semibold disabled:bg-gray-400"
              >
                🔄 Refresh
              </button>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                ❌ {error}
              </div>
            )}

            {/* Absensi List */}
            {!loading && !error && (
              <div className="space-y-3">
                {absensi && absensi.length > 0 ? (
                  absensi.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="border border-gray-200 rounded-lg p-5 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <p className="font-bold text-lg text-gray-900">
                              Absensi #{item.id}
                            </p>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                              {item.status || 'Hadir'}
                            </span>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-3 mt-3">
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                              <p className="text-xs text-gray-600 mb-1">📅 Tanggal</p>
                              <p className="font-semibold text-gray-900">
                                {formatDate(item.tanggal)}
                              </p>
                              {item.tanggal && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {getDayName(item.tanggal)}
                                </p>
                              )}
                            </div>
                            
                            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                              <p className="text-xs text-gray-600 mb-1">⏰ Jam Masuk</p>
                              <p className="font-semibold text-gray-900">
                                {item.jam_masuk ? formatTime(item.jam_masuk) : formatTime(item.tanggal)}
                              </p>
                            </div>
                            
                            {item.jam_keluar && (
                              <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                                <p className="text-xs text-gray-600 mb-1">🚪 Jam Keluar</p>
                                <p className="font-semibold text-gray-900">
                                  {formatTime(item.jam_keluar)}
                                </p>
                              </div>
                            )}
                            
                            {item.ip_address && (
                              <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                                <p className="text-xs text-gray-600 mb-1">📍 IP Address</p>
                                <p className="font-semibold text-gray-900 text-sm">
                                  {item.ip_address}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-6xl mb-4">📋</div>
                    <p>Belum ada riwayat absensi</p>
                    <p className="text-sm mt-2">Silakan lakukan check-in terlebih dahulu</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Profil View */}
        {activeMenu === 'profil' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Profil Saya</h2>
              
              {/* Profile Header */}
              <div className="flex items-center space-x-6 mb-6 pb-6 border-b border-gray-200">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-700 font-bold text-4xl">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{user?.username}</h3>
                  <p className="text-gray-600">{user?.roles?.[0] || 'user'}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                    ✓ Active
                  </span>
                </div>
              </div>

              {/* Profile Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-gray-900 font-medium">{user?.username || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-gray-900 font-medium">{user?.roles?.[0] || 'user'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">User ID</label>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-gray-900 font-medium">{user?.id || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Status Akun</label>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-green-600 font-medium">✓ Aktif</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Statistics */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Statistik Akun</h3>
              <div className="grid md:grid-cols-3 gap-4">
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
        )}
      </main>
    </div>
  );
};

export default AbsensiDashboard;
