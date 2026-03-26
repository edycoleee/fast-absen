import apiClient from '../api/client';

/**
 * Permission repository.
 * Provides permission management API operations.
 */
/** List permissions with pagination and optional search. */
const getAll = async (page = 1, limit = 20, search = '') => {
  const skip = (page - 1) * limit;
  const params = { skip, limit };
  if (search) params.search = search;
  const response = await apiClient.get('/permissions/', { params });
  return response.data;
};

/** Get permission by ID. */
const getById = async (id) => {
  const response = await apiClient.get(`/permissions/${id}`);
  return response.data;
};

/** Create new permission. */
const create = async (permissionData) => {
  const response = await apiClient.post('/permissions/', permissionData);
  return response.data;
};

/** Update permission by ID. */
const update = async (id, permissionData) => {
  const response = await apiClient.put(`/permissions/${id}`, permissionData);
  return response.data;
};

/** Delete permission by ID. */
const remove = async (id) => {
  const response = await apiClient.delete(`/permissions/${id}`);
  return response.data;
};

const PermissionRepository = {
  getAll,
  getById,
  create,
  update,
  delete: remove,
};

export default PermissionRepository;
