import { useState, useEffect } from 'react';
import { usePegawai } from '../../../domain/hooks';

const Pegawai = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://192.168.171.15:8000/api/v1';
  const apiOrigin = new URL(apiBaseUrl).origin;
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
  const [formData, setFormData] = useState({
    id_pegawai: '',
    nip: '',
    nama: '',
    jenis_kelamin: 'L',
    tempat_lahir: '',
    tanggal_lahir: '',
    alamat: '',
    id_ruang: '',
    status: '',
    foto: null
  });

  useEffect(() => {
    fetchPegawai(page, 10, search);
  }, [page, search, fetchPegawai]);

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pegawai ini?')) return;
    
    try {
      await deletePegawai(id);
      fetchPegawai(page, 10, search);
    } catch (err) {
      alert(err.message || 'Gagal menghapus pegawai');
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
      id_ruang: '',
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
      id_ruang: pegawaiItem.id_ruang ? String(pegawaiItem.id_ruang) : '',
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

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const buildFormPayload = (includeIdPegawai) => {
    const payload = new FormData();
    const entries = {
      ...(includeIdPegawai ? { id_pegawai: formData.id_pegawai } : {}),
      nip: formData.nip,
      nama: formData.nama,
      jenis_kelamin: formData.jenis_kelamin,
      tempat_lahir: formData.tempat_lahir,
      tanggal_lahir: formData.tanggal_lahir,
      alamat: formData.alamat,
      id_ruang: formData.id_ruang,
      status: formData.status
    };

    Object.entries(entries).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        payload.append(key, value);
      }
    });

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
      setFormError(err.response?.data?.message || err.message || 'Gagal menyimpan data pegawai');
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pegawai</h1>
          <p className="text-gray-600 mt-1">Kelola data pegawai</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          + Tambah Pegawai
        </button>
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
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NIP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
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
                              src={`${apiOrigin}/uploads/photos/${p.foto}`}
                              alt={p.nama}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-gray-500 text-lg">👤</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{p.nama}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">{p.nip || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">{p.status || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-primary-600 hover:text-primary-900 mr-3"
                            onClick={() => openEditModal(p)}
                          >
                            Edit
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
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
                <label className="mb-1 block text-sm font-medium text-gray-700">ID Ruang</label>
                <input
                  type="number"
                  value={formData.id_ruang}
                  onChange={(e) => handleFormChange('id_ruang', e.target.value)}
                  className="input-field"
                  placeholder="ID Ruang"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Foto</label>
                {modalMode === 'edit' && currentPhoto && (
                  <div className="mb-2 flex items-center gap-3 text-xs text-gray-600">
                    <img
                      src={`${apiOrigin}/uploads/photos/${currentPhoto}`}
                      alt="Foto pegawai"
                      className="h-10 w-10 rounded-full object-cover"
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
    </div>
  );
};

export default Pegawai;
