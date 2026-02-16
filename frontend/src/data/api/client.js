import axios from 'axios';
import { API_CONFIG, STORAGE_KEYS } from '../../core/constants';
import LocalStorage from '../storage/LocalStorage';

/**
 * API Client
 * Axios instance with interceptors for authentication and error handling
 */
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 🔥 Enable cookies (for refresh token)
});

/**
 * Request Interceptor
 * Automatically adds authentication token to requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = LocalStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Auto-refresh access token & handle common response errors
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - Auto-refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh access token using refresh token from cookie
        const { data } = await axios.post(
          `${API_CONFIG.BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true } // Cookie auto-sent
        );

        if (data.success) {
          // Update access token in localStorage
          LocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.data.access_token);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${data.data.access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        console.error('Token refresh failed:', refreshError);
        LocalStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        LocalStorage.removeItem(STORAGE_KEYS.USER);
        
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 Forbidden - Insufficient permissions
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
    }

    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
