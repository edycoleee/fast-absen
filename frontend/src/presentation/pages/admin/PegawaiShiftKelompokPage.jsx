import { useState, useEffect } from 'react';
import { useAuth } from '../../../domain/hooks';
import { usePegawaiShiftKelompok } from '../../../domain/hooks';
import ShiftKelompokRepository from '../../../data/repositories/ShiftKelompokRepository';
import PegawaiShiftKelompokRepository from '../../../data/repositories/PegawaiShiftKelompokRepository';
import PegawaiSearchInput from '../../components/common/PegawaiSearchInput';
import { formatErrorMessage, formatErrorForAlert } from '../../../utils/errorHandler';

const today = new Date().toISOString().split('T')[0];

const EMPTY_FORM = {
  id_pegawai: '',
  pegawai_nama: '',
  shift_kelompok_id: '',
  effective_start_date: today,
  effective_end_date: '',
  is_default: true,
  catatan: '',
};

const PegawaiShiftKelompokPage = () => {
  const { user } = useAuth();
  const {
    assignments,
    loading,
    error,
    pagination,
    fetchAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
  } = usePegawaiShiftKelompok();

  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  /* Shift kelompok dropdown list */
  const [shiftKelompokList, setShiftKelompokList] = useState([]);
  const [loadingKelompok, setLoadingKelompok] = useState(false);

  useEffect(() => {
    fetchAssignments(page, 10);
  }, [page, fetchAssignments]);

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

  const getKelompokName = (id) => {
    const found = shiftKelompokList.find((k) => k.id === id);
    return found ? `${found.kode} – ${found.nama}` : id ?? '-';
  };

  /* ── Modal helpers ────────────────────────────────────── */
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
      id_pegawai: item.id_pegawai ?? '',
      pegawai_nama: item.pegawai_nama ?? '',
      shift_kelompok_id: item.shift_kelompok_id ?? '',
      effective_start_date: item.effective_start_date ?? today,
      effective_end_date: item.effective_end_date ?? '',
      is_default: item.is_default ?? true,
      catatan: item.catatan ?? '',
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

    if (!formData.id_pegawai) {
      setFormError('Pegawai wajib dipilih.');
      return;
    }
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
        id_pegawai: formData.id_pegawai,
        shift_kelompok_id: Number(formData.shift_kelompok_id),
        effective_start_date: formData.effective_start_date,
        effective_end_date: formData.effective_end_date || null,
        is_default: formData.is_default,
        catatan: formData.catatan || null,
      };

      if (modalMode === 'create') {
        await createAssignment(payload);
      } else {
        await updateAssignment(editingId, payload);
      }
      closeModal();
      fetchAssignments(page, 10);
    } catch (err) {
      setFormError(formatErrorForAlert(err, user));
    } finally {
      setFormLoading(false);
    }
  };

  /* ── Delete ──────────────────────────────────────────── */
  const handleDelete = async (item) => {
    const label = item.pegawai_nama
      ? `${item.pegawai_nama} (${item.id_pegawai})`
      : item.id_pegawai;
    if (!window.confirm(`Hapus assignment pegawai "${label}"?`)) return;
    try {
      await deleteAssignment(item.id);
      fetchAssignments(page, 10);
    } catch (err) {
      alert(formatErrorForAlert(err, user));
    }
  };

  /* ── Pagination ─────────────────────────────────────── */
  const totalPages = pagination.limit > 0 ? Math.ceil(pagination.total / pagination.limit) : 1;

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shift Pegawai</h1>
          <p className="text-sm text-gray-500 mt-1">
            Penugasan kelompok shift per pegawai
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-green-700 hover:bg-green-50 border border-green-300 bg-white w-full sm:w-auto justify-center"
            onClick={async () => {
              try {
                const blob = await PegawaiShiftKelompokRepository.downloadTemplate();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'template_shift_pegawai.xlsx';
                a.click();
                URL.revokeObjectURL(url);
              } catch (_) {
                alert('Gagal mengunduh template');
              }
            }}
          >
            ↓ Template Excel
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 border border-blue-300 bg-white w-full sm:w-auto justify-center"
            onClick={() => { setImportOpen(true); setImportFile(null); setImportResult(null); }}
          >
            📂 Import Excel
          </button>
          <button type="button" onClick={openCreateModal} className="btn-primary w-full sm:w-auto">
            + Tambah Assignment
          </button>
        </div>
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
                {['ID', 'Pegawai', 'Shift Kelompok', 'Mulai Efektif', 'Selesai Efektif', 'Default', 'Catatan', 'Aksi'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Belum ada assignment shift pegawai.
                  </td>
                </tr>
              ) : (
                assignments.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{item.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{item.pegawai_nama ?? '-'}</p>
                      <p className="text-xs text-gray-400">{item.id_pegawai}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {item.shift_kelompok_nama ?? getKelompokName(item.shift_kelompok_id)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{item.effective_start_date ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {item.effective_end_date ?? <span className="text-gray-400 italic">-</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${item.is_default ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                        {item.is_default ? 'Ya' : 'Tidak'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">
                      {item.catatan ?? <span className="text-gray-400 italic">-</span>}
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
      {importOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Import Shift Pegawai dari Excel</h2>
              <button onClick={() => setImportOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside bg-gray-50 rounded-lg p-4">
                <li>Unduh template dengan tombol <strong>↓ Template Excel</strong></li>
                <li>Isi kolom: <strong>id_pegawai</strong>, <strong>shift_kelompok_kode</strong>, <strong>effective_start_date</strong> (YYYY-MM-DD)</li>
                <li>Kolom <code className="bg-gray-200 px-1 rounded">shift_kelompok_kode</code> isi dengan kode shift yang ada di master data</li>
                <li>Pilih file .xlsx lalu klik <strong>Upload &amp; Import</strong></li>
              </ol>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih File Excel</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={e => { setImportFile(e.target.files[0]); setImportResult(null); }}
                  className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              {importResult && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-700">{importResult.data?.success ?? 0}</div>
                      <div className="text-xs text-green-600">Berhasil</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-2xl font-bold text-red-700">{importResult.data?.errors?.length ?? 0}</div>
                      <div className="text-xs text-red-600">Gagal</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-700">{importResult.data?.total ?? 0}</div>
                      <div className="text-xs text-blue-600">Total</div>
                    </div>
                  </div>
                  {importResult.data?.errors?.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border border-red-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-red-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-red-700">Baris</th>
                            <th className="px-3 py-2 text-left text-red-700">ID Pegawai</th>
                            <th className="px-3 py-2 text-left text-red-700">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100">
                          {importResult.data.errors.map((e, i) => (
                            <tr key={i}>
                              <td className="px-3 py-1.5 text-gray-500">{e.row}</td>
                              <td className="px-3 py-1.5 text-gray-700">{e.id_pegawai || '-'}</td>
                              <td className="px-3 py-1.5 text-red-600">{e.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setImportOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50">Tutup</button>
              <button
                disabled={!importFile || importLoading}
                onClick={async () => {
                  if (!importFile) return;
                  setImportLoading(true);
                  try {
                    const result = await PegawaiShiftKelompokRepository.importExcel(importFile);
                    setImportResult(result);
                    fetchAssignments(page, 10);
                  } catch (err) {
                    alert(formatErrorForAlert(formatErrorMessage(err, 'Gagal import', user)));
                  } finally {
                    setImportLoading(false);
                  }
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importLoading ? 'Mengimport...' : 'Upload & Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {modalMode === 'create' ? 'Tambah Assignment Shift' : 'Edit Assignment Shift'}
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

              {/* Pegawai */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pegawai <span className="text-red-500">*</span>
                </label>
                {modalMode === 'edit' ? (
                  /* On edit mode show as read-only — pegawai FK shouldn't be swapped */
                  <div className="input-field bg-gray-50 text-gray-600 cursor-not-allowed select-none">
                    {formData.pegawai_nama
                      ? `${formData.pegawai_nama} (${formData.id_pegawai})`
                      : formData.id_pegawai}
                  </div>
                ) : (
                  <PegawaiSearchInput
                    value={formData.id_pegawai}
                    onChange={(id, nama) => {
                      handleChange('id_pegawai', id);
                      handleChange('pegawai_nama', nama ?? '');
                    }}
                    placeholder="Cari nama atau ID pegawai..."
                  />
                )}
              </div>

              {/* Shift Kelompok */}
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

              {/* Periode Efektif */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Periode Efektif</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Mulai <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={formData.effective_start_date}
                      onChange={(e) => handleChange('effective_start_date', e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Selesai (opsional)</label>
                    <input
                      type="date"
                      value={formData.effective_end_date}
                      onChange={(e) => handleChange('effective_end_date', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
                <textarea
                  value={formData.catatan}
                  onChange={(e) => handleChange('catatan', e.target.value)}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Catatan tambahan..."
                />
              </div>

              {/* Toggle is_default */}
              <div>
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => handleChange('is_default', !formData.is_default)}
                >
                  <div className={`w-12 h-6 rounded-full transition-colors ${formData.is_default ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${formData.is_default ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Jadikan Default</span>
                </div>
                <p className="text-xs text-gray-400 mt-1 ml-15">
                  Hanya satu assignment aktif per pegawai yang bisa default.
                </p>
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

export default PegawaiShiftKelompokPage;
