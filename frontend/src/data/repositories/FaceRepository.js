import apiClient from '../api/client';

/**
 * FaceRepository — API calls untuk face recognition backend.
 *
 * Base URL sudah dikonfigurasi di apiClient (/api/v1), sehingga
 * endpoint di sini cukup menggunakan path relatif.
 */

/**
 * Ambil jumlah embeddings wajah yang sudah tersimpan untuk seorang pegawai.
 * @param {string|number} idPegawai
 */
const getEmbeddingCount = async (idPegawai) => {
  const response = await apiClient.get(`/face/users/${idPegawai}/embeddings`);
  return response.data;
  // Returns: { success, data: { user_id, embeddings_count } }
};

/**
 * Validasi satu gambar wajah ke backend.
 * Digunakan sebelum menambahkan capture ke array.
 * @param {string} imageBase64 — full base64 string dengan/tanpa header data URI
 */
const validateFace = async (imageBase64) => {
  const response = await apiClient.post('/face/validate', { image: imageBase64 });
  return response.data;
  // Returns: { success, message, data: { bbox, confidence, face_width, face_height } }
};

/**
 * Daftarkan array gambar wajah ke database pegawai.
 * @param {string|number} idPegawai
 * @param {string[]} images — array base64 JPEG
 */
const registerFaces = async (idPegawai, images) => {
  const response = await apiClient.post(`/face/users/${idPegawai}/register`, { images });
  return response.data;
  // Returns: { success, message, data: { successful, failed } }
};

/**
 * Hapus semua embedding wajah seorang pegawai.
 * @param {string|number} idPegawai
 */
const deleteEmbeddings = async (idPegawai) => {
  const response = await apiClient.delete(`/face/users/${idPegawai}/embeddings`);
  return response.data;
};

/**
 * Verifikasi wajah 1:1 untuk pegawai tertentu.
 * @param {string|number} idPegawai
 * @param {string} imageBase64 — base64 tanpa data URI prefix
 * @param {number} [threshold=0.6]
 */
const verifyFace = async (idPegawai, imageBase64, threshold = 0.6) => {
  const response = await apiClient.post('/face/verify', {
    id_pegawai: String(idPegawai),
    image: imageBase64,
    threshold,
  });
  return response.data;
  // Returns: { success, data: { verified, similarity, threshold, id_pegawai, message } }
};

const FaceRepository = {
  getEmbeddingCount,
  validateFace,
  registerFaces,
  deleteEmbeddings,
  verifyFace,
};

export default FaceRepository;
