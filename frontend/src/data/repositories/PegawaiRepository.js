import apiClient from '../api/client';

/**
 * Pegawai repository.
 * Provides employee management API operations.
 */
/** List employees with pagination and optional search. */
const getAll = async (page = 1, limit = 10, search = '') => {
  const skip = (page - 1) * limit;
  const params = new URLSearchParams({ skip, limit });
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
  // baseURL may be a relative path (e.g. "/api/v1") when served behind a
  // reverse proxy — new URL() requires an absolute URL, so fall back to
  // window.location.origin when the baseURL has no host.
  let origin;
  try {
    const base = apiClient.defaults.baseURL || '';
    origin = base.startsWith('http')
      ? new URL(base).origin
      : window.location.origin;
  } catch {
    origin = window.location.origin;
  }
  return `${origin}/uploads/photos/${filename}`;
};

const PegawaiRepository = {
  getAll,
  getById,
  create,
  update,
  delete: remove,
  getPhotoUrl,

  /** Download Excel template for bulk import. Returns a Blob. */
  downloadTemplate: async () => {
    const response = await apiClient.get('/pegawai/template/download', {
      responseType: 'blob',
    });
    return response.data; // Blob
  },

  /** Bulk import pegawai from an Excel file. Returns import summary. */
  importExcel: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/pegawai/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default PegawaiRepository;
