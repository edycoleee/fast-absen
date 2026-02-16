import apiClient from '../api/client';

/**
 * Auth repository.
 * Provides authentication API operations.
 */
/** Authenticate user with username and password. */
const login = async (username, password) => {
  const response = await apiClient.post('/auth/login', {
    username,
    password
  });
  return response.data;
};

/** Refresh access token using refresh cookie. */
const refreshToken = async () => {
  const response = await apiClient.post('/auth/refresh');
  return response.data;
};

/** Logout current user and clear refresh cookie. */
const logout = async () => {
  const response = await apiClient.post('/auth/logout');
  return response.data;
};

/** Get current authenticated user profile. */
const getCurrentUser = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

const AuthRepository = {
  login,
  refreshToken,
  logout,
  getCurrentUser,
};

export default AuthRepository;
