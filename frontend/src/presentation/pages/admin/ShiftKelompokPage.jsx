import { useState, useEffect } from 'react';
import { useAuth } from '../../../domain/hooks';
import { useShiftKelompok } from '../../../domain/hooks';
import { formatErrorMessage, formatErrorForAlert } from '../../../utils/errorHandler';

const EMPTY_FORM = {
  kode: '',
  nama: '',
  deskripsi: '',
  is_shift_based: true,
  is_active: true,
};

const ShiftKelompokPage = () => {
  const { user } = useAuth();
  const {
    shiftKelompok,
    loading,
    error,
    pagination,
    fetchShiftKelompok,
    createShiftKelompok,
    updateShiftKelompok,
    deleteShiftKelompok,
  } = useShiftKelompok();

  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchShiftKelompok(page, 10);
  }, [page, fetchShiftKelompok]);

  /* ── Modal helpers ─────────────────────────────────────── */
  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setFormError('');
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setFormData({
      kode: item.kode || '',
      nama: item.nama || '',
      deskripsi: item.deskripsi || '',
      is_shift_based: item.is_shift_based ?? true,
      is_active: item.is_active ?? true,
    });
    setEditingId(item.id);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormLoading(false);
    setFormError('');
  };

  /* Esc to close */
  useEffect(() => {
    if (!isModalOpen) return;
    const onEsc = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isModalOpen]);

  const handleChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  /* ── Submit ────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const payload = {
        kode: formData.kode.trim(),
        nama: formData.nama.trim(),
        deskripsi: formData.deskripsi.trim() || null,
        is_shift_based: formData.is_shift_based,
        is_active: formData.is_active,
      };

      if (modalMode === 'create') {
        await createShiftKelompok(payload);
      } else {
        await updateShiftKelompok(editingId, payload);
      }
      closeModal();
      fetchShiftKelompok(page, 10);
    } catch (err) {
      setFormError(formatErrorMessage(err, 'Gagal menyimpan shift kelompok', user));
    } finally {
      setFormLoading(false);
    }
  };

  /* ── Delete ────────────────────────────────────────────── */
  const handleDelete = async (id, nama) => {
    if (!confirm(`Hapus shift kelompok "${nama}"?`)) return;
    try {
      await deleteShiftKelompok(id);
      fetchShiftKelompok(page, 10);
    } catch (err) {
      alert(formatErrorForAlert(formatErrorMessage(err, 'Gagal menghapus', user)));
    }
  };

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shift Kelompok</h1>
          <p className="text-gray-600 mt-1">Kelola master kelompok shift pegawai</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          + Tambah Kelompok
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Shift Based</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shiftKelompok.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    shiftKelompok.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{item.id}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-semibold text-gray-800">{item.kode}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.nama}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {item.deskripsi || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.is_shift_based ? (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              Shift
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                              Non-Shift
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.is_active ? (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                              Non-Aktif
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-primary-600 hover:text-primary-900 mr-3"
                            onClick={() => openEditModal(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleDelete(item.id, item.nama)}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total > shiftKelompok.length && (
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit) || 1}
                  &nbsp;·&nbsp;{pagination.total} total
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={shiftKelompok.length < pagination.limit}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-6">
          <div className="mx-auto w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[calc(100vh-3rem)] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {modalMode === 'create' ? 'Tambah Shift Kelompok' : 'Edit Shift Kelompok'}
              </h2>
              <button className="text-gray-400 hover:text-gray-600" onClick={closeModal}>
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Kode */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Kode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.kode}
                  onChange={(e) => handleChange('kode', e.target.value.toUpperCase())}
                  className="input-field font-mono"
                  placeholder="cth. PERAWAT_SHIFT"
                  maxLength={50}
                  required
                />
                <p className="mt-0.5 text-xs text-gray-400">Huruf kapital, unik, max 50 karakter</p>
              </div>

              {/* Nama */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nama <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => handleChange('nama', e.target.value)}
                  className="input-field"
                  placeholder="cth. Perawat Rawat Inap"
                  maxLength={100}
                  required
                />
              </div>

              {/* Deskripsi */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Deskripsi</label>
                <textarea
                  rows="2"
                  value={formData.deskripsi}
                  onChange={(e) => handleChange('deskripsi', e.target.value)}
                  className="input-field"
                  placeholder="Keterangan singkat tentang kelompok shift ini"
                />
              </div>

              {/* Toggles */}
              <div className="sm:col-span-2 flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    role="checkbox"
                    aria-checked={formData.is_shift_based}
                    onClick={() => handleChange('is_shift_based', !formData.is_shift_based)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      formData.is_shift_based ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        formData.is_shift_based ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Shift Based</span>
                    <p className="text-xs text-gray-400">
                      {formData.is_shift_based
                        ? 'Kelompok ini menggunakan jadwal shift (pagi/sore/malam)'
                        : 'Kelompok ini tidak shift-based (cth. admin umum jam tetap)'}
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    role="checkbox"
                    aria-checked={formData.is_active}
                    onClick={() => handleChange('is_active', !formData.is_active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      formData.is_active ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        formData.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Aktif</span>
                    <p className="text-xs text-gray-400">
                      {formData.is_active ? 'Kelompok ini digunakan aktif' : 'Kelompok ini dinonaktifkan'}
                    </p>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={formLoading}
                >
                  {formLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftKelompokPage;
