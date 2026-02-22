import apiClient from '../api/client';

/**
 * RosterUploadBatch repository.
 * Provides roster upload batch API operations including Excel import.
 */
const getAll = async (skip = 0, limit = 20) => {
  const params = new URLSearchParams({ skip, limit });
  const response = await apiClient.get(`/roster-upload-batch/?${params}`);
  return response.data;
};

const getById = async (id) => {
  const response = await apiClient.get(`/roster-upload-batch/${id}`);
  return response.data;
};

/**
 * Import roster from Excel file.
 * @param {File} file - .xlsx or .xlsm file
 * @param {string|null} uploadedByPegawai - optional id_pegawai of uploader
 */
const importExcel = async (file, uploadedByPegawai = null) => {
  const formData = new FormData();
  formData.append('file', file);
  if (uploadedByPegawai) {
    formData.append('uploaded_by_pegawai', uploadedByPegawai);
  }
  const response = await apiClient.post('/roster-upload-batch/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * Download the official roster Excel template.
 * Returns a Blob so the caller can trigger a browser download.
 */
const downloadTemplate = async () => {
  const response = await apiClient.get('/roster-upload-batch/template/download', {
    responseType: 'blob',
  });
  return response.data; // Blob
};

const remove = async (id) => {
  const response = await apiClient.delete(`/roster-upload-batch/${id}`);
  return response.data;
};

const RosterUploadBatchRepository = {
  getAll,
  getById,
  importExcel,
  downloadTemplate,
  delete: remove,
};

export default RosterUploadBatchRepository;
