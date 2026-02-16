import apiClient from '../api/client';

/**
 * Pegawai repository.
 * Provides employee management API operations.
 */
/** List employees with pagination and optional search. */
const getAll = async (page = 1, limit = 10, search = '') => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.append('search', search);

  const response = await apiClient.get(`/pegawai/?${params}`);
  return response.data;
};

/** Get employee by ID. */
const getById = async (id) => {
  const response = await apiClient.get(`/pegawai/${id}`);
  return response.data;
};

/** Create new employee with multipart payload. */
const create = async (formData) => {
  const response = await apiClient.post('/pegawai/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/** Update employee by ID with multipart payload. */
const update = async (id, formData) => {
  const response = await apiClient.put(`/pegawai/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/** Delete employee by ID. */
const remove = async (id) => {
  const response = await apiClient.delete(`/pegawai/${id}`);
  return response.data;
};

/** Build absolute photo URL from filename. */
const getPhotoUrl = (filename) => {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  return `${apiClient.defaults.baseURL}/static/uploads/${filename}`;
};

const PegawaiRepository = {
  getAll,
  getById,
  create,
  update,
  delete: remove,
  getPhotoUrl,
};

export default PegawaiRepository;
