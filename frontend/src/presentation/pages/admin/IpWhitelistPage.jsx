import { useEffect, useState, useCallback } from 'react';
import IpWhitelistRepository from '../../../data/repositories/IpWhitelistRepository';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM = { ip_address: '', label: '', is_active: true };

const Badge = ({ active }) =>
  active ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
      ✅ Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
      ⛔ Nonaktif
    </span>
  );

// ─────────────────────────────────────────────────────────────────────────────
// Modal Form
// ─────────────────────────────────────────────────────────────────────────────

const FormModal = ({ mode, form, setForm, onSave, onClose, saving, error }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        {mode === 'add' ? '➕ Tambah IP Whitelist' : '✏️ Edit IP Whitelist'}
      </h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            IP Address / CIDR <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Contoh: 192.168.1.10 atau 192.168.1.0/24"
            value={form.ip_address}
            onChange={(e) => setForm((f) => ({ ...f, ip_address: e.target.value }))}
          />
          <p className="mt-1 text-xs text-gray-400">
            Bisa berupa IP tunggal atau rentang CIDR (misalnya 10.0.0.0/8)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Keterangan / Label <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Contoh: WiFi RS Lantai 1"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="is_active"
            type="checkbox"
            className="w-4 h-4 text-blue-600 rounded border-gray-300"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
            Aktif (digunakan untuk validasi absensi)
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={saving}
          className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Batal
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirm Modal
// ─────────────────────────────────────────────────────────────────────────────

const DeleteModal = ({ item, onConfirm, onClose, deleting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">🗑️ Hapus IP Whitelist</h2>
      <p className="text-sm text-gray-600 mb-1">
        Hapus <strong>{item?.ip_address}</strong> dari whitelist?
      </p>
      <p className="text-xs text-gray-400 mb-6">
        Setelah dihapus, IP ini tidak akan bisa digunakan untuk absensi.
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={deleting}
          className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Batal
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? 'Menghapus...' : 'Ya, Hapus'}
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

const IpWhitelistPage = () => {
  const [items,    setItems]   = useState([]);
  const [total,    setTotal]   = useState(0);
  const [loading,  setLoading] = useState(true);
  const [alert,    setAlert]   = useState(null);

  // Modal state
  const [modalMode,  setModalMode]  = useState(null); // 'add' | 'edit' | null
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [formError,  setFormError]  = useState(null);
  const [saving,     setSaving]     = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await IpWhitelistRepository.getAll(0, 200);
      setItems(res?.data?.items ?? []);
      setTotal(res?.data?.total ?? 0);
    } catch (err) {
      showAlert('error', err?.response?.data?.detail ?? 'Gagal memuat data IP whitelist.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Alert helper ───────────────────────────────────────────────────────────
  const showAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  // ── Add / Edit ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditTarget(null);
    setModalMode('add');
  };

  const openEdit = (item) => {
    setForm({ ip_address: item.ip_address, label: item.label, is_active: item.is_active });
    setFormError(null);
    setEditTarget(item);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditTarget(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!form.ip_address.trim()) { setFormError('IP Address wajib diisi.'); return; }
    if (!form.label.trim())      { setFormError('Label wajib diisi.'); return; }

    setSaving(true);
    setFormError(null);
    try {
      if (modalMode === 'add') {
        await IpWhitelistRepository.create(form);
        showAlert('success', `IP '${form.ip_address}' berhasil ditambahkan.`);
      } else {
        await IpWhitelistRepository.update(editTarget.id, form);
        showAlert('success', `IP '${form.ip_address}' berhasil diperbarui.`);
      }
      closeModal();
      fetchData();
    } catch (err) {
      setFormError(err?.response?.data?.detail ?? 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const openDelete = (item) => setDeleteTarget(item);
  const closeDelete = () => setDeleteTarget(null);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await IpWhitelistRepository.remove(deleteTarget.id);
      showAlert('success', `IP '${deleteTarget.ip_address}' berhasil dihapus.`);
      closeDelete();
      fetchData();
    } catch (err) {
      showAlert('error', err?.response?.data?.detail ?? 'Gagal menghapus IP.');
      closeDelete();
    } finally {
      setDeleting(false);
    }
  };

  // ── Toggle aktif ───────────────────────────────────────────────────────────
  const toggleActive = async (item) => {
    try {
      await IpWhitelistRepository.update(item.id, { is_active: !item.is_active });
      showAlert('success', `Status IP '${item.ip_address}' diperbarui.`);
      fetchData();
    } catch (err) {
      showAlert('error', err?.response?.data?.detail ?? 'Gagal memperbarui status.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">🛡️ IP Whitelist Absensi</h1>
        <p className="mt-1 text-sm text-gray-500">
          Daftar IP / jaringan yang diizinkan untuk melakukan absensi. Jika daftar kosong, semua IP diperbolehkan.
        </p>
      </div>

      {/* Alert */}
      {alert && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm border ${
            alert.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {alert.msg}
        </div>
      )}

      {/* Info Banner */}
      <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
        💡 <strong>Catatan:</strong> Jika tabel kosong, semua IP boleh absen. Begitu ada satu entri aktif, hanya IP yang terdaftar
        yang dapat melakukan check-in.
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <span className="text-sm text-gray-500">Total: <strong>{total}</strong> entri</span>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          ➕ Tambah IP
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500 text-sm">Memuat data...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Belum ada IP yang didaftarkan. Klik <strong>Tambah IP</strong> untuk mulai.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP / CIDR</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Label</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ditambahkan</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-medium text-gray-800">{item.ip_address}</td>
                    <td className="px-4 py-3 text-gray-600">{item.label}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(item)}
                        title={item.is_active ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                        className="cursor-pointer"
                      >
                        <Badge active={item.is_active} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDelete(item)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {modalMode && (
        <FormModal
          mode={modalMode}
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
          error={formError}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          item={deleteTarget}
          onConfirm={handleDelete}
          onClose={closeDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
};

export default IpWhitelistPage;
