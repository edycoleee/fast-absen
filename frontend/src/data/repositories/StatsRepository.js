import apiClient from '../api/client';

/**
 * Stats repository.
 * Provides dashboard summary API operations.
 */
/** Get dashboard summary stats. */
const getStats = async () => {
  const response = await apiClient.get('/stats/');
  return response.data;
};

/** Get KPI unit-role summary using latest contract. */
const getKpiUnitRole = async ({ start_date, end_date, id_unit } = {}, endpoint = '/stats/kpi/unit-role') => {
  const params = new URLSearchParams();
  if (start_date) params.append('start_date', start_date);
  if (end_date) params.append('end_date', end_date);
  if (id_unit !== undefined && id_unit !== null) params.append('id_unit', String(id_unit));

  const query = params.toString();
  const url = query ? `${endpoint}?${query}` : endpoint;
  const response = await apiClient.get(url);
  return response.data;
};

const StatsRepository = {
  getStats,
  getKpiUnitRole,
};

export default StatsRepository;
