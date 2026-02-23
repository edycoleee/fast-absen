import apiClient from '../api/client';

/**
 * Unit repository.
 * Provides unit CRUD API operations.
 */
const getAll = async (skip = 0, limit = 10, search = '') => {
  const params = new URLSearchParams({ skip, limit });
  if (search) params.append('search', search);
  const response = await apiClient.get(`/unit/?${params}`);
  return response.data;
};

const getById = async (id) => {
  const response = await apiClient.get(`/unit/${id}`);
  return response.data;
};

const create = async (unitData) => {
  const response = await apiClient.post('/unit/', unitData);
  return response.data;
};

const update = async (id, unitData) => {
  const response = await apiClient.put(`/unit/${id}`, unitData);
  return response.data;
};

const remove = async (id) => {
  const response = await apiClient.delete(`/unit/${id}`);
  return response.data;
};

const UnitRepository = {
  getAll,
  getById,
  create,
  update,
  delete: remove,
};

export default UnitRepository;
