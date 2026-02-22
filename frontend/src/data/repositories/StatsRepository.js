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

/** Get KPI unit-role summary using latest contract.
 *
 * `endpoint` may come from menu_guard as a full path like `/api/v1/stats/kpi/unit-role`.
 * apiClient.baseURL already includes `/api/v1`, so we strip that prefix to avoid duplication.
 */
const getKpiUnitRole = async ({ start_date, end_date, id_unit } = {}, endpoint = '/stats/kpi/unit-role') => {
  // Normalise: remove leading /api/v1 prefix if backend returned the full path
  const normalisedEndpoint = endpoint.replace(/^\/api\/v\d+/, '');

  const params = new URLSearchParams();
  if (start_date) params.append('start_date', start_date);
  if (end_date) params.append('end_date', end_date);
  if (id_unit !== undefined && id_unit !== null) params.append('id_unit', String(id_unit));

  const query = params.toString();
  const url = query ? `${normalisedEndpoint}?${query}` : normalisedEndpoint;
  const response = await apiClient.get(url);
  return response.data;
};

const StatsRepository = {
  getStats,
  getKpiUnitRole,
};

export default StatsRepository;
