import { useState, useCallback } from 'react';
import PenilaianShiftAbsensiRepository from '../../data/repositories/PenilaianShiftAbsensiRepository';

export const usePenilaianShiftAbsensi = () => {
  const [penilaian, setPenilaian] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, skip: 0, limit: 20 });

  const fetchPenilaian = useCallback(async (page = 1, limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * limit;
      const data = await PenilaianShiftAbsensiRepository.getAll(skip, limit);
      const items = data?.data?.items ?? data?.items ?? [];
      const total = data?.data?.total ?? data?.total ?? 0;
      setPenilaian(items);
      setPagination({ total, skip, limit });
    } catch (err) {
      setError(err?.response?.data?.message || 'Gagal mengambil data penilaian shift absensi');
    } finally {
      setLoading(false);
    }
  }, []);

  const createPenilaian = useCallback(async (payload) => {
    return await PenilaianShiftAbsensiRepository.create(payload);
  }, []);

  const updatePenilaian = useCallback(async (id, payload) => {
    return await PenilaianShiftAbsensiRepository.update(id, payload);
  }, []);

  const deletePenilaian = useCallback(async (id) => {
    return await PenilaianShiftAbsensiRepository.delete(id);
  }, []);

  const evaluate = useCallback(async (params) => {
    return await PenilaianShiftAbsensiRepository.evaluate(params);
  }, []);

  return {
    penilaian,
    loading,
    error,
    pagination,
    fetchPenilaian,
    createPenilaian,
    updatePenilaian,
    deletePenilaian,
    evaluate,
  };
};
