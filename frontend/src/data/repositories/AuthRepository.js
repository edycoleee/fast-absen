import apiClient from '../api/client';

/**
 * Authentication Repository
 * Handles all authentication-related API calls
 */
class AuthRepository {
  /**
   * Login user
   */
  async login(username, password) {
    const response = await apiClient.post('/auth/login', { 
      username, 
      password 
    });
    return response.data;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    const response = await apiClient.post('/auth/refresh', { 
      refresh_token: refreshToken 
    });
    return response.data;
  }

  /**
   * Verify token
   */
  async verifyToken(token) {
    const response = await apiClient.post('/auth/verify', { 
      token 
    });
    return response.data;
  }

  /**
   * Get current user info
   */
  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  }
}

export default new AuthRepository();
