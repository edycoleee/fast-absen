import apiClient from '../api/client';

/**
 * Role repository.
 * Provides role management API operations.
 */
/** List roles with pagination. */
const getAll = async (page = 1, limit = 10) => {
  const params = new URLSearchParams({ page, limit });
  const response = await apiClient.get(`/roles/?${params}`);
  return response.data;
};

/** Get role by ID. */
const getById = async (id) => {
  const response = await apiClient.get(`/roles/${id}`);
  return response.data;
};

/** Create new role. */
const create = async (roleData) => {
  const response = await apiClient.post('/roles/', roleData);
  return response.data;
};

/** Update role by ID. */
const update = async (id, roleData) => {
  const response = await apiClient.put(`/roles/${id}`, roleData);
  return response.data;
};

/** Delete role by ID. */
const remove = async (id) => {
  const response = await apiClient.delete(`/roles/${id}`);
  return response.data;
};

const RoleRepository = {
  getAll,
  getById,
  create,
  update,
  delete: remove,
};

export default RoleRepository;
