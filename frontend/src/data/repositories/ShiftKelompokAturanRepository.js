import apiClient from '../api/client';

/**
 * ShiftKelompokAturan repository.
 * Provides shift kelompok aturan CRUD API operations.
 */
const getAll = async (skip = 0, limit = 100) => {
  const params = new URLSearchParams({ skip, limit });
  const response = await apiClient.get(`/shift-kelompok-aturan/?${params}`);
  return response.data;
};

const getById = async (id) => {
  const response = await apiClient.get(`/shift-kelompok-aturan/${id}`);
  return response.data;
};

const create = async (payload) => {
  const response = await apiClient.post('/shift-kelompok-aturan/', payload);
  return response.data;
};

const update = async (id, payload) => {
  const response = await apiClient.put(`/shift-kelompok-aturan/${id}`, payload);
  return response.data;
};

const remove = async (id) => {
  const response = await apiClient.delete(`/shift-kelompok-aturan/${id}`);
  return response.data;
};

const ShiftKelompokAturanRepository = {
  getAll,
  getById,
  create,
  update,
  delete: remove,
};

export default ShiftKelompokAturanRepository;
