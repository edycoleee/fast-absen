import apiClient from '../api/client';

const BASE = '/roster-shift';

const RosterShiftRepository = {
  getAll: async (skip = 0, limit = 20, filters = {}) => {
    const params = { skip, limit };
    if (filters.id_pegawai)       params.id_pegawai       = filters.id_pegawai;
    if (filters.tanggal_mulai)    params.tanggal_mulai    = filters.tanggal_mulai;
    if (filters.tanggal_selesai)  params.tanggal_selesai  = filters.tanggal_selesai;
    if (filters.status_roster)    params.status_roster    = filters.status_roster;
    if (filters.shift_kelompok_id) params.shift_kelompok_id = filters.shift_kelompok_id;
    if (filters.id_unit)          params.id_unit          = filters.id_unit;
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

  batchCreate: async (payloads) => {
    const response = await apiClient.post(`${BASE}/batch`, payloads);
    return response.data;
  },

  exportRekap: async ({ tanggal_mulai, tanggal_selesai, id_unit, id_pegawai, status_roster } = {}) => {
    const params = {};
    if (tanggal_mulai)  params.tanggal_mulai  = tanggal_mulai;
    if (tanggal_selesai) params.tanggal_selesai = tanggal_selesai;
    if (id_unit)        params.id_unit        = id_unit;
    if (id_pegawai)     params.id_pegawai     = id_pegawai;
    if (status_roster)  params.status_roster  = status_roster;
    const response = await apiClient.get(`${BASE}/export/rekap`, {
      params,
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement('a');
    a.href = url;
    const start = tanggal_mulai ? tanggal_mulai.replace(/-/g, '') : 'all';
    const end   = tanggal_selesai ? tanggal_selesai.replace(/-/g, '') : 'all';
    a.download = `roster_shift_${start}_${end}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  downloadTemplate: async ({ tahun, bulan, id_unit, id_pegawai } = {}) => {
    const params = { tahun, bulan };
    if (id_unit) params.id_unit = id_unit;
    // id_pegawai bisa array → kirim sebagai param berulang (?id_pegawai=x&id_pegawai=y)
    const response = await apiClient.get(`${BASE}/template/download`, {
      params: id_pegawai?.length
        ? { ...params, id_pegawai }
        : params,
      paramsSerializer: p => {
        const sp = new URLSearchParams();
        Object.entries(p).forEach(([k, v]) => {
          if (Array.isArray(v)) v.forEach(val => sp.append(k, val));
          else if (v !== undefined && v !== null) sp.append(k, v);
        });
        return sp.toString();
      },
      responseType: 'blob',
    });
    const BULAN = ['', 'januari', 'februari', 'maret', 'april', 'mei', 'juni',
                   'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
    const fname = `template_roster_${BULAN[bulan] || bulan}_${tahun}${id_unit ? `_unit${id_unit}` : ''}.xlsx`;
    const url = URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  parseTemplate: async (file, { tahun, bulan } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`${BASE}/template/parse`, formData, {
      params: { tahun, bulan },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default RosterShiftRepository;
