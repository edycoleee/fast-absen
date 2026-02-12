import apiClient from '../api/client';

/**
 * Absensi Repository
 * Handles all absensi (attendance) related API calls
 */
class AbsensiRepository {
  /**
   * Get all absensi with pagination and filters
   */
  async getAll(page = 1, limit = 10, filters = {}) {
    const params = new URLSearchParams({ page, limit });
    
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.id_pegawai) params.append('id_pegawai', filters.id_pegawai);
    if (filters.status) params.append('status', filters.status);
    
    const response = await apiClient.get(`/absensi/?${params}`);
    return response.data;
  }

  /**
   * Get absensi by ID
   */
  async getById(id) {
    const response = await apiClient.get(`/absensi/${id}`);
    return response.data;
  }

  /**
   * Create new absensi (check-in)
   */
  async create(formData) {
    const response = await apiClient.post('/absensi/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  /**
   * Update absensi (check-out)
   */
  async update(id, formData) {
    const response = await apiClient.put(`/absensi/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  /**
   * Delete absensi
   */
  async delete(id) {
    const response = await apiClient.delete(`/absensi/${id}`);
    return response.data;
  }

  /**
   * Get my absensi (current user)
   */
  async getMyAbsensi(page = 1, limit = 10) {
    const params = new URLSearchParams({ page, limit });
    const response = await apiClient.get(`/absensi/my-absensi/?${params}`);
    return response.data;
  }

  /**
   * Check-in (create absensi with photo)
   */
  async checkIn(formData) {
    return this.create(formData);
  }

  /**
   * Check-out (update absensi with photo)
   */
  async checkOut(id, formData) {
    return this.update(id, formData);
  }
}

export default new AbsensiRepository();
