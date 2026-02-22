import { useState, useCallback } from 'react';
import ShiftKelompokAturanRepository from '../../data/repositories/ShiftKelompokAturanRepository';
import { formatErrorMessage } from '../../utils/errorHandler';
import { useAuth } from '../contexts/AuthContext';

export const useShiftKelompokAturan = () => {
  const { user } = useAuth();
  const [aturan, setAturan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, skip: 0, limit: 10 });

  const fetchAturan = useCallback(
    async (page = 1, limit = 10) => {
      try {
        setLoading(true);
        setError(null);
        const skip = (page - 1) * limit;
        const data = await ShiftKelompokAturanRepository.getAll(skip, limit);
        const items = data?.data?.items ?? data?.items ?? [];
        const total = data?.data?.total ?? data?.total ?? 0;
        const respSkip = data?.data?.skip ?? data?.skip ?? 0;
        const respLimit = data?.data?.limit ?? data?.limit ?? limit;
        setAturan(items);
        setPagination({ total, skip: respSkip, limit: respLimit });
      } catch (err) {
        setError(formatErrorMessage(err, 'Gagal memuat data aturan', user));
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  const createAturan = useCallback(
    async (payload) => {
      const data = await ShiftKelompokAturanRepository.create(payload);
      return data;
    },
    [],
  );

  const updateAturan = useCallback(
    async (id, payload) => {
      const data = await ShiftKelompokAturanRepository.update(id, payload);
      return data;
    },
    [],
  );

  const deleteAturan = useCallback(
    async (id) => {
      const data = await ShiftKelompokAturanRepository.delete(id);
      return data;
    },
    [],
  );

  return {
    aturan,
    loading,
    error,
    pagination,
    fetchAturan,
    createAturan,
    updateAturan,
    deleteAturan,
  };
};
