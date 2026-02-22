import apiClient from '../api/client';

const BASE = '/roster-shift';

const RosterShiftRepository = {
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
};

export default RosterShiftRepository;
