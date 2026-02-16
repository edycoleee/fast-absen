import apiClient from '../api/client';

/**
 * Sessions Repository
 * Handles API calls for user sessions monitoring
 */
class SessionsRepository {
  /**
   * Get all active sessions
   * @returns {Promise<Array>} Active sessions
   */
  async getActiveSessions() {
    const response = await apiClient.get('/user-sessions/active');
    return response.data;
  }

  /**
   * Get session history with filters
   * @param {Object} filters - Query parameters
   * @param {string} filters.id_pegawai - Filter by pegawai ID
   * @param {string} filters.device_type - Filter by device type (mobile/desktop/tablet/other)
   * @param {string} filters.login_status - Filter by login status (success/failed)
   * @param {number} filters.limit - Limit results
   * @param {number} filters.offset - Offset for pagination
   * @returns {Promise<Object>} Session history with pagination
   */
  async getSessionHistory(filters = {}) {
    const response = await apiClient.get('/user-sessions/history', {
      params: filters
    });
    return response.data;
  }

  /**
   * Get session statistics
   * @returns {Promise<Object>} Session statistics
   */
  async getStatistics() {
    const response = await apiClient.get('/user-sessions/statistics');
    return response.data;
  }

  /**
   * Get detailed session by ID
   * @param {string} sessionId - Session UUID
   * @returns {Promise<Object>} Session details
   */
  async getSessionById(sessionId) {
    const response = await apiClient.get(`/user-sessions/${sessionId}`);
    return response.data;
  }

  /**
   * Force logout a session (admin only)
   * @param {string} sessionId - Session UUID
   * @returns {Promise<Object>} Success message
   */
  async forceLogout(sessionId) {
    const response = await apiClient.post(`/user-sessions/${sessionId}/force-logout`);
    return response.data;
  }

  /**
   * Send heartbeat to update session activity
   * @param {string} sessionId - Session UUID
   * @returns {Promise<Object>} Updated session info
   */
  async heartbeat(sessionId) {
    const response = await apiClient.post('/user-sessions/heartbeat', null, {
      params: { session_id: sessionId }
    });
    return response.data;
  }

  /**
   * Cleanup expired sessions (admin only)
   * @param {number} expiryHours - Sessions idle for this many hours will be cleaned up
   * @returns {Promise<Object>} Cleanup summary
   */
  async cleanupExpired(expiryHours = 24) {
    const response = await apiClient.post('/user-sessions/cleanup-expired', null, {
      params: { expiry_hours: expiryHours }
    });
    return response.data;
  }
}

export default new SessionsRepository();
