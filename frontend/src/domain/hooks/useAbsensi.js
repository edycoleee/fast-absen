import { useState, useCallback } from 'react';
import AbsensiRepository from '../../data/repositories/AbsensiRepository';
import { Absensi } from '../../core/entities';

/**
 * useAbsensi Hook
 * Custom hook for managing absensi (attendance) data and operations
 */
export const useAbsensi = () => {
  const [absensi, setAbsensi] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  /**
   * Fetch absensi list
   */
  const fetchAbsensi = useCallback(async (page = 1, limit = 10, filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await AbsensiRepository.getAll(page, limit, filters);
      
      if (response.success) {
        const items = response?.data?.items || [];
        const absensiData = items.map((a) => Absensi(a));
        setAbsensi(absensiData);
        setPagination({
          page: response?.data?.page || page,
          limit: response?.data?.limit || limit,
          total: response?.data?.total || absensiData.length
        });
      } else {
        throw new Error(response.message || 'Failed to fetch absensi');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch absensi';
      setError(errorMessage);
      console.error('Error fetching absensi:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get absensi by ID
   */
  const getAbsensi = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      const response = await AbsensiRepository.getById(id);
      
      if (response.success) {
        return Absensi(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch absensi');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch absensi';
      setError(errorMessage);
      console.error('Error fetching absensi:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check-in (create absensi)
   */
  const checkIn = useCallback(async (formData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await AbsensiRepository.checkIn(formData);
      
      if (response.success) {
        return Absensi(response.data);
      } else {
        throw new Error(response.message || 'Failed to check-in');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to check-in';
      setError(errorMessage);
      console.error('Error checking in:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check-out (update absensi)
   * Now uses the new /check-out endpoint (no ID required)
   */
  const checkOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await AbsensiRepository.checkOutToday();
      
      if (response.success) {
        return Absensi(response.data);
      } else {
        throw new Error(response.message || 'Failed to check-out');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to check-out';
      setError(errorMessage);
      console.error('Error checking out:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get today's absensi status
   */
  const getTodayAbsensi = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await AbsensiRepository.getTodayAbsensi();
      
      if (response.success) {
        return response;
      } else {
        throw new Error(response.message || 'Failed to get today absensi');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to get today absensi';
      setError(errorMessage);
      console.error('Error getting today absensi:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete absensi
   */
  const deleteAbsensi = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      const response = await AbsensiRepository.delete(id);
      
      if (response.success) {
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete absensi');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete absensi';
      setError(errorMessage);
      console.error('Error deleting absensi:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get my absensi (current user)
   */
  const getMyAbsensi = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      setError(null);

      const response = await AbsensiRepository.getMyAbsensi(page, limit);
      
      if (response.success) {
        const items = response?.data?.items || [];
        const absensiData = items.map((a) => Absensi(a));
        setAbsensi(absensiData);
        setPagination({
          page: response?.data?.page || page,
          limit: response?.data?.limit || limit,
          total: response?.data?.total || absensiData.length
        });
      } else {
        throw new Error(response.message || 'Failed to fetch my absensi');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch my absensi';
      setError(errorMessage);
      console.error('Error fetching my absensi:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    absensi,
    loading,
    error,
    pagination,
    fetchAbsensi,
    getAbsensi,
    checkIn,
    checkOut,
    deleteAbsensi,
    getMyAbsensi,
    getTodayAbsensi,
  };
};
