import apiClient from './api';

export const authService = {
  login: async (username, password) => {
    const response = await apiClient.post('/auth/login', { username, password });
    return response.data;
  },
  
  logout: async () => {
    try {
      // Call backend logout endpoint to clear refresh token cookie
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
  },
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr || userStr === 'undefined' || userStr === 'null') {
      return null;
    }
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      return null;
    }
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  }
};

export const userService = {
  getAll: async (page = 1, limit = 10) => {
    const response = await apiClient.get(`/users/?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  getById: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },
  
  create: async (userData) => {
    const response = await apiClient.post('/users/', userData);
    return response.data;
  },
  
  update: async (id, userData) => {
    const response = await apiClient.put(`/users/${id}`, userData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  }
};

export const pegawaiService = {
  getAll: async (page = 1, limit = 10, search = '') => {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);
    const response = await apiClient.get(`/pegawai/?${params}`);
    return response.data;
  },
  
  getById: async (id) => {
    const response = await apiClient.get(`/pegawai/${id}`);
    return response.data;
  },
  
  create: async (formData) => {
    const response = await apiClient.post('/pegawai/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  
  update: async (id, formData) => {
    const response = await apiClient.put(`/pegawai/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  
  delete: async (id) => {
    const response = await apiClient.delete(`/pegawai/${id}`);
    return response.data;
  }
};

export const absensiService = {
  getAll: async (skip = 0, limit = 100) => {
    const response = await apiClient.get(`/absensi/?skip=${skip}&limit=${limit}`);
    return response.data;
  },
  
  getById: async (id) => {
    const response = await apiClient.get(`/absensi/${id}`);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await apiClient.put(`/absensi/${id}`, data);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await apiClient.delete(`/absensi/${id}`);
    return response.data;
  }
};
