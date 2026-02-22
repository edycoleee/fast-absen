import apiClient from '../api/client';

/**
 * ShiftKelompok repository.
 * Provides shift kelompok CRUD API operations.
 */
const getAll = async (skip = 0, limit = 100) => {
  const params = new URLSearchParams({ skip, limit });
  const response = await apiClient.get(`/shift-kelompok/?${params}`);
  return response.data;
};

const getById = async (id) => {
  const response = await apiClient.get(`/shift-kelompok/${id}`);
  return response.data;
};

const create = async (payload) => {
  const response = await apiClient.post('/shift-kelompok/', payload);
  return response.data;
};

const update = async (id, payload) => {
  const response = await apiClient.put(`/shift-kelompok/${id}`, payload);
  return response.data;
};

const remove = async (id) => {
  const response = await apiClient.delete(`/shift-kelompok/${id}`);
  return response.data;
};

const ShiftKelompokRepository = {
  getAll,
  getById,
  create,
  update,
  delete: remove,
};

export default ShiftKelompokRepository;
