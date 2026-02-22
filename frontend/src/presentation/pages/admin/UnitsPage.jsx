import { useEffect, useState } from 'react';
import { useAuth, useUnits } from '../../../domain/hooks';
import { formatErrorMessage, formatErrorForAlert } from '../../../utils/errorHandler';

const UnitsPage = () => {
  const { user } = useAuth();
  const { units, loading, error, pagination, fetchUnits, createUnit, updateUnit, deleteUnit } = useUnits();
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    id_unit: '',
    nama_unit: '',
    status: 'Aktif',
  });

  useEffect(() => {
    fetchUnits(page, 10);
  }, [page, fetchUnits]);

  const resetForm = () => {
    setFormData({
      id_unit: '',
      nama_unit: '',
      status: 'Aktif',
    });
    setEditingId(null);
    setFormError('');
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = (unit) => {
    setFormData({
      id_unit: unit.id_unit,
      nama_unit: unit.nama_unit || '',
      status: unit.status || 'Aktif',
    });
    setEditingId(unit.id_unit);
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

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      if (modalMode === 'create') {
        await createUnit({
          id_unit: Number(formData.id_unit),
          nama_unit: formData.nama_unit,
          status: formData.status,
        });
      } else if (modalMode === 'edit' && editingId) {
        await updateUnit(editingId, {
          nama_unit: formData.nama_unit,
          status: formData.status,
        });
      }

      closeModal();
      fetchUnits(page, 10);
    } catch (err) {
      setFormError(formatErrorMessage(err, 'Gagal menyimpan unit', user));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus unit ini?')) return;

    try {
      await deleteUnit(id);
      fetchUnits(page, 10);
    } catch (err) {
      const errorMessage = formatErrorMessage(err, 'Gagal menghapus unit', user);
      alert(formatErrorForAlert(errorMessage));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Unit</h1>
          <p className="text-gray-600 mt-1">Kelola data master unit</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          + Tambah Unit
        </button>
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
                      ID Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Unit
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
                  {units.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    units.map((unit) => (
                      <tr key={unit.id_unit} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{unit.id_unit}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700">{unit.nama_unit}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              unit.status === 'Aktif'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {unit.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-primary-600 hover:text-primary-900 mr-3"
                            onClick={() => openEditModal(unit)}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(unit.id_unit)}
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

            {pagination.total > units.length && (
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
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={units.length < pagination.limit}
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
          <div className="mx-auto w-full max-w-xl rounded-lg bg-white p-6 shadow-xl max-h-[calc(100vh-3rem)] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {modalMode === 'create' ? 'Tambah Unit' : 'Edit Unit'}
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

            <form onSubmit={handleSubmitForm} className="grid grid-cols-1 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">ID Unit</label>
                <input
                  type="number"
                  value={formData.id_unit}
                  onChange={(e) => handleFormChange('id_unit', e.target.value)}
                  disabled={modalMode === 'edit'}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Masukkan ID Unit"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nama Unit</label>
                <input
                  type="text"
                  value={formData.nama_unit}
                  onChange={(e) => handleFormChange('nama_unit', e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Masukkan nama unit"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                </select>
              </div>

              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary"
                  disabled={formLoading}
                >
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

export default UnitsPage;
