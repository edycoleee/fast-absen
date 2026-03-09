import apiClient from '../api/client';

const BASE = '/penilaian-shift-absensi';

const PenilaianShiftAbsensiRepository = {
  getAll: async (skip = 0, limit = 20, filters = {}) => {
    const params = { skip, limit };
    if (filters.start_date)  params.start_date  = filters.start_date;
    if (filters.end_date)    params.end_date    = filters.end_date;
    if (filters.id_unit)     params.id_unit     = filters.id_unit;
    if (filters.id_pegawai)  params.id_pegawai  = filters.id_pegawai;
    if (filters.status_final) params.status_final = filters.status_final;
    const response = await apiClient.get(`${BASE}/`, { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`${BASE}/${id}`);
    return response.data;
  },

  create: async (payload) => {
    const response = await apiClient.post(`${BASE}/`, payload);
    return response.data;
  },

  update: async (id, payload) => {
    const response = await apiClient.put(`${BASE}/${id}`, payload);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`${BASE}/${id}`);
    return response.data;
  },

  evaluate: async (params) => {
    const response = await apiClient.post(`${BASE}/evaluate`, params);
    return response.data;
  },

  /**
   * Export rekap penilaian shift ke Excel (cross-tab pegawai × tanggal).
   * Otomatis trigger download.
   */
  exportRekap: async ({ start_date, end_date, id_unit, id_pegawai } = {}) => {
    const params = new URLSearchParams({ start_date, end_date });
    if (id_unit)    params.append('id_unit',    String(id_unit));
    if (id_pegawai) params.append('id_pegawai', id_pegawai);

    const response = await apiClient.get(`${BASE}/export/rekap?${params}`, {
      responseType: 'blob',
    });

    const url  = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href  = url;
    const disposition = response.headers?.['content-disposition'] || '';
    const match = disposition.match(/filename=([^;]+)/);
    const filename = match
      ? match[1].trim()
      : `rekap_penilaian_${start_date}_${end_date}.xlsx`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default PenilaianShiftAbsensiRepository;
