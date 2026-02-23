import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../domain/hooks';
import AbsensiRepository from '../../../data/repositories/AbsensiRepository';
import UnitRepository from '../../../data/repositories/UnitRepository';
import PegawaiSearchInput from '../../components/common/PegawaiSearchInput';
import { formatErrorMessage, formatErrorForAlert } from '../../../utils/errorHandler';

// Status configuration
const STATUS_CONFIG = {
  HADIR: { label: 'Hadir', emoji: '✅', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  IZIN: { label: 'Izin', emoji: '📝', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  SAKIT: { label: 'Sakit', emoji: '🤒', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  ALPHA: { label: 'Alpha', emoji: '❌', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  TERLAMBAT: { label: 'Terlambat', emoji: '⏰', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  CUTI: { label: 'Cuti', emoji: '🏖️', color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50' },
};

const AbsensiMonitor = () => {
  const { user } = useAuth();
  const [allAbsensi, setAllAbsensi] = useState([]);
  const [todayAbsensi, setTodayAbsensi] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'today' | 'stats'
  
  // Derived KA-UNIT scope from menu_guard
  const isKaUnit = !!user?.menu_guard?.is_kepala_unit;
  const kaUnitScopeId = user?.menu_guard?.kepala_unit_scope_id;

  // Filters (DOC section 5B: lengkap 6 filter)
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    id_pegawai: '',
    id_unit: '',
    shift: '',
    status: '',
    limit: 20,
    skip: 0
  });

  // Unit list for filter dropdown
  const [units, setUnits] = useState([]);

  // Detail modal
  const [selectedAbsensi, setSelectedAbsensi] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (!showDetailModal) return;
    const handleEsc = (event) => { if (event.key === 'Escape') setShowDetailModal(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showDetailModal]);

  // KA-UNIT scope: auto-fill id_unit dari kepala_unit_scope_id, tidak bisa diubah manual
  useEffect(() => {
    if (isKaUnit && kaUnitScopeId) {
      setFilters((prev) => ({ ...prev, id_unit: String(kaUnitScopeId) }));
    }
  }, [isKaUnit, kaUnitScopeId]);

  // Load unit list for dropdown (semua role — ka-unit butuh nama unit juga)
  useEffect(() => {
    UnitRepository.getAll(0, 500)
      .then((res) => setUnits(res?.data?.items ?? []))
      .catch(() => {});
  }, []);

  // Load all absensi
  const loadAllAbsensi = async () => {
    try {
      setLoading(true);
      setError(null);
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const response = await AbsensiRepository.getAll(1, filters.limit, cleanFilters);
      setAllAbsensi(response?.data?.items || []);
    } catch (err) {
      const errorMessage = formatErrorMessage(err, 'Gagal memuat data absensi', user);
      setError(errorMessage);
      console.error('Failed to load absensi:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load today's absensi
  const loadTodayAbsensi = async () => {
    try {
      setLoading(true);
      setError(null);
      const today = new Date().toISOString().split('T')[0];
      const response = await AbsensiRepository.getAll(1, 1000, {
        start_date: today,
        end_date: today
      });
      setTodayAbsensi(response?.data?.items || []);
    } catch (err) {
      const errorMessage = formatErrorMessage(err, 'Gagal memuat absensi hari ini', user);
      setError(errorMessage);
      console.error('Failed to load today absensi:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await AbsensiRepository.getStatistics();
      const statsData = response?.data?.data || response?.data || null;
      setStatistics(statsData);
    } catch (err) {
      const errorMessage = formatErrorMessage(err, 'Gagal memuat statistik', user);
      setError(errorMessage);
      setStatistics(null);
      console.error('Failed to load statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete absensi
  const handleDelete = async (id, pegawaiNama) => {
    if (!confirm(`Yakin ingin menghapus absensi dari ${pegawaiNama}?`)) {
      return;
    }

    try {
      await AbsensiRepository.delete(id);
      alert('Absensi berhasil dihapus');
      if (activeTab === 'all') loadAllAbsensi();
      if (activeTab === 'today') loadTodayAbsensi();
      loadStatistics(); // Update stats
    } catch (err) {
      const errorMessage = formatErrorMessage(err, 'Gagal menghapus absensi', user);
      alert(formatErrorForAlert(errorMessage));
      console.error('Failed to delete:', err);
    }
  };

  // View detail
  const handleViewDetail = async (id) => {
    try {
      const response = await AbsensiRepository.getById(id);
      setSelectedAbsensi(response?.data);
      setShowDetailModal(true);
    } catch (err) {
      const errorMessage = formatErrorMessage(err, 'Gagal memuat detail', user);
      alert(formatErrorForAlert(errorMessage));
      console.error('Failed to load detail:', err);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      weekday: 'short'
    });
  };

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return '-';
    const time = new Date(timeString);
    return time.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Calculate work duration
  const calculateDuration = (jamMasuk, jamKeluar) => {
    if (!jamMasuk || !jamKeluar) return '-';
    const start = new Date(jamMasuk);
    const end = new Date(jamKeluar);
    const diff = Math.floor((end - start) / 60000); // minutes
    
    if (diff < 60) return `${diff} menit`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}j ${mins}m`;
  };

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'all') {
      loadAllAbsensi();
    } else if (activeTab === 'today') {
      loadTodayAbsensi();
    } else if (activeTab === 'stats') {
      loadStatistics();
    }
  }, [activeTab]);

  // Reload when filters change
  useEffect(() => {
    if (activeTab === 'all') {
      loadAllAbsensi();
    }
  }, [filters]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Monitor Absensi</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola dan monitor data kehadiran pegawai</p>
      </div>

      <div>
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'all'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 Semua Absensi ({allAbsensi.length})
            </button>
            <button
              onClick={() => setActiveTab('today')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'today'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📅 Hari Ini ({todayAbsensi.length})
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

        {/* All Absensi Tab */}
        {activeTab === 'all' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Filter</h3>
                {isKaUnit && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    KA-UNIT — Unit {kaUnitScopeId} (terkunci)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => setFilters({ ...filters, start_date: e.target.value, skip: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Akhir</label>
                  <input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => setFilters({ ...filters, end_date: e.target.value, skip: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  {isKaUnit ? (
                    <input
                      type="text"
                      value={`${kaUnitScopeId}: ${units.find(u => String(u.id_unit) === String(kaUnitScopeId))?.nama_unit ?? '-'}`}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-sm"
                    />
                  ) : (
                    <select
                      value={filters.id_unit}
                      onChange={(e) => setFilters({ ...filters, id_unit: e.target.value, skip: 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Semua unit</option>
                      {units.map((u) => (
                        <option key={u.id_unit} value={String(u.id_unit)}>
                          {u.id_unit}: {u.nama_unit}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
                  <select
                    value={filters.shift}
                    onChange={(e) => setFilters({ ...filters, shift: e.target.value, skip: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Semua</option>
                    <option value="PAGI">Pagi</option>
                    <option value="SORE">Sore</option>
                    <option value="MALAM">Malam</option>
                    <option value="ON_CALL">On Call</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value, skip: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Semua</option>
                    <option value="HADIR">Hadir</option>
                    <option value="IZIN">Izin</option>
                    <option value="SAKIT">Sakit</option>
                    <option value="ALPHA">Alpha</option>
                    <option value="TERLAMBAT">Terlambat</option>
                    <option value="CUTI">Cuti</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => setFilters({
                      start_date: '',
                      end_date: '',
                      id_pegawai: '',
                      id_unit: isKaUnit && kaUnitScopeId ? String(kaUnitScopeId) : '',
                      shift: '',
                      status: '',
                      limit: 20,
                      skip: 0,
                    })}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>
            </div>

            {/* Absensi Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">
                  Data Absensi ({allAbsensi.length})
                </h2>
                <button
                  onClick={loadAllAbsensi}
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
              ) : allAbsensi.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Tidak ada data absensi
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pegawai
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tanggal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Jam Masuk
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Jam Keluar
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durasi
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IP Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allAbsensi.map((item) => {
                        const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.HADIR;
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {item.pegawai_nama || item.id_pegawai}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.id_pegawai}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(item.tanggal)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-700">
                              {formatTime(item.jam_masuk)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-700">
                              {formatTime(item.jam_keluar)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {calculateDuration(item.jam_masuk, item.jam_keluar)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${config.bgLight} ${config.textColor}`}>
                                <span className="mr-1">{config.emoji}</span>
                                {config.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                              {item.ip_address || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => handleViewDetail(item.id)}
                                className="text-blue-600 hover:text-blue-800 font-medium mr-3"
                              >
                                👁️ Detail
                              </button>
                              <button
                                onClick={() => handleDelete(item.id, item.pegawai_nama)}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                🗑️ Hapus
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
          </div>
        )}

        {/* Today Tab */}
        {activeTab === 'today' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">
                Absensi Hari Ini ({todayAbsensi.length})
              </h2>
              <button
                onClick={loadTodayAbsensi}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {loading ? '⏳ Refresh...' : '🔄 Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Memuat data hari ini...
              </div>
            ) : todayAbsensi.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Belum ada absensi hari ini
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pegawai
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jam Masuk
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jam Keluar
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durasi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {todayAbsensi.map((item) => {
                      const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.HADIR;
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {item.pegawai_nama || item.id_pegawai}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-700">
                            {formatTime(item.jam_masuk)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-700">
                            {formatTime(item.jam_keluar)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {calculateDuration(item.jam_masuk, item.jam_keluar)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${config.bgLight} ${config.textColor}`}>
                              <span className="mr-1">{config.emoji}</span>
                              {config.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleViewDetail(item.id)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              👁️ Detail
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Total Absensi</p>
                        <p className="text-3xl font-bold mt-2">{statistics.total_count || 0}</p>
                      </div>
                      <div className="text-5xl opacity-50">📋</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">Hari Ini</p>
                        <p className="text-3xl font-bold mt-2">{statistics.today_count || 0}</p>
                      </div>
                      <div className="text-5xl opacity-50">📅</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm font-medium">Belum Check-out</p>
                        <p className="text-3xl font-bold mt-2">{statistics.pending_checkout || 0}</p>
                      </div>
                      <div className="text-5xl opacity-50">⏳</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">7 Hari Terakhir</p>
                        <p className="text-3xl font-bold mt-2">
                          {statistics.last_7_days?.reduce((sum, day) => sum + day.count, 0) || 0}
                        </p>
                      </div>
                      <div className="text-5xl opacity-50">📊</div>
                    </div>
                  </div>
                </div>

                {/* Status Breakdown */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Breakdown per Status
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                      const count = statistics.by_status?.[status] || 0;
                      return (
                        <div key={status} className={`${config.bgLight} rounded-lg p-4 text-center border-2 ${config.color.replace('bg-', 'border-')}`}>
                          <div className="text-3xl mb-2">{config.emoji}</div>
                          <div className="text-2xl font-bold text-gray-900">{count}</div>
                          <div className="text-sm text-gray-600 mt-1">{config.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 7 Days Trend */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Tren 7 Hari Terakhir
                  </h3>
                  <div className="grid grid-cols-7 gap-2">
                    {statistics.last_7_days?.map((day, idx) => (
                      <div key={idx} className="text-center">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="text-2xl font-bold text-blue-600">{day.count}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(day.date).toLocaleDateString('id-ID', { weekday: 'short' })}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(day.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
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

      {/* Detail Modal */}
      {showDetailModal && selectedAbsensi && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-6">
          <div className="mx-auto bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[calc(100vh-3rem)] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">Detail Absensi</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Pegawai</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedAbsensi.pegawai_nama || selectedAbsensi.id_pegawai}
                  </p>
                  <p className="text-sm text-gray-500">{selectedAbsensi.id_pegawai}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-lg">
                    <span className={`px-3 py-1 inline-flex items-center text-sm font-semibold rounded-full ${
                      STATUS_CONFIG[selectedAbsensi.status]?.bgLight || 'bg-gray-100'
                    } ${STATUS_CONFIG[selectedAbsensi.status]?.textColor || 'text-gray-700'}`}>
                      <span className="mr-1">{STATUS_CONFIG[selectedAbsensi.status]?.emoji || '✅'}</span>
                      {STATUS_CONFIG[selectedAbsensi.status]?.label || selectedAbsensi.status}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Tanggal</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(selectedAbsensi.tanggal)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Jam Masuk</label>
                  <p className="text-lg font-semibold text-green-700">
                    {formatTime(selectedAbsensi.jam_masuk)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Jam Keluar</label>
                  <p className="text-lg font-semibold text-orange-700">
                    {formatTime(selectedAbsensi.jam_keluar)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Durasi Kerja</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {calculateDuration(selectedAbsensi.jam_masuk, selectedAbsensi.jam_keluar)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">IP Address</label>
                  <p className="text-lg font-mono font-semibold text-gray-900">
                    {selectedAbsensi.ip_address || '-'}
                  </p>
                </div>
              </div>

              {selectedAbsensi.keterangan && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Keterangan</label>
                  <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                    {selectedAbsensi.keterangan}
                  </p>
                </div>
              )}

              {selectedAbsensi.dokumen_pendukung && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Dokumen Pendukung</label>
                  <p className="text-sm text-blue-600 mt-1">
                    <a href={selectedAbsensi.dokumen_pendukung} target="_blank" rel="noopener noreferrer">
                      📎 Lihat Dokumen
                    </a>
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AbsensiMonitor;
