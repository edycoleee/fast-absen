import { useState, useCallback } from 'react';
import UnitRepository from '../../data/repositories/UnitRepository';

export const useUnits = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    skip: 0,
  });

  const fetchUnits = useCallback(async (page = 1, limit = 10, search = '') => {
    try {
      setLoading(true);
      setError(null);

      const skip = (page - 1) * limit;
      const response = await UnitRepository.getAll(skip, limit, search);

      if (response.success) {
        const items = response?.data?.items || [];
        const total = response?.data?.total ?? items.length;
        setUnits(items);
        setPagination({
          page,
          limit: response?.data?.limit ?? limit,
          total,
          skip: response?.data?.skip ?? skip,
        });
      } else {
        throw new Error(response.message || 'Failed to fetch units');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch units';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createUnit = useCallback(async (unitData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await UnitRepository.create(unitData);
      if (response.success) return response.data;
      throw new Error(response.message || 'Failed to create unit');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create unit';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUnit = useCallback(async (id, unitData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await UnitRepository.update(id, unitData);
      if (response.success) return response.data;
      throw new Error(response.message || 'Failed to update unit');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update unit';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUnit = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      const response = await UnitRepository.delete(id);
      if (response.success) return true;
      throw new Error(response.message || 'Failed to delete unit');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete unit';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    units,
    loading,
    error,
    pagination,
    fetchUnits,
    createUnit,
    updateUnit,
    deleteUnit,
  };
};
