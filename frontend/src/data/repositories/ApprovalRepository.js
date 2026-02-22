import apiClient from '../api/client';

/**
 * Approval Pengajuan Absensi repository.
 * Handles submission, assigned queue, and decision endpoints.
 */

/** Queue pengajuan yang assigned ke saya (untuk approver). */
const getAssigned = async (skip = 0, limit = 10) => {
  const params = new URLSearchParams({ skip, limit });
  const response = await apiClient.get(`/approval-pengajuan-absensi/assigned?${params}`);
  return response.data;
};

/** Daftar pengajuan milik saya sendiri (untuk pegawai). */
const getMine = async (skip = 0, limit = 10) => {
  const params = new URLSearchParams({ skip, limit });
  const response = await apiClient.get(`/approval-pengajuan-absensi/mine?${params}`);
  return response.data;
};

/** Submit keputusan (APPROVED / REJECTED / CANCELLED). */
const decide = async (pengajuanId, payload) => {
  const response = await apiClient.post(
    `/approval-pengajuan-absensi/${pengajuanId}/decision`,
    payload
  );
  return response.data;
};

/** Submit pengajuan baru */
const create = async (payload) => {
  const response = await apiClient.post('/approval-pengajuan-absensi/', payload);
  return response.data;
};

/** Get log per pengajuan. */
const getLogs = async (pengajuanId, skip = 0, limit = 50) => {
  const params = new URLSearchParams({ skip, limit });
  const response = await apiClient.get(
    `/approval-pengajuan-absensi/${pengajuanId}/logs?${params}`
  );
  return response.data;
};

/** Global audit log (admin) — GET /approval-pengajuan-absensi/logs */
const getAllLogs = async ({ start_date, end_date, action_type, pengajuan_id, skip = 0, limit = 20 } = {}) => {
  const params = {};
  if (start_date) params.start_date = start_date;
  if (end_date) params.end_date = end_date;
  if (action_type) params.action_type = action_type;
  if (pengajuan_id) params.pengajuan_id = pengajuan_id;
  params.skip = skip;
  params.limit = limit;
  const response = await apiClient.get('/approval-pengajuan-absensi/logs', { params });
  return response.data;
};

const ApprovalRepository = {
  getAssigned,
  getMine,
  decide,
  create,
  getLogs,
  getAllLogs,
};

export default ApprovalRepository;
