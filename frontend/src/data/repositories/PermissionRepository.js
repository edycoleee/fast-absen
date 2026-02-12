import apiClient from '../api/client';

/**
 * Permission Repository
 * Handles all permission-related API calls
 */
class PermissionRepository {
  /**
   * Get all permissions with pagination
   */
  async getAll(page = 1, limit = 100) {
    const params = new URLSearchParams({ page, limit });
    const response = await apiClient.get(`/permissions/?${params}`);
    return response.data;
  }

  /**
   * Get permission by ID
   */
  async getById(id) {
    const response = await apiClient.get(`/permissions/${id}`);
    return response.data;
  }

  /**
   * Create new permission
   */
  async create(permissionData) {
    const response = await apiClient.post('/permissions/', permissionData);
    return response.data;
  }

  /**
   * Update permission
   */
  async update(id, permissionData) {
    const response = await apiClient.put(`/permissions/${id}`, permissionData);
    return response.data;
  }

  /**
   * Delete permission
   */
  async delete(id) {
    const response = await apiClient.delete(`/permissions/${id}`);
    return response.data;
  }
}

export default new PermissionRepository();
