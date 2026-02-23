import apiClient from '../api/client';

const BASE = '/roster-shift';

const RosterShiftRepository = {
  getAll: async (skip = 0, limit = 20, filters = {}) => {
    const params = { skip, limit };
    if (filters.id_pegawai)       params.id_pegawai       = filters.id_pegawai;
    if (filters.tanggal_mulai)    params.tanggal_mulai    = filters.tanggal_mulai;
    if (filters.tanggal_selesai)  params.tanggal_selesai  = filters.tanggal_selesai;
    if (filters.jenis_shift)      params.jenis_shift      = filters.jenis_shift;
    if (filters.status_roster)    params.status_roster    = filters.status_roster;
    if (filters.shift_kelompok_id) params.shift_kelompok_id = filters.shift_kelompok_id;
    if (filters.id_unit)          params.id_unit          = filters.id_unit;
    const response = await apiClient.get(`${BASE}/`, { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`${BASE}/${id}`);
    return response.data;
  },

  create: async (payload) => {
    const response = await apiClient.post(`${BASE}/`, payload);
    return response.data;
  },

  update: async (id, payload) => {
    const response = await apiClient.put(`${BASE}/${id}`, payload);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`${BASE}/${id}`);
    return response.data;
  },

  batchCreate: async (payloads) => {
    const response = await apiClient.post(`${BASE}/batch`, payloads);
    return response.data;
  },
};

export default RosterShiftRepository;
