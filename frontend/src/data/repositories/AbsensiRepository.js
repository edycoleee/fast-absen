import apiClient from '../api/client';

/**
 * Absensi repository.
 * Provides attendance API operations.
 */
/** List attendance records with pagination and optional filters. */
const getAll = async (page = 1, limit = 10, filters = {}) => {
  const skip = (page - 1) * limit;
  const params = new URLSearchParams({ skip, limit });

  if (filters.start_date) params.append('start_date', filters.start_date);
  if (filters.end_date) params.append('end_date', filters.end_date);
  if (filters.id_pegawai) params.append('id_pegawai', filters.id_pegawai);
  if (filters.id_unit) params.append('id_unit', String(filters.id_unit));
  if (filters.shift) params.append('shift', filters.shift);
  if (filters.status) params.append('status', filters.status);

  const response = await apiClient.get(`/absensi/?${params}`);
  return response.data;
};

/** Get attendance record by ID. */
const getById = async (id) => {
  const response = await apiClient.get(`/absensi/${id}`);
  return response.data;
};

/** Create attendance check-in record. */
const create = async (absensiData = {}) => {
  const response = await apiClient.post('/absensi/check-in', absensiData);
  return response.data;
};

/** Update attendance record (commonly for check-out). */
const update = async (id, formData) => {
  const response = await apiClient.put(`/absensi/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/** Delete attendance record by ID. */
const remove = async (id) => {
  const response = await apiClient.delete(`/absensi/${id}`);
  return response.data;
};

/** Get current user attendance history with pagination. */
const getMyAbsensi = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const params = new URLSearchParams({ skip, limit });
  const response = await apiClient.get(`/absensi/history?${params}`);
  return response.data;
};

/** Get a specific attendance record for current user. */
const getMyAbsensiById = async (absensiId) => {
  const response = await apiClient.get(`/absensi/${absensiId}`);
  return response.data;
};

/** Alias of create() for check-in flow. */
const checkIn = async (formData) => create(formData);

/** Alias of update() for check-out flow. */
const checkOut = async (id, formData) => update(id, formData);

/** Check out current user's attendance for today. */
const checkOutToday = async () => {
  const response = await apiClient.post('/absensi/check-out');
  return response.data;
};

/** Get current user's attendance status for today. */
const getTodayAbsensi = async () => {
  const response = await apiClient.get('/absensi/today');
  return response.data;
};

/** Get attendance history within day range. */
const getHistory = async (days = 30) => {
  const response = await apiClient.get(`/absensi/history?days=${days}`);
  return response.data;
};

/** Get attendance summary for date range. */
const getSummary = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  const response = await apiClient.get(`/absensi/summary?${params}`);
  return response.data;
};

/** Get admin attendance statistics for date range. */
const getStatistics = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  const response = await apiClient.get(`/absensi/statistics?${params}`);
  return response.data;
};

const AbsensiRepository = {
  getAll,
  getById,
  create,
  update,
  delete: remove,
  getMyAbsensi,
  getMyAbsensiById,
  checkIn,
  checkOut,
  checkOutToday,
  getTodayAbsensi,
  getHistory,
  getSummary,
  getStatistics,
};

export default AbsensiRepository;
