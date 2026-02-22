import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../domain/hooks';
import { useShiftKelompokAturan } from '../../../domain/hooks';
import ShiftKelompokRepository from '../../../data/repositories/ShiftKelompokRepository';
import UnitSearchInput from '../../components/common/UnitSearchInput';
import { formatErrorMessage, formatErrorForAlert } from '../../../utils/errorHandler';

const today = new Date().toISOString().split('T')[0];

const EMPTY_FORM = {
  shift_kelompok_id: '',
  id_unit: '',
  grace_telat_menit: 10,
  toleransi_pulang_cepat_menit: 0,
  batas_lembur_menit: 0,
  window_mulai_minus_menit: 120,
  window_selesai_plus_menit: 240,
  maks_sesi_per_hari: 1,
  fleksibel_masuk_mulai: '',
  fleksibel_masuk_sampai: '',
  is_lintas_tanggal: false,
  is_active: true,
  effective_start_date: today,
  effective_end_date: '',
};

const ShiftKelompokAturanPage = () => {
  const { user } = useAuth();
  const {
    aturan,
    loading,
    error,
    pagination,
    fetchAturan,
    createAturan,
    updateAturan,
    deleteAturan,
  } = useShiftKelompokAturan();

  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);

  /* Shift kelompok list for dropdown */
  const [shiftKelompokList, setShiftKelompokList] = useState([]);
  const [loadingKelompok, setLoadingKelompok] = useState(false);

  useEffect(() => {
    fetchAturan(page, 10);
  }, [page, fetchAturan]);

  /* Load shift kelompok list once */
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingKelompok(true);
        const data = await ShiftKelompokRepository.getAll(0, 500);
        const items = data?.data?.items ?? data?.items ?? [];
        setShiftKelompokList(items);
      } catch (_) {
        // non-critical
      } finally {
        setLoadingKelompok(false);
      }
    };
    load();
  }, []);

  /* Helpers */
  const getKelompokName = (id) => {
    const found = shiftKelompokList.find((k) => k.id === id);
    return found ? `${found.kode} – ${found.nama}` : id ?? '-';
  };

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
      shift_kelompok_id: item.shift_kelompok_id ?? '',
      id_unit: item.id_unit ?? '',
      grace_telat_menit: item.grace_telat_menit ?? 10,
      toleransi_pulang_cepat_menit: item.toleransi_pulang_cepat_menit ?? 0,
      batas_lembur_menit: item.batas_lembur_menit ?? 0,
      window_mulai_minus_menit: item.window_mulai_minus_menit ?? 120,
      window_selesai_plus_menit: item.window_selesai_plus_menit ?? 240,
      maks_sesi_per_hari: item.maks_sesi_per_hari ?? 1,
      fleksibel_masuk_mulai: item.fleksibel_masuk_mulai ?? '',
      fleksibel_masuk_sampai: item.fleksibel_masuk_sampai ?? '',
      is_lintas_tanggal: item.is_lintas_tanggal ?? false,
      is_active: item.is_active ?? true,
      effective_start_date: item.effective_start_date ?? today,
      effective_end_date: item.effective_end_date ?? '',
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

  /* ── Submit ─────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.shift_kelompok_id) {
      setFormError('Shift Kelompok wajib dipilih.');
      return;
    }
    if (!formData.effective_start_date) {
      setFormError('Tanggal mulai efektif wajib diisi.');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        shift_kelompok_id: Number(formData.shift_kelompok_id),
        id_unit: formData.id_unit ? Number(formData.id_unit) : null,
        grace_telat_menit: Number(formData.grace_telat_menit),
        toleransi_pulang_cepat_menit: Number(formData.toleransi_pulang_cepat_menit),
        batas_lembur_menit: Number(formData.batas_lembur_menit),
        window_mulai_minus_menit: Number(formData.window_mulai_minus_menit),
        window_selesai_plus_menit: Number(formData.window_selesai_plus_menit),
        maks_sesi_per_hari: Number(formData.maks_sesi_per_hari),
        fleksibel_masuk_mulai: formData.fleksibel_masuk_mulai || null,
        fleksibel_masuk_sampai: formData.fleksibel_masuk_sampai || null,
        is_lintas_tanggal: formData.is_lintas_tanggal,
        is_active: formData.is_active,
        effective_start_date: formData.effective_start_date,
        effective_end_date: formData.effective_end_date || null,
      };

      if (modalMode === 'create') {
        await createAturan(payload);
      } else {
        await updateAturan(editingId, payload);
      }
      closeModal();
      fetchAturan(page, 10);
    } catch (err) {
      const msg = formatErrorForAlert(err, user);
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  /* ── Delete ────────────────────────────────────────────── */
  const handleDelete = async (item) => {
    if (!window.confirm(`Hapus aturan untuk kelompok "${getKelompokName(item.shift_kelompok_id)}"?`)) return;
    try {
      await deleteAturan(item.id);
      fetchAturan(page, 10);
    } catch (err) {
      alert(formatErrorForAlert(err, user));
    }
  };

  /* ── Pagination ─────────────────────────────────────────── */
  const totalPages = pagination.limit > 0 ? Math.ceil(pagination.total / pagination.limit) : 1;

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Aturan Shift Kelompok</h1>
          <p className="text-sm text-gray-500 mt-1">
            Konfigurasi aturan evaluasi per kelompok shift
          </p>
        </div>
        <button type="button" onClick={openCreateModal} className="btn-primary w-full sm:w-auto">
          + Tambah Aturan
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'Shift Kelompok', 'Unit', 'Grace Telat (mnt)', 'Tol. Pulang Cepat (mnt)', 'Maks Sesi/Hari', 'Lintas Tgl', 'Mulai Efektif', 'Selesai Efektif', 'Status', 'Aksi'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : aturan.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    Belum ada aturan shift kelompok.
                  </td>
                </tr>
              ) : (
                aturan.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{item.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {getKelompokName(item.shift_kelompok_id)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.id_unit ?? <span className="text-gray-400 italic">Semua</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-center">{item.grace_telat_menit}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-center">{item.toleransi_pulang_cepat_menit}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-center">{item.maks_sesi_per_hari}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${item.is_lintas_tanggal ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}`}>
                        {item.is_lintas_tanggal ? 'Ya' : 'Tidak'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{item.effective_start_date ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{item.effective_end_date ?? <span className="text-gray-400 italic">-</span>}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {item.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <button type="button" onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-800 mr-3 font-medium">Edit</button>
                      <button type="button" onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-800 font-medium">Hapus</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Total: <span className="font-medium">{pagination.total}</span> data
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {modalMode === 'create' ? 'Tambah Aturan Shift' : 'Edit Aturan Shift'}
              </h2>
              <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              {/* Section: Kelompok & Unit */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Kelompok & Unit</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift Kelompok <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.shift_kelompok_id}
                      onChange={(e) => handleChange('shift_kelompok_id', e.target.value)}
                      className="input-field"
                      required
                    >
                      <option value="">
                        {loadingKelompok ? 'Memuat...' : '-- Pilih kelompok --'}
                      </option>
                      {shiftKelompokList.map((k) => (
                        <option key={k.id} value={k.id}>{k.kode} – {k.nama}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit (opsional)</label>
                    <UnitSearchInput
                      value={formData.id_unit}
                      onChange={(val) => handleChange('id_unit', val)}
                      placeholder="Semua unit"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Toleransi Waktu */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Toleransi Waktu (menit)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grace Telat</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.grace_telat_menit}
                      onChange={(e) => handleChange('grace_telat_menit', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tol. Pulang Cepat</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.toleransi_pulang_cepat_menit}
                      onChange={(e) => handleChange('toleransi_pulang_cepat_menit', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batas Lembur</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.batas_lembur_menit}
                      onChange={(e) => handleChange('batas_lembur_menit', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Window Mulai (−)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.window_mulai_minus_menit}
                      onChange={(e) => handleChange('window_mulai_minus_menit', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Window Selesai (+)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.window_selesai_plus_menit}
                      onChange={(e) => handleChange('window_selesai_plus_menit', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maks Sesi/Hari</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maks_sesi_per_hari}
                      onChange={(e) => handleChange('maks_sesi_per_hari', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Fleksibel Masuk */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Jam Fleksibel Masuk (opsional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mulai</label>
                    <input
                      type="time"
                      value={formData.fleksibel_masuk_mulai}
                      onChange={(e) => handleChange('fleksibel_masuk_mulai', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sampai</label>
                    <input
                      type="time"
                      value={formData.fleksibel_masuk_sampai}
                      onChange={(e) => handleChange('fleksibel_masuk_sampai', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Periode Efektif */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Periode Efektif</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mulai <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.effective_start_date}
                      onChange={(e) => handleChange('effective_start_date', e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Selesai (opsional)</label>
                    <input
                      type="date"
                      value={formData.effective_end_date}
                      onChange={(e) => handleChange('effective_end_date', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Konfigurasi */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Konfigurasi</h3>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => handleChange('is_lintas_tanggal', !formData.is_lintas_tanggal)}
                      className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${formData.is_lintas_tanggal ? 'bg-purple-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${formData.is_lintas_tanggal ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Lintas Tanggal</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => handleChange('is_active', !formData.is_active)}
                      className={`w-12 h-6 rounded-full transition-colors cursor-pointer ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Aktif</span>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="btn-secondary" disabled={formLoading}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={formLoading}>
                  {formLoading ? 'Menyimpan...' : modalMode === 'create' ? 'Simpan' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftKelompokAturanPage;
