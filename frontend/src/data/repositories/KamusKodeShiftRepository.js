/**
 * Kamus Kode Shift Repository
 * CRUD master kode shift (P1, S1, M1, L1, ...)
 */
import apiClient from '../api/client';

const BASE = '/kamus-kode-shift';

// Backend menyimpan jam sebagai "HH:MM:SS", frontend pakai "HH:MM"
const toFrontendJam = (t) => {
  if (!t) return '';
  return String(t).slice(0, 5); // "07:00:00" → "07:00"
};

const KamusKodeShiftRepository = {
  getAll: async ({ skip = 0, limit = 200, only_active = false } = {}) => {
    const res = await apiClient.get(BASE + '/', { params: { skip, limit, only_active } });
    const items = res.data?.data?.items ?? res.data?.items ?? [];
    // Map ke format frontend
    return items.map(k => ({
      id:          k.id,
      kode:        k.kode,
      label:       k.label ?? '',
      jam_mulai:   toFrontendJam(k.jam_mulai),
      jam_selesai: toFrontendJam(k.jam_selesai),
      is_libur:    k.is_libur ?? false,
      is_active:   k.is_active ?? true,
    }));
  },

  create: async (payload) => {
    const res = await apiClient.post(BASE + '/', payload);
    const k = res.data?.data ?? res.data;
    return {
      id:          k.id,
      kode:        k.kode,
      label:       k.label ?? '',
      jam_mulai:   toFrontendJam(k.jam_mulai),
      jam_selesai: toFrontendJam(k.jam_selesai),
      is_libur:    k.is_libur ?? false,
      is_active:   k.is_active ?? true,
    };
  },

  update: async (id, payload) => {
    const res = await apiClient.put(`${BASE}/${id}`, payload);
    const k = res.data?.data ?? res.data;
    return {
      id:          k.id,
      kode:        k.kode,
      label:       k.label ?? '',
      jam_mulai:   toFrontendJam(k.jam_mulai),
      jam_selesai: toFrontendJam(k.jam_selesai),
      is_libur:    k.is_libur ?? false,
      is_active:   k.is_active ?? true,
    };
  },

  delete: async (id) => {
    const res = await apiClient.delete(`${BASE}/${id}`);
    return res.data;
  },
};

export default KamusKodeShiftRepository;
