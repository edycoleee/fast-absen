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

/** Get log per pengajuan. */
const getLogs = async (pengajuanId, skip = 0, limit = 50) => {
  const params = new URLSearchParams({ skip, limit });
  const response = await apiClient.get(
    `/approval-pengajuan-absensi/${pengajuanId}/logs?${params}`
  );
  return response.data;
};

const ApprovalRepository = {
  getAssigned,
  getMine,
  decide,
  getLogs,
};

export default ApprovalRepository;
