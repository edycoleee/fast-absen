import { useState, useCallback } from 'react';
import PegawaiRepository from '../../data/repositories/PegawaiRepository';
import { Pegawai } from '../../core/entities';

/**
 * usePegawai Hook
 * Custom hook for managing pegawai (employees) data and operations
 */
export const usePegawai = () => {
  const [pegawai, setPegawai] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  /**
   * Fetch pegawai list
   */
  const fetchPegawai = useCallback(async (page = 1, limit = 10, search = '') => {
    try {
      setLoading(true);
      setError(null);

      const response = await PegawaiRepository.getAll(page, limit, search);
      
      if (response.success) {
        const pegawaiData = response.data.pegawai.map(p => new Pegawai(p));
        setPegawai(pegawaiData);
        setPagination({
          page: response.data.page,
          limit: response.data.limit,
          total: response.data.total || pegawaiData.length
        });
      } else {
        throw new Error(response.message || 'Failed to fetch pegawai');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch pegawai';
      setError(errorMessage);
      console.error('Error fetching pegawai:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get pegawai by ID
   */
  const getPegawai = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      const response = await PegawaiRepository.getById(id);
      
      if (response.success) {
        return new Pegawai(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch pegawai');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch pegawai';
      setError(errorMessage);
      console.error('Error fetching pegawai:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new pegawai
   */
  const createPegawai = useCallback(async (formData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await PegawaiRepository.create(formData);
      
      if (response.success) {
        return new Pegawai(response.data);
      } else {
        throw new Error(response.message || 'Failed to create pegawai');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create pegawai';
      setError(errorMessage);
      console.error('Error creating pegawai:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update pegawai
   */
  const updatePegawai = useCallback(async (id, formData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await PegawaiRepository.update(id, formData);
      
      if (response.success) {
        return new Pegawai(response.data);
      } else {
        throw new Error(response.message || 'Failed to update pegawai');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update pegawai';
      setError(errorMessage);
      console.error('Error updating pegawai:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete pegawai
   */
  const deletePegawai = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      const response = await PegawaiRepository.delete(id);
      
      if (response.success) {
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete pegawai');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete pegawai';
      setError(errorMessage);
      console.error('Error deleting pegawai:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    pegawai,
    loading,
    error,
    pagination,
    fetchPegawai,
    getPegawai,
    createPegawai,
    updatePegawai,
    deletePegawai,
  };
};
