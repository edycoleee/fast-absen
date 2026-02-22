import { useState, useCallback } from 'react';
import PegawaiShiftKelompokRepository from '../../data/repositories/PegawaiShiftKelompokRepository';
import { formatErrorMessage } from '../../utils/errorHandler';
import { useAuth } from '../contexts/AuthContext';

export const usePegawaiShiftKelompok = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, skip: 0, limit: 10 });

  const fetchAssignments = useCallback(
    async (page = 1, limit = 10) => {
      try {
        setLoading(true);
        setError(null);
        const skip = (page - 1) * limit;
        const data = await PegawaiShiftKelompokRepository.getAll(skip, limit);
        const items = data?.data?.items ?? data?.items ?? [];
        const total = data?.data?.total ?? data?.total ?? 0;
        const respSkip = data?.data?.skip ?? data?.skip ?? 0;
        const respLimit = data?.data?.limit ?? data?.limit ?? limit;
        setAssignments(items);
        setPagination({ total, skip: respSkip, limit: respLimit });
      } catch (err) {
        setError(formatErrorMessage(err, 'Gagal memuat data assignment shift pegawai', user));
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  const createAssignment = useCallback(async (payload) => {
    return PegawaiShiftKelompokRepository.create(payload);
  }, []);

  const updateAssignment = useCallback(async (id, payload) => {
    return PegawaiShiftKelompokRepository.update(id, payload);
  }, []);

  const deleteAssignment = useCallback(async (id) => {
    return PegawaiShiftKelompokRepository.delete(id);
  }, []);

  return {
    assignments,
    loading,
    error,
    pagination,
    fetchAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
  };
};
