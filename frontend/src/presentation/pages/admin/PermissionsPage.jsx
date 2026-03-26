import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../../domain/hooks';
import PermissionRepository from '../../../data/repositories/PermissionRepository';
import { formatErrorMessage, formatErrorForAlert } from '../../../utils/errorHandler';

// Warna badge per modul (prefix sebelum titik pertama)
const MODULE_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-green-100 text-green-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-teal-100 text-teal-800',
  'bg-indigo-100 text-indigo-800',
  'bg-orange-100 text-orange-800',
  'bg-cyan-100 text-cyan-800',
  'bg-pink-100 text-pink-800',
];
const moduleColorMap = {};
let colorIdx = 0;
const getModuleColor = (mod) => {
  if (!moduleColorMap[mod]) {
    moduleColorMap[mod] = MODULE_COLORS[colorIdx % MODULE_COLORS.length];
    colorIdx++;
  }
  return moduleColorMap[mod];
};

// ACTION_LABELS: tampilkan label ramah untuk aksi umum
const ACTION_LABELS = {
  read:   { label: 'Lihat',   cls: 'bg-gray-100 text-gray-600' },
  create: { label: 'Tambah',  cls: 'bg-green-100 text-green-700' },
  update: { label: 'Edit',    cls: 'bg-yellow-100 text-yellow-700' },
  delete: { label: 'Hapus',   cls: 'bg-red-100 text-red-700' },
  export: { label: 'Export',  cls: 'bg-blue-100 text-blue-700' },
  import: { label: 'Import',  cls: 'bg-indigo-100 text-indigo-700' },
  approve:{ label: 'Approve', cls: 'bg-teal-100 text-teal-700' },
};
const getActionBadge = (action) => ACTION_LABELS[action?.toLowerCase()] ?? { label: action, cls: 'bg-gray-100 text-gray-500' };

const LIMIT = 20;

const Permissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchTimer = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({ name: '', description: '' });

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const fetchPermissions = useCallback(async (pageNum, searchVal) => {
    setLoading(true);
    setError('');
    try {
      const response = await PermissionRepository.getAll(pageNum, LIMIT, searchVal);
      const items = response?.data?.items || [];
      setPermissions(items);
      setTotal(response?.data?.total ?? items.length);
    } catch (err) {
      setError(formatErrorMessage(err, 'Gagal memuat data permissions', user));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPermissions(page, search);
  }, [page, search, fetchPermissions]);

  // Debounce search input
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      setSearch(val);
    }, 350);
  };

  const resetForm = () => { setFormData({ name: '', description: '' }); setEditingId(null); setFormError(''); };
  const openCreateModal = () => { resetForm(); setModalMode('create'); setIsModalOpen(true); };
  const openEditModal = (p) => { setFormData({ name: p.name || '', description: p.description || '' }); setEditingId(p.id); setModalMode('edit'); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setFormLoading(false); setFormError(''); };

  useEffect(() => {
    if (!isModalOpen) return;
    const handle = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isModalOpen]);

  const handleFormChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const payload = { name: formData.name, description: formData.description || null };
      if (modalMode === 'create') await PermissionRepository.create(payload);
      else if (modalMode === 'edit' && editingId) await PermissionRepository.update(editingId, payload);
      closeModal();
      fetchPermissions(page, search);
    } catch (err) {
      setFormError(formatErrorMessage(err, 'Gagal menyimpan permission', user));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus permission ini?')) return;
    try {
      await PermissionRepository.delete(id);
      fetchPermissions(page, search);
    } catch (err) {
      alert(formatErrorForAlert(formatErrorMessage(err, 'Gagal menghapus permission', user)));
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap gap-3 justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔑 Permissions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Master hak akses sistem — total <strong>{total}</strong> permission</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>+ Tambah Permission</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {/* Search bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-4 flex gap-3 items-center">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Cari nama permission… (contoh: absensi, roster)"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {searchInput && (
          <button
            onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border rounded"
          >
            ✕ Reset
          </button>
        )}
        <span className="text-xs text-gray-400 whitespace-nowrap">{total} hasil</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-sm text-gray-500">Memuat…</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Modul</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Permission</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deskripsi</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Kelola</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {permissions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-gray-400 text-sm">
                        {search ? `Tidak ada permission yang cocok dengan "${search}"` : 'Tidak ada data'}
                      </td>
                    </tr>
                  ) : (
                    permissions.map((p, idx) => {
                      const parts = (p.name || '').split('.');
                      const module = parts[0] || '';
                      const action = parts.length > 1 ? parts[parts.length - 1] : '';
                      const midParts = parts.length > 2 ? parts.slice(1, -1).join('.') : '';
                      const { label: actionLabel, cls: actionCls } = getActionBadge(action);
                      const rowNum = (page - 1) * LIMIT + idx + 1;
                      return (
                        <tr key={p.id} className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50/30' : 'bg-gray-50/50 hover:bg-blue-50/30'}>
                          <td className="px-4 py-3 text-gray-400 text-xs">{rowNum}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getModuleColor(module)}`}>
                              {module}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono text-xs text-gray-700 font-medium">{p.name}</span>
                              {midParts && <span className="text-xs text-gray-400">{midParts}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {action && (
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${actionCls}`}>
                                {actionLabel}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{p.description || <span className="text-gray-300">—</span>}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => openEditModal(p)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium mr-3"
                            >✏️ Edit</button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium"
                            >🗑 Hapus</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > 0 && (
              <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-gray-500">
                  Menampilkan <strong>{(page - 1) * LIMIT + 1}</strong>–<strong>{Math.min(page * LIMIT, total)}</strong> dari <strong>{total}</strong> permission
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="px-2 py-1 text-xs border rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >«</button>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-xs border rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >‹ Prev</button>

                  {/* Nomor halaman */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                    .reduce((acc, n, i, arr) => {
                      if (i > 0 && n - arr[i - 1] > 1) acc.push('…');
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((n, i) =>
                      n === '…' ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-xs">…</span>
                      ) : (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`px-2.5 py-1 text-xs border rounded font-medium ${
                            n === page
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >{n}</button>
                      )
                    )}

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1 text-xs border rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >Next ›</button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                    className="px-2 py-1 text-xs border rounded text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >»</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-6">
          <div className="mx-auto w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create' ? '+ Tambah Permission' : '✏️ Edit Permission'}
              </h2>
              <button className="text-gray-400 hover:text-gray-600 text-xl leading-none" onClick={closeModal}>✕</button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
            )}

            <form onSubmit={handleSubmitForm} className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Permission</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="input-field font-mono text-sm"
                  placeholder="modul.sub.aksi  (contoh: absensi.create)"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  className="input-field text-sm"
                  placeholder="Deskripsi singkat permission ini"
                />
              </div>
              <div className="flex justify-end gap-2 mt-1">
                <button type="button" className="btn-secondary" onClick={closeModal}>Batal</button>
                <button type="submit" className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed" disabled={formLoading}>
                  {formLoading ? 'Menyimpan…' : '💾 Simpan'}
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
