import apiClient from '../api/client';

/**
 * Sessions repository.
 * Provides user session monitoring API operations.
 */
/** Get all currently active sessions. */
const getActiveSessions = async () => {
  const response = await apiClient.get('/user-sessions/active');
  return response.data;
};

/** Get session history with optional filters. */
const getSessionHistory = async (filters = {}) => {
  const response = await apiClient.get('/user-sessions/history', {
    params: filters
  });
  return response.data;
};

/** Get aggregated session statistics. */
const getStatistics = async () => {
  const response = await apiClient.get('/user-sessions/statistics');
  return response.data;
};

/** Get session detail by session ID. */
const getSessionById = async (sessionId) => {
  const response = await apiClient.get(`/user-sessions/${sessionId}`);
  return response.data;
};

/** Force logout a session by session ID. */
const forceLogout = async (sessionId) => {
  const response = await apiClient.post(`/user-sessions/${sessionId}/force-logout`);
  return response.data;
};

/** Send heartbeat to update session activity timestamp. */
const heartbeat = async (sessionId) => {
  const response = await apiClient.post('/user-sessions/heartbeat', null, {
    params: { session_id: sessionId }
  });
  return response.data;
};

/** Cleanup expired or idle sessions. */
const cleanupExpired = async (expiryHours = 24) => {
  const response = await apiClient.post('/user-sessions/cleanup-expired', null, {
    params: { expiry_hours: expiryHours }
  });
  return response.data;
};

const SessionsRepository = {
  getActiveSessions,
  getSessionHistory,
  getStatistics,
  getSessionById,
  forceLogout,
  heartbeat,
  cleanupExpired,
};

export default SessionsRepository;
