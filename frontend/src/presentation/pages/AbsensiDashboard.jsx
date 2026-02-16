import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../domain/hooks';
import { useAbsensi } from '../../domain/hooks/useAbsensi';

const AbsensiDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { absensi, loading, error, getMyAbsensi, checkIn } = useAbsensi();
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInError, setCheckInError] = useState(null);
  const [checkInSuccess, setCheckInSuccess] = useState(false);

  useEffect(() => {
    // Load user's absensi history
    getMyAbsensi(1, 10);
  }, []);

  const handleCheckIn = async () => {
    try {
      setCheckInLoading(true);
      setCheckInError(null);
      setCheckInSuccess(false);

      // Create absensi data (all fields optional)
      // IP address will be captured by backend automatically
      const absensiData = {};
      
      await checkIn(absensiData);
      setCheckInSuccess(true);
      
      // Reload absensi list
      setTimeout(() => {
        getMyAbsensi(1, 10);
        setCheckInSuccess(false);
      }, 2000);
    } catch (err) {
      setCheckInError(err.message || 'Gagal melakukan check-in');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">🏥</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">RSUD Sulfat</h1>
                <p className="text-sm text-gray-600">Sistem Absensi</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Actions Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Absensi Actions</h3>
          
          {/* Check-in Button */}
          <div className="space-y-4">
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
                  '✅ Create Absensi (Check-In)'
                )}
              </button>
              <p className="text-sm text-gray-500 mt-2">
                POST /api/v1/absensi/create - Create absensi for current user (captures IP address)
              </p>
            </div>

            {/* Success Message */}
            {checkInSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                ✅ Check-in berhasil! Absensi Anda telah tercatat.
              </div>
            )}

            {/* Error Message */}
            {checkInError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                ❌ {checkInError}
              </div>
            )}
          </div>
        </div>

        {/* My Absensi History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Riwayat Absensi Saya</h3>
            <button
              onClick={() => getMyAbsensi(1, 10)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-semibold disabled:bg-gray-400"
            >
              🔄 Refresh
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            GET /api/v1/absensi/me - Get absensi for current user
          </p>

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
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">
                          Absensi #{item.id}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Tanggal: {item.tanggal || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Jam Masuk: {item.jam_masuk || 'N/A'}
                        </p>
                        {item.jam_keluar && (
                          <p className="text-sm text-gray-600">
                            Jam Keluar: {item.jam_keluar}
                          </p>
                        )}
                        {item.ip_address && (
                          <p className="text-xs text-gray-500 mt-1">
                            IP: {item.ip_address}
                          </p>
                        )}
                      </div>
                      <div>
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          {item.status || 'Hadir'}
                        </span>
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

        {/* API Endpoints Info */}
        <div className="bg-blue-50 rounded-lg p-6 mt-6 border border-blue-200">
          <h4 className="font-semibold text-gray-900 mb-3">📡 Available Endpoints</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-start">
              <span className="font-mono bg-green-100 text-green-800 px-2 py-1 rounded mr-3 text-xs">POST</span>
              <div className="flex-1">
                <code className="text-gray-700">/api/v1/absensi/create</code>
                <p className="text-gray-600 mt-1">Create absensi for current user (captures IP address)</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded mr-3 text-xs">GET</span>
              <div className="flex-1">
                <code className="text-gray-700">/api/v1/absensi/me</code>
                <p className="text-gray-600 mt-1">Get absensi for current user</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded mr-3 text-xs">GET</span>
              <div className="flex-1">
                <code className="text-gray-700">/api/v1/absensi/me/{'{'}absensi_id{'}'}</code>
                <p className="text-gray-600 mt-1">Get specific absensi for current user</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="font-mono bg-red-100 text-red-800 px-2 py-1 rounded mr-3 text-xs">POST</span>
              <div className="flex-1">
                <code className="text-gray-700">/api/v1/auth/logout</code>
                <p className="text-gray-600 mt-1">Logout from current session</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbsensiDashboard;
