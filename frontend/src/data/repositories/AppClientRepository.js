import apiClient from '../api/client';

/**
 * AppClientRepository
 * CRUD operasi untuk registry aplikasi SSO (app_clients).
 * Hanya superadmin / full-admin yang bisa akses endpoint ini via backend RBAC.
 */

/** Ambil semua app clients yang terdaftar. */
const getAll = async (params = {}) => {
  const response = await apiClient.get('/sso/app-clients', { params });
  return response.data;
};

/** Ambil detail satu app client by ID. */
const getById = async (id) => {
  const response = await apiClient.get(`/sso/app-clients/${id}`);
  return response.data;
};

/** Daftarkan aplikasi baru sebagai SSO consumer. */
const create = async (payload) => {
  const response = await apiClient.post('/sso/app-clients', payload);
  return response.data;
};

/** Update data app client (nama, deskripsi, allowed_scopes, is_active). */
const update = async (id, payload) => {
  const response = await apiClient.put(`/sso/app-clients/${id}`, payload);
  return response.data;
};

/** Nonaktifkan app client (soft disable: is_active = false). */
const disable = async (id) => {
  const response = await apiClient.patch(`/sso/app-clients/${id}/disable`);
  return response.data;
};

/** Aktifkan kembali app client. */
const enable = async (id) => {
  const response = await apiClient.patch(`/sso/app-clients/${id}/enable`);
  return response.data;
};

const AppClientRepository = {
  getAll,
  getById,
  create,
  update,
  disable,
  enable,
};

export default AppClientRepository;
