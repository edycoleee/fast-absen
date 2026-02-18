import { useState, useEffect, useMemo } from 'react';
import { useUsers } from '../../../domain/hooks';
import { useAuth } from '../../../domain/hooks';
import PegawaiRepository from '../../../data/repositories/PegawaiRepository';
import RoleRepository from '../../../data/repositories/RoleRepository';
import { formatErrorMessage, formatErrorForAlert } from '../../../utils/errorHandler';

const Users = () => {
  const { user } = useAuth();
  const {
    users,
    loading,
    error,
    pagination,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser
  } = useUsers();
  const [page, setPage] = useState(1);
  const [pegawaiOptions, setPegawaiOptions] = useState([]);
  const [pegawaiLoading, setPegawaiLoading] = useState(false);
  const [pegawaiError, setPegawaiError] = useState('');
  const [roleOptions, setRoleOptions] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState('');
  const [pendingRoleNames, setPendingRoleNames] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    id_pegawai: '',
    is_active: true,
    role_ids: []
  });

  useEffect(() => {
    fetchUsers(page, 10);
  }, [page, fetchUsers]);

  useEffect(() => {
    if (!isModalOpen) return;

    const loadPegawaiOptions = async () => {
      setPegawaiLoading(true);
      setPegawaiError('');

      try {
        const response = await PegawaiRepository.getAll(1, 1000, '');
        const list = response?.data?.pegawai || response?.data?.items || [];
        setPegawaiOptions(list);
      } catch (err) {
        const errorMessage = formatErrorMessage(err, 'Gagal memuat daftar pegawai', user);
        setPegawaiError(errorMessage);
      } finally {
        setPegawaiLoading(false);
      }
    };

    const loadRoleOptions = async () => {
      setRolesLoading(true);
      setRolesError('');

      try {
        const response = await RoleRepository.getAll(1, 100);
        const list = response?.data?.items || [];
        setRoleOptions(list);
      } catch (err) {
        const errorMessage = formatErrorMessage(err, 'Gagal memuat daftar roles', user);
        setRolesError(errorMessage);
      } finally {
        setRolesLoading(false);
      }
    };

    loadPegawaiOptions();
    loadRoleOptions();
  }, [isModalOpen]);

  useEffect(() => {
    if (pendingRoleNames.length === 0 || roleOptions.length === 0) return;

    const resolvedIds = roleOptions
      .filter((role) => pendingRoleNames.includes(role.name))
      .map((role) => role.id);

    setFormData((prev) => ({ ...prev, role_ids: resolvedIds }));
    setPendingRoleNames([]);
  }, [pendingRoleNames, roleOptions]);

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;
    
    try {
      await deleteUser(id);
      fetchUsers(page, 10);
    } catch (err) {
      const errorMessage = formatErrorMessage(err, 'Gagal menghapus user', user);
      alert(formatErrorForAlert(errorMessage));
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      id_pegawai: '',
      is_active: true,
      role_ids: []
    });
    setEditingId(null);
    setFormError('');
    setPendingRoleNames([]);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setFormData({
      username: user.username || '',
      password: '',
      id_pegawai: user.id_pegawai || '',
      is_active: user.is_active ?? true,
      role_ids: []
    });
    setPendingRoleNames(user.roles || []);
    setEditingId(user.id);
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

  const roleSelection = useMemo(() => new Set(formData.role_ids), [formData.role_ids]);

  const buildPayload = () => {
    const payload = {
      username: formData.username,
      id_pegawai: formData.id_pegawai || null,
      is_active: formData.is_active
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    if (formData.role_ids.length > 0) {
      payload.role_ids = formData.role_ids;
    }

    return payload;
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const payload = buildPayload();

      if (modalMode === 'create') {
        if (!payload.password) {
          setFormError('Password wajib diisi untuk membuat user baru.');
          setFormLoading(false);
          return;
        }
        await createUser(payload);
      } else if (modalMode === 'edit' && editingId) {
        await updateUser(editingId, payload);
      }

      closeModal();
      fetchUsers(page, 10);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Gagal menyimpan data user');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleRole = (roleId) => {
    setFormData((prev) => {
      const next = new Set(prev.role_ids);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }

      return {
        ...prev,
        role_ids: Array.from(next)
      };
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">Kelola data pengguna sistem</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          + Tambah User
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
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Active
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{user.username}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded">
                            {user.roles?.[0] || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            user.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-primary-600 hover:text-primary-900 mr-3"
                            onClick={() => openEditModal(user)}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(user.id)}
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
            {pagination.total > users.length && (
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
                  disabled={users.length < pagination.limit}
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
                {modalMode === 'create' ? 'Tambah User' : 'Edit User'}
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
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleFormChange('username', e.target.value)}
                  className="input-field"
                  placeholder="Username"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Password {modalMode === 'edit' && <span className="text-xs text-gray-500">(opsional)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleFormChange('password', e.target.value)}
                  className="input-field"
                  placeholder="Minimal 6 karakter"
                  required={modalMode === 'create'}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">ID Pegawai</label>
                <select
                  value={formData.id_pegawai}
                  onChange={(e) => handleFormChange('id_pegawai', e.target.value)}
                  className="input-field"
                >
                  <option value="">Pilih pegawai (kosongkan untuk admin)</option>
                  {pegawaiOptions.map((pegawai) => (
                    <option key={pegawai.id_pegawai} value={pegawai.id_pegawai}>
                      {pegawai.nama || 'Tanpa nama'} ({pegawai.id_pegawai})
                    </option>
                  ))}
                </select>
                {pegawaiLoading && <p className="mt-1 text-xs text-gray-500">Memuat pegawai...</p>}
                {pegawaiError && <p className="mt-1 text-xs text-red-600">{pegawaiError}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">Roles</label>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                  {rolesLoading && (
                    <p className="text-sm text-gray-500">Memuat roles...</p>
                  )}
                  {rolesError && (
                    <p className="text-sm text-red-600">{rolesError}</p>
                  )}
                  {!rolesLoading && !rolesError && roleOptions.length === 0 && (
                    <p className="text-sm text-gray-500">Belum ada role tersedia.</p>
                  )}
                  {!rolesLoading && !rolesError && roleOptions.length > 0 && roleOptions.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={roleSelection.has(role.id)}
                        onChange={() => toggleRole(role.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">Pilih satu atau lebih role yang sesuai.</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleFormChange('is_active', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
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

export default Users;
