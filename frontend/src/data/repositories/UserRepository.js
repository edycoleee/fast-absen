import apiClient from '../api/client';

/**
 * User Repository
 * Handles all user-related API calls
 */
class UserRepository {
  /**
   * Get all users with pagination
   */
  async getAll(page = 1, limit = 10, search = '') {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);
    
    const response = await apiClient.get(`/users/?${params}`);
    return response.data;
  }

  /**
   * Get user by ID
   */
  async getById(id) {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  }

  /**
   * Create new user
   */
  async create(userData) {
    const response = await apiClient.post('/users/', userData);
    return response.data;
  }

  /**
   * Update user
   */
  async update(id, userData) {
    const response = await apiClient.put(`/users/${id}`, userData);
    return response.data;
  }

  /**
   * Delete user
   */
  async delete(id) {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  }

  /**
   * Change user password
   */
  async changePassword(id, oldPassword, newPassword) {
    const response = await apiClient.post(`/users/${id}/change-password`, {
      old_password: oldPassword,
      new_password: newPassword
    });
    return response.data;
  }
}

export default new UserRepository();
