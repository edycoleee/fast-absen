import { useEffect, useState } from 'react';
import PermissionRepository from '../../../data/repositories/PermissionRepository';

const Permissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchPermissions(page, 10);
  }, [page]);

  const fetchPermissions = async (pageNumber = 1, limit = 10) => {
    setLoading(true);
    setError('');

    try {
      const response = await PermissionRepository.getAll(pageNumber, limit);
      const list = response?.data?.permissions || response?.data?.items || [];
      setPermissions(list);
      setPagination({
        page: response?.data?.page || pageNumber,
        limit: response?.data?.limit || limit,
        total: response?.data?.total || list.length
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Gagal memuat data permissions');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
    setEditingId(null);
    setFormError('');
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = (permission) => {
    setFormData({
      name: permission.name || '',
      description: permission.description || ''
    });
    setEditingId(permission.id);
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

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null
      };

      if (modalMode === 'create') {
        await PermissionRepository.create(payload);
      } else if (modalMode === 'edit' && editingId) {
        await PermissionRepository.update(editingId, payload);
      }

      closeModal();
      fetchPermissions(page, pagination.limit);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Gagal menyimpan permission');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (permissionId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus permission ini?')) return;

    try {
      await PermissionRepository.delete(permissionId);
      fetchPermissions(page, pagination.limit);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Gagal menghapus permission');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Permissions</h1>
          <p className="text-gray-600 mt-1">Kelola data permissions sistem</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          + Tambah Permission
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
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deskripsi
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {permissions.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    permissions.map((permission) => (
                      <tr key={permission.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{permission.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">{permission.description || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-primary-600 hover:text-primary-900 mr-3"
                            onClick={() => openEditModal(permission)}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(permission.id)}
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

            {pagination.total > permissions.length && (
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
                  disabled={permissions.length < pagination.limit}
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
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {modalMode === 'create' ? 'Tambah Permission' : 'Edit Permission'}
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Nama Permission</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="input-field"
                  placeholder="Contoh: absensi.create"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Deskripsi</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  className="input-field"
                  placeholder="Deskripsi permission"
                />
              </div>
              <div className="mt-2 flex justify-end gap-2">
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

export default Permissions;
