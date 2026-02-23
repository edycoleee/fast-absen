import { useState, useEffect, useMemo } from 'react';
import { useUsers } from '../../../domain/hooks';
import { useAuth } from '../../../domain/hooks';
import PegawaiRepository from '../../../data/repositories/PegawaiRepository';
import RoleRepository from '../../../data/repositories/RoleRepository';
import UserRepository from '../../../data/repositories/UserRepository';
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
  const [search, setSearch] = useState('');
  const [pegawaiOptions, setPegawaiOptions] = useState([]);
  const [pegawaiLoading, setPegawaiLoading] = useState(false);
  const [pegawaiError, setPegawaiError] = useState('');
  const [pegawaiSearch, setPegawaiSearch] = useState('');
  const [pegawaiDropdownOpen, setPegawaiDropdownOpen] = useState(false);
  const [roleOptions, setRoleOptions] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState('');
  const [pendingRoleNames, setPendingRoleNames] = useState([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
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
    fetchUsers(page, 10, search);
  }, [page, search, fetchUsers]);

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

  const handleSearch = (e) => {
    e.preventDefault();
    const nextPage = 1;
    setPage(nextPage);
    fetchUsers(nextPage, 10, search);
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;
    
    try {
      await deleteUser(id);
      fetchUsers(page, 10, search);
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
    setPegawaiSearch('');
    setPegawaiDropdownOpen(false);
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

  const roleSelection = useMemo(() => new Set(formData.role_ids), [formData.role_ids]);

  // Filter pegawai berdasarkan teks pencarian (nama atau id)
  const filteredPegawai = useMemo(() => {
    const q = pegawaiSearch.trim().toLowerCase();
    const list = q
      ? pegawaiOptions.filter(
          (p) =>
            (p.nama || '').toLowerCase().includes(q) ||
            String(p.id_pegawai).toLowerCase().includes(q)
        )
      : pegawaiOptions;
    return list.slice(0, 60);
  }, [pegawaiSearch, pegawaiOptions]);

  // Sinkronkan label tampilan saat mode edit dan pegawaiOptions sudah terisi
  useEffect(() => {
    if (!formData.id_pegawai || pegawaiOptions.length === 0) return;
    const found = pegawaiOptions.find(
      (p) => String(p.id_pegawai) === String(formData.id_pegawai)
    );
    if (found) {
      setPegawaiSearch(`${found.nama || '-'} (${found.id_pegawai})`);
    }
  }, [formData.id_pegawai, pegawaiOptions]);

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
      fetchUsers(page, 10, search);
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
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-green-700 hover:bg-green-50 border border-green-300 bg-white"
            onClick={async () => {
              try {
                const blob = await UserRepository.downloadTemplate();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'template_user.xlsx';
                a.click();
                URL.revokeObjectURL(url);
              } catch (err) {
                alert('Gagal mengunduh template');
              }
            }}
          >
            ↓ Template Excel
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 border border-blue-300 bg-white"
            onClick={() => { setImportOpen(true); setImportFile(null); setImportResult(null); }}
          >
            📂 Import Excel
          </button>
          <button className="btn-primary" onClick={openCreateModal}>
            + Tambah User
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari user (username, nama pegawai)..."
            className="input-field flex-1"
          />
          <button type="submit" className="btn-primary">
            🔍 Cari
          </button>
        </form>
      </div>

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
                      ID / Nama Pegawai
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
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
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
                          {user.id_pegawai ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.pegawai_nama || '-'}</div>
                              <div className="text-xs text-gray-500 font-mono">ID: {user.id_pegawai}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">—</span>
                          )}
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

      {importOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Import User dari Excel</h2>
              <button onClick={() => setImportOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside bg-gray-50 rounded-lg p-4">
                <li>Unduh template Excel dengan tombol <strong>↓ Template Excel</strong></li>
                <li>Isi data sesuai kolom — password default: <code className="bg-gray-200 px-1 rounded">Absen@1234</code></li>
                <li>Kolom <strong>role_names</strong>: nama role dipisah koma, contoh: <code className="bg-gray-200 px-1 rounded">user</code></li>
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
                            <th className="px-3 py-2 text-left text-red-700">Username</th>
                            <th className="px-3 py-2 text-left text-red-700">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100">
                          {importResult.data.errors.map((e, i) => (
                            <tr key={i}>
                              <td className="px-3 py-1.5 text-gray-500">{e.row}</td>
                              <td className="px-3 py-1.5 text-gray-700">{e.username || '-'}</td>
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
                    const result = await UserRepository.importExcel(importFile);
                    setImportResult(result);
                    fetchUsers(page, 10);
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-6">
          <div className="mx-auto w-full max-w-xl rounded-lg bg-white p-6 shadow-xl max-h-[calc(100vh-3rem)] overflow-y-auto">
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
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      value={pegawaiSearch}
                      onChange={(e) => {
                        setPegawaiSearch(e.target.value);
                        handleFormChange('id_pegawai', '');
                        setPegawaiDropdownOpen(true);
                      }}
                      onFocus={() => setPegawaiDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setPegawaiDropdownOpen(false), 150)}
                      className="input-field pr-8"
                      placeholder={pegawaiLoading ? 'Memuat pegawai…' : 'Ketik nama atau ID pegawai…'}
                      autoComplete="off"
                      disabled={pegawaiLoading}
                    />
                    {formData.id_pegawai ? (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-base leading-none"
                        onMouseDown={(e) => { e.preventDefault(); setPegawaiSearch(''); handleFormChange('id_pegawai', ''); }}
                        title="Hapus pilihan"
                      >
                        ✕
                      </button>
                    ) : (
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                    )}
                  </div>

                  {pegawaiDropdownOpen && !pegawaiLoading && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                      {/* Opsi kosong */}
                      <div
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                          !formData.id_pegawai ? 'text-primary-600 font-medium' : 'text-gray-400'
                        }`}
                        onMouseDown={() => {
                          setPegawaiSearch('');
                          handleFormChange('id_pegawai', '');
                          setPegawaiDropdownOpen(false);
                        }}
                      >
                        — Tanpa pegawai (admin murni) —
                      </div>

                      {filteredPegawai.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-gray-400 text-center">Tidak ada hasil</div>
                      ) : (
                        filteredPegawai.map((p) => (
                          <div
                            key={p.id_pegawai}
                            onMouseDown={() => {
                              handleFormChange('id_pegawai', p.id_pegawai);
                              setPegawaiSearch(`${p.nama || '-'} (${p.id_pegawai})`);
                              setPegawaiDropdownOpen(false);
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-primary-50 flex items-center justify-between ${
                              String(formData.id_pegawai) === String(p.id_pegawai)
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-700'
                            }`}
                          >
                            <span className="font-medium truncate">{p.nama || 'Tanpa nama'}</span>
                            <span className="ml-2 shrink-0 text-xs text-gray-400 font-mono">{p.id_pegawai}</span>
                          </div>
                        ))
                      )}

                      {pegawaiOptions.length > 60 && filteredPegawai.length === 60 && (
                        <div className="px-3 py-1.5 text-xs text-gray-400 text-center border-t border-gray-100">
                          Ketik lebih spesifik untuk mempersempit hasil
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {formData.id_pegawai && (
                  <p className="mt-1 text-xs text-green-600">✓ Terpilih: ID {formData.id_pegawai}</p>
                )}
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
