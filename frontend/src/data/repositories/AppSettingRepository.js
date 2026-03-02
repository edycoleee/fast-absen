import apiClient from '../api/client';

/**
 * AppSettingRepository
 * CRUD untuk konfigurasi sistem (/api/v1/app-settings)
 */
const AppSettingRepository = {
  /** Ambil semua setting */
  getAll: async () => {
    const res = await apiClient.get('/app-settings/');
    return res.data;
  },

  /** Ambil satu setting berdasarkan key */
  get: async (key) => {
    const res = await apiClient.get(`/app-settings/${key}`);
    return res.data;
  },

  /**
   * Ambil nilai face_threshold dan status lock dari backend.
   * Returns: { threshold: float, locked: bool }
   */
  getFaceThreshold: async () => {
    try {
      const res = await apiClient.get('/app-settings/');
      const settings = res.data?.data ?? [];
      const thresholdRow = settings.find((s) => s.key === 'face_threshold');
      const lockedRow    = settings.find((s) => s.key === 'face_threshold_locked');
      return {
        threshold: thresholdRow ? parseFloat(thresholdRow.value) : 0.6,
        locked:    lockedRow    ? lockedRow.value.toLowerCase() === 'true' : false,
      };
    } catch {
      return { threshold: 0.6, locked: false };
    }
  },

  /** Update setting (admin only) */
  update: async (key, value, { description, locked } = {}) => {
    const body = { value: String(value) };
    if (description !== undefined) body.description = description;
    if (locked    !== undefined) body.locked    = locked;
    const res = await apiClient.put(`/app-settings/${key}`, body);
    return res.data;
  },
};

export default AppSettingRepository;
