import apiClient from '../api/client';

/**
 * PegawaiShiftKelompok repository.
 * Provides assignment pegawai → shift kelompok CRUD API operations.
 */
const getAll = async (skip = 0, limit = 100) => {
  const params = new URLSearchParams({ skip, limit });
  const response = await apiClient.get(`/pegawai-shift-kelompok/?${params}`);
  return response.data;
};

const getById = async (id) => {
  const response = await apiClient.get(`/pegawai-shift-kelompok/${id}`);
  return response.data;
};

const create = async (payload) => {
  const response = await apiClient.post('/pegawai-shift-kelompok/', payload);
  return response.data;
};

const update = async (id, payload) => {
  const response = await apiClient.put(`/pegawai-shift-kelompok/${id}`, payload);
  return response.data;
};

const remove = async (id) => {
  const response = await apiClient.delete(`/pegawai-shift-kelompok/${id}`);
  return response.data;
};

/** Download Excel template for pegawai shift kelompok import. */
const downloadTemplate = async () => {
  const response = await apiClient.get('/pegawai-shift-kelompok/template/download', {
    responseType: 'blob',
  });
  return response.data;
};

/** Import pegawai shift kelompok from Excel file. */
const importExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/pegawai-shift-kelompok/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

const PegawaiShiftKelompokRepository = {
  getAll,
  getById,
  create,
  update,
  delete: remove,
  downloadTemplate,
  importExcel,
};

export default PegawaiShiftKelompokRepository;
