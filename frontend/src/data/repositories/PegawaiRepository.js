import apiClient from '../api/client';

/**
 * Pegawai Repository
 * Handles all pegawai (employee) related API calls
 */
class PegawaiRepository {
  /**
   * Get all pegawai with pagination and search
   */
  async getAll(page = 1, limit = 10, search = '') {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);
    
    const response = await apiClient.get(`/pegawai/?${params}`);
    return response.data;
  }

  /**
   * Get pegawai by ID
   */
  async getById(id) {
    const response = await apiClient.get(`/pegawai/${id}`);
    return response.data;
  }

  /**
   * Create new pegawai
   */
  async create(formData) {
    const response = await apiClient.post('/pegawai/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  /**
   * Update pegawai
   */
  async update(id, formData) {
    const response = await apiClient.put(`/pegawai/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  /**
   * Delete pegawai
   */
  async delete(id) {
    const response = await apiClient.delete(`/pegawai/${id}`);
    return response.data;
  }

  /**
   * Get pegawai photo
   */
  getPhotoUrl(filename) {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;
    return `${apiClient.defaults.baseURL}/static/uploads/${filename}`;
  }
}

export default new PegawaiRepository();
