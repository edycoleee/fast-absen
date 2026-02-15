import apiClient from '../api/client';

/**
 * Stats Repository
 * Dashboard summary counts
 */
class StatsRepository {
  async getStats() {
    const response = await apiClient.get('/stats/');
    return response.data;
  }
}

export default new StatsRepository();
