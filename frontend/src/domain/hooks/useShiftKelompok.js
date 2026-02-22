import { useState, useCallback } from 'react';
import ShiftKelompokRepository from '../../data/repositories/ShiftKelompokRepository';

export const useShiftKelompok = () => {
  const [shiftKelompok, setShiftKelompok] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  const fetchShiftKelompok = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      setError(null);
      const skip = (page - 1) * limit;
      const response = await ShiftKelompokRepository.getAll(skip, limit);
      if (response.success) {
        const items = response?.data?.items || [];
        setShiftKelompok(items);
        const retLimit = response?.data?.limit ?? limit;
        const retSkip = response?.data?.skip ?? skip;
        setPagination({
          page: Math.floor(retSkip / retLimit) + 1,
          limit: retLimit,
          total: response?.data?.total ?? items.length,
        });
      } else {
        throw new Error(response.message || 'Gagal mengambil data shift kelompok');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal mengambil data');
    } finally {
      setLoading(false);
    }
  }, []);

  const createShiftKelompok = useCallback(async (payload) => {
    try {
      setLoading(true);
      const response = await ShiftKelompokRepository.create(payload);
      if (response.success) return response.data;
      throw new Error(response.message || 'Gagal membuat shift kelompok');
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateShiftKelompok = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      const response = await ShiftKelompokRepository.update(id, payload);
      if (response.success) return response.data;
      throw new Error(response.message || 'Gagal update shift kelompok');
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteShiftKelompok = useCallback(async (id) => {
    try {
      setLoading(true);
      const response = await ShiftKelompokRepository.delete(id);
      if (response.success) return true;
      throw new Error(response.message || 'Gagal menghapus shift kelompok');
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    shiftKelompok,
    loading,
    error,
    pagination,
    fetchShiftKelompok,
    createShiftKelompok,
    updateShiftKelompok,
    deleteShiftKelompok,
  };
};
