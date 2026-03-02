import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePegawai } from '../../../domain/hooks';
import { useAuth } from '../../../domain/hooks';
import PegawaiRepository from '../../../data/repositories/PegawaiRepository';
import FaceRepository from '../../../data/repositories/FaceRepository';
import UnitSearchInput from '../../components/common/UnitSearchInput';
import { formatErrorMessage, formatErrorForAlert } from '../../../utils/errorHandler';

const Pegawai = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    pegawai,
    loading,
    error,
    pagination,
    fetchPegawai,
    createPegawai,
    updatePegawai,
    deletePegawai
  } = usePegawai();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [currentPhoto, setCurrentPhoto] = useState('');

  // Face embedding counts per pegawai { [id_pegawai]: number }
  const [faceCounts, setFaceCounts] = useState({});

  // Excel import state
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [formData, setFormData] = useState({
    id_pegawai: '',
    nip: '',
    nama: '',
    jenis_kelamin: 'L',
    tempat_lahir: '',
    tanggal_lahir: '',
    alamat: '',
    id_unit: '',
    kepala_id_unit: '',
    status: '',
    foto: null
  });

  useEffect(() => {
    fetchPegawai(page, 10, search);
  }, [page, search, fetchPegawai]);

  // Fetch face embedding counts for all pegawai on current page
  useEffect(() => {
    if (!pegawai.length) return;
    let cancelled = false;
    Promise.all(
      pegawai.map((p) =>
        FaceRepository.getEmbeddingCount(p.id_pegawai)
          .then((res) => ({ id: p.id_pegawai, count: res?.data?.total_embeddings ?? 0 }))
          .catch(() => ({ id: p.id_pegawai, count: null }))
      )
    ).then((results) => {
      if (cancelled) return;
      setFaceCounts(Object.fromEntries(results.map((r) => [r.id, r.count])));
    });
    return () => { cancelled = true; };
  }, [pegawai]);

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pegawai ini?')) return;
    try {
      await deletePegawai(id);
      fetchPegawai(page, 10, search);
    } catch (err) {
      const errorMessage = formatErrorMessage(err, 'Gagal menghapus pegawai', user);
      alert(formatErrorForAlert(errorMessage));
    }
  };

  // --- Excel import handlers ---
  const handleDownloadTemplate = async () => {
    try {
      const blob = await PegawaiRepository.downloadTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_import_pegawai.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(formatErrorForAlert(formatErrorMessage(err, 'Gagal mengunduh template', user)));
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const res = await PegawaiRepository.importExcel(importFile);
      setImportResult(res?.data ?? null);
      fetchPegawai(page, 10, search);
    } catch (err) {
      alert(formatErrorForAlert(formatErrorMessage(err, 'Gagal mengimpor pegawai', user)));
    } finally {
      setImportLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id_pegawai: '',
      nip: '',
      nama: '',
      jenis_kelamin: 'L',
      tempat_lahir: '',
      tanggal_lahir: '',
      alamat: '',
      id_unit: '',
      kepala_id_unit: '',
      status: '',
      foto: null
    });
    setEditingId(null);
    setFormError('');
    setCurrentPhoto('');
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = (pegawaiItem) => {
    const normalizedDate = pegawaiItem.tanggal_lahir
      ? String(pegawaiItem.tanggal_lahir).split('T')[0]
      : '';

    setFormData({
      id_pegawai: pegawaiItem.id_pegawai || '',
      nip: pegawaiItem.nip || '',
      nama: pegawaiItem.nama || '',
      jenis_kelamin: pegawaiItem.jenis_kelamin || 'L',
      tempat_lahir: pegawaiItem.tempat_lahir || '',
      tanggal_lahir: normalizedDate,
      alamat: pegawaiItem.alamat || '',
      id_unit: pegawaiItem.id_unit ? String(pegawaiItem.id_unit) : '',
      kepala_id_unit: pegawaiItem.kepala_id_unit ? String(pegawaiItem.kepala_id_unit) : '',
      status: pegawaiItem.status || '',
      foto: null
    });
    setCurrentPhoto(pegawaiItem.foto || '');
    setEditingId(pegawaiItem.id_pegawai);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormLoading(false);
    setFormError('');
  };

  useEffect(() => {
    if (!isModalOpen) return;

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isModalOpen]);

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const buildFormPayload = (includeIdPegawai) => {
    const isEditMode = !includeIdPegawai;
    const payload = new FormData();
    const entries = {
      ...(includeIdPegawai ? { id_pegawai: formData.id_pegawai } : {}),
      nip: formData.nip,
      nama: formData.nama,
      jenis_kelamin: formData.jenis_kelamin,
      tempat_lahir: formData.tempat_lahir,
      tanggal_lahir: formData.tanggal_lahir,
      alamat: formData.alamat,
      id_unit: formData.id_unit,
      status: formData.status
    };

    Object.entries(entries).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        payload.append(key, value);
      }
    });

    // kepala_id_unit: pada edit selalu dikirim agar bisa dikosongkan.
    // 0 = sentinel "hapus / set NULL", nilai valid = ID unit.
    if (isEditMode) {
      payload.append('kepala_id_unit', formData.kepala_id_unit || '0');
    } else if (formData.kepala_id_unit) {
      payload.append('kepala_id_unit', formData.kepala_id_unit);
    }

    if (formData.foto) {
      payload.append('foto', formData.foto);
    }

    return payload;
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      if (modalMode === 'create') {
        const payload = buildFormPayload(true);
        await createPegawai(payload);
      } else if (modalMode === 'edit' && editingId) {
        const payload = buildFormPayload(false);
        await updatePegawai(editingId, payload);
      }

      closeModal();
      fetchPegawai(page, 10, search);
    } catch (err) {
      const errorMessage = formatErrorMessage(err, 'Gagal menyimpan data pegawai', user);
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const nextPage = 1;
    setPage(nextPage);
    fetchPegawai(nextPage, 10, search);
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pegawai</h1>
          <p className="text-gray-600 mt-1">Kelola data pegawai</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-secondary flex items-center gap-1.5"
            onClick={handleDownloadTemplate}
            title="Download template Excel untuk import massal"
          >
            ⬇️ Template Excel
          </button>
          <button
            className="btn-secondary flex items-center gap-1.5"
            onClick={() => { setImportFile(null); setImportResult(null); setImportOpen(true); }}
          >
            📂 Import Excel
          </button>
          <button className="btn-primary" onClick={openCreateModal}>
            + Tambah Pegawai
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pegawai (nama, NIP, email)..."
            className="input-field flex-1"
          />
          <button type="submit" className="btn-primary">
            🔍 Cari
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Foto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID / Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NIP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Face
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pegawai.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    pegawai.map((p) => (
                      <tr key={p.id_pegawai} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {p.foto ? (
                            <img
                              src={PegawaiRepository.getPhotoUrl(p.foto)}
                              alt={p.nama}
                              className="w-12 h-12 rounded-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-gray-500 text-lg">👤</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{p.nama || '-'}</div>
                          <div className="text-xs text-gray-500">{p.id_pegawai}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">{p.nip || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">
                            {p.id_unit ? (
                              <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                Unit {p.id_unit}
                              </span>
                            ) : '-'}
                            {p.kepala_id_unit ? (
                              <span className="ml-1 inline-flex px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                                KA {p.kepala_id_unit}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">{p.status || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {faceCounts[p.id_pegawai] == null ? (
                            <span className="text-gray-300 text-xs">…</span>
                          ) : faceCounts[p.id_pegawai] === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              ✕ Belum
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              ✓ {faceCounts[p.id_pegawai]}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-primary-600 hover:text-primary-900 mr-3"
                            onClick={() => openEditModal(p)}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => navigate(`/pegawai/${p.id_pegawai}/register-face?mode=register`)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            Wajah
                          </button>
                          <button
                            onClick={() => handleDelete(p.id_pegawai)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total > pegawai.length && (
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit) || 1}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={pegawai.length < pagination.limit}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-6">
          <div className="mx-auto w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[calc(100vh-3rem)] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {modalMode === 'create' ? 'Tambah Pegawai' : 'Edit Pegawai'}
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

            <form onSubmit={handleSubmitForm} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {modalMode === 'create' && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">ID Pegawai</label>
                  <input
                    type="text"
                    value={formData.id_pegawai}
                    onChange={(e) => handleFormChange('id_pegawai', e.target.value)}
                    className="input-field"
                    placeholder="Masukkan ID Pegawai"
                    required
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nama</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => handleFormChange('nama', e.target.value)}
                  className="input-field"
                  placeholder="Nama lengkap"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">NIP</label>
                <input
                  type="text"
                  value={formData.nip}
                  onChange={(e) => handleFormChange('nip', e.target.value)}
                  className="input-field"
                  placeholder="NIP"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Jenis Kelamin</label>
                <select
                  value={formData.jenis_kelamin}
                  onChange={(e) => handleFormChange('jenis_kelamin', e.target.value)}
                  className="input-field"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <input
                  type="text"
                  value={formData.status}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                  className="input-field"
                  placeholder="PNS / Kontrak"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tempat Lahir</label>
                <input
                  type="text"
                  value={formData.tempat_lahir}
                  onChange={(e) => handleFormChange('tempat_lahir', e.target.value)}
                  className="input-field"
                  placeholder="Tempat lahir"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tanggal Lahir</label>
                <input
                  type="date"
                  value={formData.tanggal_lahir}
                  onChange={(e) => handleFormChange('tanggal_lahir', e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Alamat</label>
                  <textarea
                    rows="3"
                    value={formData.alamat}
                    onChange={(e) => handleFormChange('alamat', e.target.value)}
                    className="input-field"
                    placeholder="Alamat lengkap"
                  />
                </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Unit Kerja</label>
                <UnitSearchInput
                  value={formData.id_unit}
                  onChange={(val) => handleFormChange('id_unit', val)}
                  placeholder="Cari nama unit..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Unit Kepala
                  <span className="ml-1 text-xs text-gray-400">(routing approval)</span>
                </label>
                <UnitSearchInput
                  value={formData.kepala_id_unit}
                  onChange={(val) => handleFormChange('kepala_id_unit', val)}
                  placeholder="Cari unit atasan..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Foto</label>
                {modalMode === 'edit' && currentPhoto && (
                  <div className="mb-2 flex items-center gap-3 text-xs text-gray-600">
                    <img
                      src={PegawaiRepository.getPhotoUrl(currentPhoto)}
                      alt="Foto pegawai"
                      className="h-10 w-10 rounded-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span>Foto saat ini: {currentPhoto}</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFormChange('foto', e.target.files?.[0] || null)}
                  className="input-field"
                />
              </div>

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

      {/* ── Import Excel Modal ────────────────────────────────────────── */}
      {importOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-6">
          <div className="mx-auto w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Import Pegawai dari Excel</h2>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setImportOpen(false)}>✕</button>
            </div>

            {/* Step guide */}
            {!importResult && (
              <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-1">
                <p className="font-medium">📋 Cara penggunaan:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Klik <strong>Download Template</strong> untuk mendapatkan file contoh</li>
                  <li>Isi data pegawai di baris berikutnya (jangan ubah header)</li>
                  <li>Kolom bertanda <strong>*</strong> wajib diisi</li>
                  <li>Upload file yang sudah diisi, lalu klik <strong>Import</strong></li>
                </ol>
              </div>
            )}

            {/* Result view */}
            {importResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                    <p className="text-2xl font-bold text-green-700">{importResult.success}</p>
                    <p className="text-xs text-green-600">Berhasil</p>
                  </div>
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-2xl font-bold text-red-700">{importResult.errors?.length ?? 0}</p>
                    <p className="text-xs text-red-600">Gagal</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <p className="text-2xl font-bold text-gray-700">{importResult.total}</p>
                    <p className="text-xs text-gray-500">Total baris</p>
                  </div>
                </div>

                {importResult.errors?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-700 mb-2">Detail error per baris:</p>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-red-200 divide-y divide-red-100">
                      {importResult.errors.map((e, i) => (
                        <div key={i} className="px-3 py-2 text-xs text-red-800">
                          <span className="font-medium">Baris {e.row}</span>
                          {e.id_pegawai && <span className="text-gray-500"> ({e.id_pegawai})</span>}
                          {': '}
                          {e.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    className="btn-secondary"
                    onClick={() => { setImportResult(null); setImportFile(null); }}
                  >
                    Import Lagi
                  </button>
                  <button className="btn-primary" onClick={() => setImportOpen(false)}>Tutup</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">File Excel (.xlsx)</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                  {importFile && (
                    <p className="mt-1 text-xs text-gray-500">✓ {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)</p>
                  )}
                </div>

                <div className="flex justify-between items-center gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-sm flex items-center gap-1"
                    onClick={handleDownloadTemplate}
                  >
                    ⬇️ Download Template
                  </button>
                  <div className="flex gap-2">
                    <button type="button" className="btn-secondary" onClick={() => setImportOpen(false)}>Batal</button>
                    <button
                      type="button"
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!importFile || importLoading}
                      onClick={handleImportSubmit}
                    >
                      {importLoading ? '⏳ Mengimpor...' : '📥 Import'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Pegawai;
