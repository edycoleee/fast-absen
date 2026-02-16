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

const StatsRepository = {
  getStats,
};

export default StatsRepository;
