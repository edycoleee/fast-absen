import apiClient from '../api/client';

/**
 * User repository.
 * Provides user management API operations.
 */
/** List users with pagination and optional search. */
const getAll = async (page = 1, limit = 10, search = '') => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.append('search', search);

  const response = await apiClient.get(`/users/?${params}`);
  return response.data;
};

/** Get user by ID. */
const getById = async (id) => {
  const response = await apiClient.get(`/users/${id}`);
  return response.data;
};

/** Create new user. */
const create = async (userData) => {
  const response = await apiClient.post('/users/', userData);
  return response.data;
};

/** Update existing user by ID. */
const update = async (id, userData) => {
  const response = await apiClient.put(`/users/${id}`, userData);
  return response.data;
};

/** Delete user by ID. */
const remove = async (id) => {
  const response = await apiClient.delete(`/users/${id}`);
  return response.data;
};

/** Change user password. */
const changePassword = async (id, oldPassword, newPassword) => {
  const response = await apiClient.post(`/users/${id}/change-password`, {
    old_password: oldPassword,
    new_password: newPassword
  });
  return response.data;
};

const UserRepository = {
  getAll,
  getById,
  create,
  update,
  delete: remove,
  changePassword,
};

export default UserRepository;
