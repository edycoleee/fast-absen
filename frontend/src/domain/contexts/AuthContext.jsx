import { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../../core/entities';
import { STORAGE_KEYS } from '../../core/constants';
import AuthRepository from '../../data/repositories/AuthRepository';
import LocalStorage from '../../data/storage/LocalStorage';

/**
 * Authentication Context
 * Manages authentication state across the application
 */
const AuthContext = createContext(null);

/**
 * Authentication Provider Component
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Initialize authentication state from localStorage
   */
  useEffect(() => {
    const initAuth = () => {
      try {
        const userData = LocalStorage.getItem(STORAGE_KEYS.USER);
        if (userData) {
          setUser(User(userData));
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Sync React state when apiClient interceptor updates localStorage after token refresh.
   * This ensures menu_guard, roles, permissions in React state stay up-to-date
   * without requiring a full logout/login.
   */
  useEffect(() => {
    const handleUserRefreshed = (event) => {
      try {
        const refreshedData = event.detail || LocalStorage.getItem(STORAGE_KEYS.USER);
        if (refreshedData) {
          setUser(User(refreshedData));
        }
      } catch (err) {
        console.error('Error syncing refreshed user state:', err);
      }
    };

    window.addEventListener('auth:user-refreshed', handleUserRefreshed);
    return () => window.removeEventListener('auth:user-refreshed', handleUserRefreshed);
  }, []);

  /**
   * Login user
   */
  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await AuthRepository.login(username, password);
      
      if (response.success) {
        const {
          access_token,
          user_id,
          username: user_name,
          roles,
          permissions,
          menu_guard,
          session_id,
        } = response.data;
        
        // Store token
        LocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
        
        // Store session_id for heartbeat tracking
        if (session_id) {
          LocalStorage.setItem(STORAGE_KEYS.SESSION_ID, session_id);
        }
        
        // Create user entity
        const userData = User({
          id: user_id,
          username: user_name,
          roles: roles,
          permissions: permissions || [],
          menu_guard: menu_guard || {},
        });
        
        // Store user data
        LocalStorage.setItem(STORAGE_KEYS.USER, userData.toJSON());
        setUser(userData);
        
        return response;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout user
   * Calls backend to clear refresh token cookie
   */
  const logout = async () => {
    try {
      // Call backend logout endpoint to clear refresh token cookie
      await AuthRepository.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage and state
      LocalStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      LocalStorage.removeItem(STORAGE_KEYS.USER);
      LocalStorage.removeItem(STORAGE_KEYS.SESSION_ID);
      setUser(null);
      setError(null);
    }
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = () => {
    return !!user && !!LocalStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  };

  /**
   * Check if user has specific role
   */
  const hasRole = (roleName) => {
    return user?.hasRole(roleName) || false;
  };

  /**
   * Check if user is admin
   */
  const isAdmin = () => {
    return user?.isAdmin() || false;
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
    hasRole,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth Hook
 * Access authentication context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
