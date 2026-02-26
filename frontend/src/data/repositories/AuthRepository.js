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

/** Check if username exists, is active, and has pegawai linked — lightweight pre-check before face popup. */
const checkUsername = async (username) => {
  const response = await apiClient.get(`/auth/check-username/${encodeURIComponent(username)}`);
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
  checkUsername,

  /** Login menggunakan verifikasi wajah (username + foto base64). */
  loginFace: async (username, imageBase64, threshold = 0.6) => {
    const response = await apiClient.post('/auth/login-face', {
      username,
      image: imageBase64,
      threshold,
    });
    return response.data;
  },
};

export default AuthRepository;
