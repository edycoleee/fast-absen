import { useState, useCallback } from 'react';
import UserRepository from '../../data/repositories/UserRepository';
import { User } from '../../core/entities';

/**
 * useUsers Hook
 * Custom hook for managing users data and operations
 */
export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  /**
   * Fetch users
   */
  const fetchUsers = useCallback(async (page = 1, limit = 10, search = '') => {
    try {
      setLoading(true);
      setError(null);

      const response = await UserRepository.getAll(page, limit, search);
      
      if (response.success) {
        const items = response?.data?.items || [];
        const userData = items.map(user => new User(user));
        setUsers(userData);
        setPagination({
          page: response?.data?.page,
          limit: response?.data?.limit,
          total: response?.data?.total || userData.length
        });
      } else {
        throw new Error(response.message || 'Failed to fetch users');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch users';
      setError(errorMessage);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get user by ID
   */
  const getUser = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      const response = await UserRepository.getById(id);
      
      if (response.success) {
        return new User(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch user');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch user';
      setError(errorMessage);
      console.error('Error fetching user:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new user
   */
  const createUser = useCallback(async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await UserRepository.create(userData);
      
      if (response.success) {
        return new User(response.data);
      } else {
        throw new Error(response.message || 'Failed to create user');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create user';
      setError(errorMessage);
      console.error('Error creating user:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update user
   */
  const updateUser = useCallback(async (id, userData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await UserRepository.update(id, userData);
      
      if (response.success) {
        return new User(response.data);
      } else {
        throw new Error(response.message || 'Failed to update user');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update user';
      setError(errorMessage);
      console.error('Error updating user:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete user
   */
  const deleteUser = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      const response = await UserRepository.delete(id);
      
      if (response.success) {
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete user');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete user';
      setError(errorMessage);
      console.error('Error deleting user:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    users,
    loading,
    error,
    pagination,
    fetchUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
  };
};
