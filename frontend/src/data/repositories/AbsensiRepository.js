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
    const skip = (page - 1) * limit;
    const params = new URLSearchParams({ skip, limit });
    
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
   * POST /api/v1/absensi/check-in
   */
  async create(absensiData = {}) {
    const response = await apiClient.post('/absensi/check-in', absensiData);
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
   * GET /api/v1/absensi/history
   */
  async getMyAbsensi(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const params = new URLSearchParams({ skip, limit });
    const response = await apiClient.get(`/absensi/history?${params}`);
    return response.data;
  }

  /**
   * Get specific absensi by ID for current user
   * Deprecated - use getById instead
   */
  async getMyAbsensiById(absensiId) {
    const response = await apiClient.get(`/absensi/${absensiId}`);
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

  /**
   * Check-out today's absensi
   * POST /api/v1/absensi/check-out
   */
  async checkOutToday() {
    const response = await apiClient.post('/absensi/check-out');
    return response.data;
  }

  /**
   * Get today's absensi status
   * GET /api/v1/absensi/today
   */
  async getTodayAbsensi() {
    const response = await apiClient.get('/absensi/today');
    return response.data;
  }

  /**
   * Get absensi history
   * GET /api/v1/absensi/history
   */
  async getHistory(days = 30) {
    const response = await apiClient.get(`/absensi/history?days=${days}`);
    return response.data;
  }

  /**
   * Get absensi summary
   * GET /api/v1/absensi/summary
   */
  async getSummary(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const response = await apiClient.get(`/absensi/summary?${params}`);
    return response.data;
  }

  /**
   * Get absensi statistics (Admin only)
   * GET /api/v1/absensi/statistics
   */
  async getStatistics(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const response = await apiClient.get(`/absensi/statistics?${params}`);
    return response.data;
  }
}

export default new AbsensiRepository();
