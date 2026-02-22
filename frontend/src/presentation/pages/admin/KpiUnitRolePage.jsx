import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../domain/hooks';
import StatsRepository from '../../../data/repositories/StatsRepository';
import UnitRepository from '../../../data/repositories/UnitRepository';
import { formatErrorMessage } from '../../../utils/errorHandler';

const KpiUnitRolePage = () => {
  const { user } = useAuth();

  // Baca kontrak dari menu_guard (DOC section 5)
  const kpiMenu = user?.menu_guard?.menus?.kpi_unit_role ?? {};
  const endpoint = kpiMenu.endpoint || '/stats/kpi/unit-role';
  const forceMyUnit = !!kpiMenu.force_my_unit_scope;
  const allowUnitFilter = !forceMyUnit && !!kpiMenu.allow_optional_unit_filter;
  const scopeId = user?.menu_guard?.kepala_unit_scope_id;

  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [units, setUnits] = useState([]);
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load unit list untuk dropdown (hanya jika admin boleh filter)
  useEffect(() => {
    if (!allowUnitFilter) return;
    UnitRepository.getAll(0, 200)
      .then((res) => setUnits(res?.data?.items || []))
      .catch(() => {});
  }, [allowUnitFilter]);

  const fetchKpi = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = { start_date: startDate, end_date: endDate };

      // Ka-unit: jangan kirim id_unit (scope sudah otomatis di backend)
      // Admin dengan filter: kirim jika dipilih
      if (allowUnitFilter && selectedUnit) {
        params.id_unit = Number(selectedUnit);
      }

      const res = await StatsRepository.getKpiUnitRole(params, endpoint);
      setKpiData(res?.data ?? null);
    } catch (err) {
      setError(formatErrorMessage(err, 'Gagal memuat data KPI', user));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedUnit, endpoint, allowUnitFilter, user]);

  useEffect(() => {
    fetchKpi();
  }, [fetchKpi]);

  const summary = kpiData?.summary ?? {};
  const items = kpiData?.items ?? [];
  const watermark = kpiData?.watermark;

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rekap Unit / Role</h1>
          <p className="text-gray-600 mt-1">
            {forceMyUnit
              ? `Scope: Unit ${scopeId ?? '-'} (terkunci)`
              : 'KPI shift lintas unit — pilih rentang tanggal dan filter unit'}
          </p>
        </div>
        {watermark && (
          <div className="flex flex-col items-end gap-0.5 text-xs text-gray-400">
            <span className="bg-gray-100 px-3 py-1 rounded-full">
              📅 Per: {watermark.as_of ?? '-'}
            </span>
            {watermark.data_freshness_minutes != null && (
              <span className={`px-3 py-1 rounded-full ${
                watermark.data_freshness_minutes < 60
                  ? 'bg-green-50 text-green-600'
                  : watermark.data_freshness_minutes < 240
                  ? 'bg-yellow-50 text-yellow-600'
                  : 'bg-red-50 text-red-600'
              }`}>
                ⚡ {watermark.data_freshness_minutes} mnt lalu
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow-md p-5 mb-6">
        <div className={`grid grid-cols-1 gap-4 ${allowUnitFilter ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tanggal Akhir</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
          {allowUnitFilter && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Filter Unit</label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Semua unit</option>
                {units.map((u) => (
                  <option key={u.id_unit} value={u.id_unit}>
                    {u.nama_unit}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-end">
            <button onClick={fetchKpi} disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Memuat...' : '🔄 Terapkan'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* KPI Summary Cards */}
      {summary && Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { key: 'late', label: 'Terlambat', color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { key: 'early_leave', label: 'Pulang Cepat', color: 'text-orange-600', bg: 'bg-orange-50' },
            { key: 'mangkir', label: 'Mangkir', color: 'text-red-600', bg: 'bg-red-50' },
            { key: 'missing_checkout', label: 'Missing CO', color: 'text-rose-600', bg: 'bg-rose-50' },
            { key: 'terjadwal_total', label: 'Terjadwal', color: 'text-blue-600', bg: 'bg-blue-50' },
            { key: 'tidak_terjadwal_total', label: 'Tidak Terjadwal', color: 'text-gray-600', bg: 'bg-gray-50' },
          ].map(({ key, label, color, bg }) => (
            <div key={key} className={`${bg} rounded-lg p-4 shadow-sm`}>
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{summary[key] ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* Detail Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-10 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-500">Memuat data KPI...</p>
        </div>
      ) : items.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Detail per Unit / Role ({items.length} baris)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Unit', 'Role', 'Terjadwal', 'Tdk Terjadwal', 'Terlambat', 'Pulang Cepat', 'Mangkir', 'Missing CO'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.nama_unit ?? row.id_unit ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.role_name ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-blue-700 font-semibold">{row.terjadwal_total ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.tidak_terjadwal_total ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-yellow-700 font-semibold">{row.late ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-orange-700 font-semibold">{row.early_leave ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-red-700 font-semibold">{row.mangkir ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-rose-700 font-semibold">{row.missing_checkout ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !loading && !error ? (
        <div className="bg-white rounded-lg shadow-md p-10 text-center text-gray-500">
          Tidak ada data KPI untuk filter yang dipilih.
        </div>
      ) : null}
    </div>
  );
};

export default KpiUnitRolePage;
