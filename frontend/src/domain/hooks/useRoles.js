import { useState, useCallback } from 'react';
import RoleRepository from '../../data/repositories/RoleRepository';
import { Role } from '../../core/entities';

/**
 * useRoles Hook
 * Custom hook for managing roles data and operations
 */
export const useRoles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  /**
   * Fetch roles
   */
  const fetchRoles = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      setError(null);

      const response = await RoleRepository.getAll(page, limit);
      
      if (response.success) {
        const roleData = response.data.roles.map(role => new Role(role));
        setRoles(roleData);
        setPagination({
          page: response.data.page,
          limit: response.data.limit,
          total: response.data.total || roleData.length
        });
      } else {
        throw new Error(response.message || 'Failed to fetch roles');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch roles';
      setError(errorMessage);
      console.error('Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get role by ID
   */
  const getRole = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      const response = await RoleRepository.getById(id);
      
      if (response.success) {
        return new Role(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch role');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch role';
      setError(errorMessage);
      console.error('Error fetching role:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new role
   */
  const createRole = useCallback(async (roleData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await RoleRepository.create(roleData);
      
      if (response.success) {
        return new Role(response.data);
      } else {
        throw new Error(response.message || 'Failed to create role');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create role';
      setError(errorMessage);
      console.error('Error creating role:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update role
   */
  const updateRole = useCallback(async (id, roleData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await RoleRepository.update(id, roleData);
      
      if (response.success) {
        return new Role(response.data);
      } else {
        throw new Error(response.message || 'Failed to update role');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update role';
      setError(errorMessage);
      console.error('Error updating role:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete role
   */
  const deleteRole = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      const response = await RoleRepository.delete(id);
      
      if (response.success) {
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete role');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete role';
      setError(errorMessage);
      console.error('Error deleting role:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    roles,
    loading,
    error,
    pagination,
    fetchRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole,
  };
};
