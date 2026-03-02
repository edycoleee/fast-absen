import apiClient from '../api/client';

/**
 * IpWhitelistRepository
 * CRUD untuk whitelist IP absensi (/api/v1/ip-whitelist)
 */
const IpWhitelistRepository = {
  /** Ambil semua IP whitelist */
  getAll: async (skip = 0, limit = 100) => {
    const res = await apiClient.get('/ip-whitelist/', { params: { skip, limit } });
    return res.data;
  },

  /** Tambah IP baru */
  create: async (payload) => {
    const res = await apiClient.post('/ip-whitelist/', payload);
    return res.data;
  },

  /** Update IP */
  update: async (id, payload) => {
    const res = await apiClient.put(`/ip-whitelist/${id}`, payload);
    return res.data;
  },

  /** Hapus IP */
  remove: async (id) => {
    const res = await apiClient.delete(`/ip-whitelist/${id}`);
    return res.data;
  },
};

export default IpWhitelistRepository;
