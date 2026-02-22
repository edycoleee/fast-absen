import apiClient from '../api/client';

const BASE = '/penilaian-shift-absensi';

const PenilaianShiftAbsensiRepository = {
  getAll: async (skip = 0, limit = 20) => {
    const response = await apiClient.get(`${BASE}/`, { params: { skip, limit } });
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

  evaluate: async (params) => {
    const response = await apiClient.post(`${BASE}/evaluate`, params);
    return response.data;
  },
};

export default PenilaianShiftAbsensiRepository;
