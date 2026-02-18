import { useEffect, useState } from 'react';
import { useAuth } from '../../../domain/hooks';
import SessionsRepository from '../../../data/repositories/SessionsRepository';

// Session active threshold (in minutes) - should match backend SESSION_ACTIVE_MINUTES
const SESSION_ACTIVE_THRESHOLD_MINUTES = 30;

// Device type icons
const DEVICE_ICONS = {
  mobile: '📱',
  desktop: '🖥️',
  tablet: '📱',
  other: '❓'
};

// Session status config
const SESSION_STATUS = {
  ACTIVE: {
    label: 'Active',
    emoji: '🟢',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  },
  IDLE: {
    label: 'Idle',
    emoji: '🟡',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200'
  },
  LOGGED_OUT: {
    label: 'Logged Out',
    emoji: '⚪',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200'
  }
};

const SessionsMonitor = () => {
  const { user, logout } = useAuth();
  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionWarning, setPermissionWarning] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history' | 'stats'
  
  // Filters for history
  const [filters, setFilters] = useState({
    id_pegawai: '',
    device_type: '',
    login_status: '',
    limit: 50,
    offset: 0
  });

  // Check if user has admin role
  useEffect(() => {
    const userRoles = user?.roles || [];
    const hasAdminRole = userRoles.some(role => 
      ['admin', 'super-admin', 'super_admin', 'superadmin'].includes(role.toLowerCase())
    );
    
    if (!hasAdminRole) {
      setPermissionWarning(true);
      setError('⚠️ Anda mungkin tidak memiliki izin yang diperlukan. Fitur ini memerlukan role admin atau super-admin.');
    }
  }, [user]);

  // Load active sessions
  const loadActiveSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await SessionsRepository.getActiveSessions();
      console.log('Active sessions response:', response);
      const sessionsData = response?.data?.items || response?.data?.data || [];
      console.log('Active sessions data:', sessionsData);
      setActiveSessions(sessionsData);
    } catch (err) {
      console.error('Failed to load active sessions:', err);
      const statusCode = err.response?.status;
      let errorMessage = err.response?.data?.detail || 'Gagal memuat sesi aktif';
      
      // Check if it's a permission error
      if (statusCode === 403) {
        errorMessage = '⚠️ Anda tidak memiliki izin untuk mengakses fitur ini. Silakan login dengan akun admin atau super-admin.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load session history
  const loadSessionHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const response = await SessionsRepository.getSessionHistory(cleanFilters);
      console.log('Session history response:', response);
      const historyData = response?.data?.items || response?.data?.data || [];
      console.log('Session history data:', historyData);
      setSessionHistory(historyData);
    } catch (err) {
      console.error('Failed to load session history:', err);
      const statusCode = err.response?.status;
      let errorMessage = err.response?.data?.detail || 'Gagal memuat riwayat sesi';
      
      // Check if it's a permission error
      if (statusCode === 403) {
        errorMessage = '⚠️ Anda tidak memiliki izin untuk mengakses fitur ini. Silakan login dengan akun admin atau super-admin.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await SessionsRepository.getStatistics();
      console.log('Sessions statistics response:', response);
      const statsData = response?.data?.data || response?.data || null;
      console.log('Sessions statistics data:', statsData);
      setStatistics(statsData);
    } catch (err) {
      console.error('Failed to load sessions statistics:', err);
      const statusCode = err.response?.status;
      let errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || 'Gagal memuat statistik';
      
      // Check if it's a permission error
      if (statusCode === 403) {
        errorMessage = '⚠️ Anda tidak memiliki izin untuk mengakses fitur ini. Silakan login dengan akun admin atau super-admin.';
      }
      
      setError(errorMessage);
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  };

  // Force logout a session
  const handleForceLogout = async (sessionId, pegawaiNama) => {
    if (!confirm(`Yakin ingin logout paksa sesi dari ${pegawaiNama}?`)) {
      return;
    }

    try {
      await SessionsRepository.forceLogout(sessionId);
      alert('Sesi berhasil di-logout');
      loadActiveSessions(); // Refresh
      loadStatistics(); // Update stats
    } catch (err) {
      console.error('Failed to force logout:', err);
      alert(err.response?.data?.detail || 'Gagal logout paksa');
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate session duration
  const calculateDuration = (loginAt, logoutAt) => {
    if (!loginAt) return '-';
    const start = new Date(loginAt);
    const end = logoutAt ? new Date(logoutAt) : new Date();
    const diff = Math.floor((end - start) / 60000); // minutes
    
    if (diff < 60) return `${diff} menit`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}j ${mins}m`;
  };

  // Calculate session status based on last_activity
  const getSessionStatus = (session) => {
    // If logged out, return LOGGED_OUT
    if (session.logout_at) {
      return SESSION_STATUS.LOGGED_OUT;
    }

    // Check last activity timestamp
    if (!session.last_activity) {
      return SESSION_STATUS.IDLE;
    }

    const lastActivity = new Date(session.last_activity);
    const now = new Date();
    const minutesInactive = Math.floor((now - lastActivity) / 60000);

    // If inactive for less than threshold, it's ACTIVE
    if (minutesInactive <= SESSION_ACTIVE_THRESHOLD_MINUTES) {
      return SESSION_STATUS.ACTIVE;
    }

    // Otherwise it's IDLE (hasn't logged out but inactive)
    return SESSION_STATUS.IDLE;
  };

  // Calculate minutes since last activity
  const getMinutesSinceActivity = (lastActivity) => {
    if (!lastActivity) return null;
    const lastActivityDate = new Date(lastActivity);
    const now = new Date();
    return Math.floor((now - lastActivityDate) / 60000);
  };

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'active') {
      loadActiveSessions();
    } else if (activeTab === 'history') {
      loadSessionHistory();
    } else if (activeTab === 'stats') {
      loadStatistics();
    }
  }, [activeTab]);

  // Reload history when filters change
  useEffect(() => {
    if (activeTab === 'history') {
      loadSessionHistory();
    }
  }, [filters]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Monitor Sesi Pengguna</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Kelola dan monitor sesi login pengguna
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 sm:px-6 py-3 font-medium transition-colors text-sm sm:text-base whitespace-nowrap ${
              activeTab === 'active'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📡 Sesi Aktif ({activeSessions.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 sm:px-6 py-3 font-medium transition-colors text-sm sm:text-base whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📜 Riwayat Sesi
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 sm:px-6 py-3 font-medium transition-colors text-sm sm:text-base whitespace-nowrap ${
              activeTab === 'stats'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📊 Statistik
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className={`${permissionWarning ? 'bg-yellow-50 border-yellow-300 text-yellow-800' : 'bg-red-50 border-red-200 text-red-700'} border px-6 py-4 rounded-lg mb-6 flex items-start justify-between`}>
          <div className="flex-1">
            <p className="font-medium">{error}</p>
            {permissionWarning && (
              <div className="mt-2 text-sm">
                <p>Solusi:</p>
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  <li>Pastikan Anda login dengan akun yang memiliki role <strong>admin</strong> atau <strong>super-admin</strong></li>
                  <li>Role Anda saat ini: <strong>{user?.roles?.join(', ') || 'unknown'}</strong></li>
                  <li>Hubungi administrator sistem untuk menambahkan permission ke akun Anda</li>
                </ul>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setError(null);
              setPermissionWarning(false);
            }}
            className="ml-4 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Active Sessions Tab */}
      {activeTab === 'active' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                Sesi Aktif Saat Ini
              </h2>
              <button
                onClick={loadActiveSessions}
                disabled={loading}
                className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                {loading ? '⏳ Refresh...' : '🔄 Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="p-6 sm:p-8 text-center text-gray-500 text-sm sm:text-base">
                Memuat data...
              </div>
            ) : activeSessions.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500 text-sm sm:text-base">
                Tidak ada sesi aktif
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pengguna
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Perangkat
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Browser
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aktivitas Terakhir
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durasi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeSessions.map((session) => {
                      const status = getSessionStatus(session);
                      const minutesInactive = getMinutesSinceActivity(session.last_activity);
                      
                      return (
                        <tr key={session.session_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {session.pegawai_nama || session.id_pegawai}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.bgColor} ${status.textColor} ${status.borderColor}`}>
                              <span className="mr-1">{status.emoji}</span>
                              {status.label}
                              {minutesInactive !== null && status.label !== 'Logged Out' && (
                                <span className="ml-1 text-xs opacity-75">
                                  ({minutesInactive}m)
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <span className="mr-2">
                                {DEVICE_ICONS[session.device_type] || '❓'}
                              </span>
                              <span className="capitalize">{session.device_type}</span>
                            </div>
                          </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.browser || '-'}
                          {session.os && (
                            <div className="text-xs text-gray-500">{session.os}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.ip_address || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTimestamp(session.login_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTimestamp(session.last_activity_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {calculateDuration(session.login_at, session.logout_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleForceLogout(session.session_id, session.pegawai_nama)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            🚪 Logout
                          </button>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
      )}

      {/* Session History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Filter</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipe Perangkat
                  </label>
                  <select
                    value={filters.device_type}
                    onChange={(e) => setFilters({ ...filters, device_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Semua</option>
                    <option value="mobile">Mobile</option>
                    <option value="desktop">Desktop</option>
                    <option value="tablet">Tablet</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status Login
                  </label>
                  <select
                    value={filters.login_status}
                    onChange={(e) => setFilters({ ...filters, login_status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Semua</option>
                    <option value="success">Berhasil</option>
                    <option value="failed">Gagal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Limit
                  </label>
                  <select
                    value={filters.limit}
                    onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => setFilters({
                      id_pegawai: '',
                      device_type: '',
                      login_status: '',
                      limit: 50,
                      offset: 0
                    })}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">
                  Riwayat Sesi ({sessionHistory.length})
                </h2>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  Memuat data...
                </div>
              ) : sessionHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Tidak ada riwayat sesi
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pengguna
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Perangkat
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IP Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Login
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Logout
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durasi
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sessionHistory.map((session) => {
                        const status = getSessionStatus(session);
                        const minutesInactive = getMinutesSinceActivity(session.last_activity);
                        
                        return (
                          <tr key={session.session_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {session.pegawai_nama || session.id_pegawai}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.bgColor} ${status.textColor} ${status.borderColor}`}>
                                <span className="mr-1">{status.emoji}</span>
                                {status.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-gray-900">
                                <span className="mr-2">
                                  {DEVICE_ICONS[session.device_type] || '❓'}
                                </span>
                                <span className="capitalize">{session.device_type}</span>
                              </div>
                            </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {session.ip_address || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimestamp(session.login_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimestamp(session.logout_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {calculateDuration(session.login_at, session.logout_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              session.login_status === 'success'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {session.login_status === 'success' ? '✅ Berhasil' : '❌ Gagal'}
                            </span>
                          </td>
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
            {loading ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
                Memuat statistik...
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg shadow-sm p-8 text-center">
                <div className="text-red-700 font-medium mb-2">Gagal memuat statistik</div>
                <div className="text-red-600 text-sm">{error}</div>
                <button
                  onClick={loadStatistics}
                  className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  🔄 Coba Lagi
                </button>
              </div>
            ) : !statistics ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
                <div className="mb-4">Tidak ada data statistik</div>
                <button
                  onClick={loadStatistics}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  🔄 Muat Ulang
                </button>
              </div>
            ) : (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Sesi Aktif</p>
                        <p className="text-3xl font-bold mt-2">{statistics.active_sessions_count || 0}</p>
                      </div>
                      <div className="text-5xl opacity-50">📡</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">Login Hari Ini</p>
                        <p className="text-3xl font-bold mt-2">{statistics.today_sessions_count || 0}</p>
                      </div>
                      <div className="text-5xl opacity-50">📅</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">Total Sesi</p>
                        <p className="text-3xl font-bold mt-2">
                          {Object.values(statistics.sessions_by_device || {}).reduce((a, b) => a + b, 0)}
                        </p>
                      </div>
                      <div className="text-5xl opacity-50">📊</div>
                    </div>
                  </div>
                </div>

                {/* Device Breakdown */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Breakdown per Perangkat
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(statistics.sessions_by_device || {}).map(([device, count]) => (
                      <div key={device} className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="text-3xl mb-2">{DEVICE_ICONS[device] || '❓'}</div>
                        <div className="text-2xl font-bold text-gray-900">{count}</div>
                        <div className="text-sm text-gray-500 capitalize">{device}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Breakdown */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Breakdown per Status
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(statistics.sessions_by_status || {}).map(([status, count]) => (
                      <div key={status} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-gray-500 capitalize">{status}</div>
                            <div className="text-2xl font-bold text-gray-900 mt-1">{count}</div>
                          </div>
                          <div className="text-3xl">
                            {status === 'success' ? '✅' : '❌'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
    </div>
  );
};

export default SessionsMonitor;
