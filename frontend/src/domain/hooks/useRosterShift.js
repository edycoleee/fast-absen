import { useState, useCallback } from 'react';
import RosterShiftRepository from '../../data/repositories/RosterShiftRepository';

export const useRosterShift = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, skip: 0, limit: 20 });

  const fetchShifts = useCallback(async (page = 1, limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * limit;
      const data = await RosterShiftRepository.getAll(skip, limit);
      const items = data?.data?.items ?? data?.items ?? [];
      const total = data?.data?.total ?? data?.total ?? 0;
      setShifts(items);
      setPagination({ total, skip, limit });
    } catch (err) {
      setError(err?.response?.data?.message || 'Gagal mengambil data roster shift');
    } finally {
      setLoading(false);
    }
  }, []);

  const createShift = useCallback(async (payload) => {
    const data = await RosterShiftRepository.create(payload);
    return data;
  }, []);

  const updateShift = useCallback(async (id, payload) => {
    const data = await RosterShiftRepository.update(id, payload);
    return data;
  }, []);

  const deleteShift = useCallback(async (id) => {
    const data = await RosterShiftRepository.delete(id);
    return data;
  }, []);

  return {
    shifts,
    loading,
    error,
    pagination,
    fetchShifts,
    createShift,
    updateShift,
    deleteShift,
  };
};
