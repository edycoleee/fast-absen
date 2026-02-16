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
   * Uses refresh token from HTTP-only cookie (auto-sent by browser)
   */
  async refreshToken() {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  }

  /**
   * Logout user
   * Clears refresh token cookie on backend
   */
  async logout() {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  }

  /**
   * Logout user
   * Clears refresh token cookie on backend
   */
  async logout() {
    const response = await apiClient.post('/auth/logout');
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
