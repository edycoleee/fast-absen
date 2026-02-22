import { useState, useCallback } from 'react';
import RosterUploadBatchRepository from '../../data/repositories/RosterUploadBatchRepository';
import { formatErrorMessage } from '../../utils/errorHandler';
import { useAuth } from '../contexts/AuthContext';

export const useRosterUploadBatch = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, skip: 0, limit: 20 });

  const fetchBatches = useCallback(
    async (page = 1, limit = 20) => {
      try {
        setLoading(true);
        setError(null);
        const skip = (page - 1) * limit;
        const data = await RosterUploadBatchRepository.getAll(skip, limit);
        const items = data?.data?.items ?? data?.items ?? [];
        const total = data?.data?.total ?? data?.total ?? 0;
        const respSkip = data?.data?.skip ?? data?.skip ?? 0;
        const respLimit = data?.data?.limit ?? data?.limit ?? limit;
        setBatches(items);
        setPagination({ total, skip: respSkip, limit: respLimit });
      } catch (err) {
        setError(formatErrorMessage(err, 'Gagal memuat data roster upload batch', user));
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  const importExcel = useCallback(async (file, uploadedByPegawai) => {
    return RosterUploadBatchRepository.importExcel(file, uploadedByPegawai);
  }, []);

  const downloadTemplate = useCallback(async () => {
    return RosterUploadBatchRepository.downloadTemplate();
  }, []);

  const deleteBatch = useCallback(async (id) => {
    return RosterUploadBatchRepository.delete(id);
  }, []);

  return {
    batches,
    loading,
    error,
    pagination,
    fetchBatches,
    importExcel,
    downloadTemplate,
    deleteBatch,
  };
};
