import { useEffect, useMemo, useState } from 'react';
import { useRoles } from '../../../domain/hooks';
import { useAuth } from '../../../domain/hooks';
import PermissionRepository from '../../../data/repositories/PermissionRepository';
import { formatErrorMessage, formatErrorForAlert } from '../../../utils/errorHandler';

const Roles = () => {
  const { user } = useAuth();
  const {
    roles,
    loading,
    error,
    pagination,
    fetchRoles,
    createRole,
    updateRole,
    deleteRole
  } = useRoles();
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [permissionOptions, setPermissionOptions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState('');
  const [pendingPermissionNames, setPendingPermissionNames] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permission_ids: []
  });

  useEffect(() => {
    fetchRoles(page, 10);
  }, [page, fetchRoles]);

  useEffect(() => {
    if (!isModalOpen) return;

    const loadPermissions = async () => {
      setPermissionsLoading(true);
      setPermissionsError('');

      try {
        const response = await PermissionRepository.getAll(1, 200);
        const list = response?.data?.permissions || response?.data?.items || [];
        setPermissionOptions(list);
      } catch (err) {
        const errorMessage = formatErrorMessage(err, 'Gagal memuat permissions', user);
        setPermissionsError(errorMessage);
      } finally {
        setPermissionsLoading(false);
      }
    };

    loadPermissions();
  }, [isModalOpen]);

  useEffect(() => {
    if (pendingPermissionNames.length === 0 || permissionOptions.length === 0) return;

    const resolvedIds = permissionOptions
      .filter((perm) => pendingPermissionNames.includes(perm.name))
      .map((perm) => perm.id);

    setFormData((prev) => ({ ...prev, permission_ids: resolvedIds }));
    setPendingPermissionNames([]);
  }, [pendingPermissionNames, permissionOptions]);

  const permissionIdSet = useMemo(() => new Set(formData.permission_ids), [formData.permission_ids]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permission_ids: []
    });
    setEditingId(null);
    setFormError('');
    setPendingPermissionNames([]);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = (role) => {
    setFormData({
      name: role.name || '',
      description: role.description || '',
      permission_ids: []
    });
    setPendingPermissionNames(role.permissions || []);
    setEditingId(role.id);
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

  const togglePermission = (permissionId) => {
    setFormData((prev) => {
      const exists = prev.permission_ids.includes(permissionId);
      return {
        ...prev,
        permission_ids: exists
          ? prev.permission_ids.filter((id) => id !== permissionId)
          : [...prev.permission_ids, permissionId]
      };
    });
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        permission_ids: formData.permission_ids
      };

      if (modalMode === 'create') {
        await createRole(payload);
      } else if (modalMode === 'edit' && editingId) {
        await updateRole(editingId, payload);
      }

      closeModal();
      fetchRoles(page, 10);
    } catch (err) {
      const errorMessage = formatErrorMessage(err, 'Gagal menyimpan role', user);
      setFormError(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (roleId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus role ini?')) return;

    try {
      await deleteRole(roleId);
      fetchRoles(page, 10);
    } catch (err) {
      const errorMessage = formatErrorMessage(err, 'Gagal menghapus role', user);
      alert(formatErrorForAlert(errorMessage));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles</h1>
          <p className="text-gray-600 mt-1">Kelola data roles sistem</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          + Tambah Role
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permissions
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roles.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    roles.map((role) => (
                      <tr key={role.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{role.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">{role.description || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-600">
                            {role.permissions?.length ? role.permissions.join(', ') : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-primary-600 hover:text-primary-900 mr-3"
                            onClick={() => openEditModal(role)}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(role.id)}
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

            {pagination.total > roles.length && (
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
                  disabled={roles.length < pagination.limit}
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
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {modalMode === 'create' ? 'Tambah Role' : 'Edit Role'}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nama Role</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="input-field"
                    placeholder="Nama role"
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
                    placeholder="Deskripsi role"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Permissions</label>
                {permissionsLoading && <p className="text-sm text-gray-500">Memuat permissions...</p>}
                {permissionsError && <p className="text-sm text-red-600">{permissionsError}</p>}
                {!permissionsLoading && permissionOptions.length === 0 && (
                  <p className="text-sm text-gray-500">Tidak ada data permission.</p>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {permissionOptions.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={permissionIdSet.has(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>{perm.name}</span>
                    </label>
                  ))}
                </div>
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

export default Roles;
