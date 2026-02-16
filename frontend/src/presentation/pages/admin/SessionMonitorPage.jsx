import { useEffect, useState } from 'react';
import { useAuth } from '../../../domain/hooks';
import SessionsRepository from '../../../data/repositories/SessionsRepository';

// Device type icons
const DEVICE_ICONS = {
  mobile: '📱',
  desktop: '🖥️',
  tablet: '📱',
  other: '❓'
};

const SessionsMonitor = () => {
  const { user, logout } = useAuth();
  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history' | 'stats'
  
  // Filters for history
  const [filters, setFilters] = useState({
    id_pegawai: '',
    device_type: '',
    login_status: '',
    limit: 50,
    offset: 0
  });

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
      setError(err.response?.data?.detail || 'Gagal memuat sesi aktif');
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
      setError(err.response?.data?.detail || 'Gagal memuat riwayat sesi');
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
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Gagal memuat statistik';
      setError(errorMsg);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Monitor Sesi Pengguna</h1>
              <p className="text-indigo-100 mt-1">
                Kelola dan monitor sesi login pengguna
              </p>
            </div>
            <button
              onClick={logout}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'active'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📡 Sesi Aktif ({activeSessions.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'history'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📜 Riwayat Sesi
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 font-medium transition-colors ${
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Active Sessions Tab */}
        {activeTab === 'active' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">
                Sesi Aktif Saat Ini
              </h2>
              <button
                onClick={loadActiveSessions}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {loading ? '⏳ Refresh...' : '🔄 Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Memuat data...
              </div>
            ) : activeSessions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Tidak ada sesi aktif
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
                    {activeSessions.map((session) => (
                      <tr key={session.session_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {session.pegawai_nama || session.id_pegawai}
                          </div>
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
                    ))}
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
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Filter</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      {sessionHistory.map((session) => (
                        <tr key={session.session_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {session.pegawai_nama || session.id_pegawai}
                            </div>
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
                      ))}
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
    </div>
  );
};

export default SessionsMonitor;
