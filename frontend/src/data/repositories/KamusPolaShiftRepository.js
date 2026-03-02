/**
 * Kamus Pola Shift Repository
 * CRUD pola shift berulang (e.g. "P1,S1,M1,L1,L1")
 */
import apiClient from '../api/client';

const BASE = '/kamus-pola-shift';

const KamusPolaShiftRepository = {
  getAll: async ({ skip = 0, limit = 200, only_active = false } = {}) => {
    const res = await apiClient.get(BASE + '/', { params: { skip, limit, only_active } });
    return res.data;
  },

  create: async (payload) => {
    const res = await apiClient.post(BASE + '/', payload);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await apiClient.put(`${BASE}/${id}`, payload);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`${BASE}/${id}`);
    return res.data;
  },
};

export default KamusPolaShiftRepository;
