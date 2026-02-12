import apiClient from '../api/client';

/**
 * Role Repository
 * Handles all role-related API calls
 */
class RoleRepository {
  /**
   * Get all roles with pagination
   */
  async getAll(page = 1, limit = 10) {
    const params = new URLSearchParams({ page, limit });
    const response = await apiClient.get(`/roles/?${params}`);
    return response.data;
  }

  /**
   * Get role by ID
   */
  async getById(id) {
    const response = await apiClient.get(`/roles/${id}`);
    return response.data;
  }

  /**
   * Create new role
   */
  async create(roleData) {
    const response = await apiClient.post('/roles/', roleData);
    return response.data;
  }

  /**
   * Update role
   */
  async update(id, roleData) {
    const response = await apiClient.put(`/roles/${id}`, roleData);
    return response.data;
  }

  /**
   * Delete role
   */
  async delete(id) {
    const response = await apiClient.delete(`/roles/${id}`);
    return response.data;
  }
}

export default new RoleRepository();
