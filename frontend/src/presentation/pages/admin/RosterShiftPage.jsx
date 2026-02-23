import { useState, useEffect, useCallback } from 'react';
import { useRosterShift } from '../../../domain/hooks';
import PegawaiSearchInput from '../../components/common/PegawaiSearchInput';
import UnitSearchInput from '../../components/common/UnitSearchInput';
import apiClient from '../../../data/api/client';

const JENIS_SHIFT_OPTIONS = ['PAGI', 'SORE', 'MALAM', 'ON_CALL', 'CUSTOM'];
const STATUS_ROSTER_OPTIONS = ['AKTIF', 'BATAL', 'DIUBAH'];

const STATUS_COLORS = {
  AKTIF: 'bg-green-100 text-green-800',
  BATAL: 'bg-red-100 text-red-800',
  DIUBAH: 'bg-yellow-100 text-yellow-800',
};

const JENIS_COLORS = {
  PAGI: 'bg-blue-100 text-blue-800',
  SORE: 'bg-orange-100 text-orange-800',
  MALAM: 'bg-indigo-100 text-indigo-800',
  ON_CALL: 'bg-purple-100 text-purple-800',
  CUSTOM: 'bg-gray-100 text-gray-800',
};

const emptyForm = {
  id_pegawai: '',
  pegawai_nama: '',
  shift_kelompok_id: '',
  id_unit: '',
  tanggal_shift: '',
  jam_mulai: '',
  jam_selesai: '',
  jenis_shift: 'PAGI',
  nomor_sesi: 1,
  grace_telat_override_menit: '',
  toleransi_pulang_cepat_override_menit: '',
  status_roster: 'AKTIF',
  catatan: '',
};

const formatDatetime = (isoStr) => {
  if (!isoStr) return '-';
  try {
    return new Date(isoStr).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
};

// Convert ISO datetime → datetime-local input value (YYYY-MM-DDTHH:mm)
const toDatetimeLocal = (isoStr) => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
};

const RosterShiftPage = () => {
  const { shifts, loading, error, pagination, fetchShifts, createShift, updateShift, deleteShift } = useRosterShift();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [shiftKelompokList, setShiftKelompokList] = useState([]);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const totalPages = Math.ceil(pagination.total / pageSize) || 1;

  // Fetch shift kelompok options once
  useEffect(() => {
    apiClient.get('/shift-kelompok/', { params: { skip: 0, limit: 500 } })
      .then(res => {
        const items = res.data?.data?.items ?? res.data?.items ?? [];
        setShiftKelompokList(items);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchShifts(page, pageSize);
  }, [fetchShifts, page, pageSize]);

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  }, []);

  const openEdit = useCallback((item) => {
    setEditTarget(item);
    setForm({
      id_pegawai: item.id_pegawai ?? '',
      pegawai_nama: item.pegawai_nama ?? '',
      shift_kelompok_id: item.shift_kelompok_id ?? '',
      id_unit: item.id_unit ?? '',
      tanggal_shift: item.tanggal_shift ?? '',
      jam_mulai: toDatetimeLocal(item.jam_mulai),
      jam_selesai: toDatetimeLocal(item.jam_selesai),
      jenis_shift: item.jenis_shift ?? 'PAGI',
      nomor_sesi: item.nomor_sesi ?? 1,
      grace_telat_override_menit: item.grace_telat_override_menit ?? '',
      toleransi_pulang_cepat_override_menit: item.toleransi_pulang_cepat_override_menit ?? '',
      status_roster: item.status_roster ?? 'AKTIF',
      catatan: item.catatan ?? '',
    });
    setFormError('');
    setShowModal(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.id_pegawai) { setFormError('ID Pegawai wajib diisi'); return; }
    if (!form.tanggal_shift) { setFormError('Tanggal shift wajib diisi'); return; }
    if (!form.jam_mulai) { setFormError('Jam mulai wajib diisi'); return; }
    if (!form.jam_selesai) { setFormError('Jam selesai wajib diisi'); return; }

    setSaving(true);
    setFormError('');
    try {
      const payload = {
        id_pegawai: form.id_pegawai,
        shift_kelompok_id: form.shift_kelompok_id !== '' ? Number(form.shift_kelompok_id) : null,
        id_unit: form.id_unit !== '' ? Number(form.id_unit) : null,
        tanggal_shift: form.tanggal_shift,
        jam_mulai: new Date(form.jam_mulai).toISOString(),
        jam_selesai: new Date(form.jam_selesai).toISOString(),
        jenis_shift: form.jenis_shift,
        nomor_sesi: Number(form.nomor_sesi) || 1,
        grace_telat_override_menit: form.grace_telat_override_menit !== '' ? Number(form.grace_telat_override_menit) : null,
        toleransi_pulang_cepat_override_menit: form.toleransi_pulang_cepat_override_menit !== '' ? Number(form.toleransi_pulang_cepat_override_menit) : null,
        status_roster: form.status_roster,
        catatan: form.catatan || null,
      };

      if (editTarget) {
        await updateShift(editTarget.id, payload);
      } else {
        await createShift(payload);
      }
      setShowModal(false);
      fetchShifts(page, pageSize);
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  }, [form, editTarget, createShift, updateShift, fetchShifts, page, pageSize]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteShift(confirmDelete.id);
      setConfirmDelete(null);
      fetchShifts(page, pageSize);
    } catch (err) {
      alert(err?.response?.data?.message || 'Gagal menghapus data');
    } finally {
      setDeleting(false);
    }
  }, [confirmDelete, deleteShift, fetchShifts, page, pageSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🗓️ Roster Shift</h1>
          <p className="text-gray-500 text-sm mt-1">Jadwal shift resmi pegawai</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          + Tambah Roster
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600">ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Pegawai</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Unit</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Kelompok</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tanggal</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Jam Mulai</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Jam Selesai</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Jenis</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Sesi</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">Memuat data...</td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-400">Belum ada data roster shift</td>
                </tr>
              ) : (
                shifts.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.pegawai_nama || '-'}</div>
                      <div className="text-xs text-gray-400">{item.id_pegawai}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.unit_nama || (item.id_unit ? `ID ${item.id_unit}` : '-')}</td>
                    <td className="px-4 py-3 text-gray-700">{item.shift_kelompok_nama || (item.shift_kelompok_id ? `ID ${item.shift_kelompok_id}` : '-')}</td>
                    <td className="px-4 py-3 text-gray-700">{item.tanggal_shift || '-'}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{formatDatetime(item.jam_mulai)}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{formatDatetime(item.jam_selesai)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${JENIS_COLORS[item.jenis_shift] || 'bg-gray-100 text-gray-800'}`}>
                        {item.jenis_shift}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.nomor_sesi}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status_roster] || 'bg-gray-100 text-gray-800'}`}>
                        {item.status_roster}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDelete(item)}
                          className="px-3 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Total: {pagination.total} data</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              &laquo; Prev
            </button>
            <span className="px-2">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              Next &raquo;
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editTarget ? 'Edit Roster Shift' : 'Tambah Roster Shift'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">{formError}</div>
              )}

              {/* Pegawai */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pegawai <span className="text-red-500">*</span></label>
                <PegawaiSearchInput
                  value={form.id_pegawai}
                  displayValue={form.pegawai_nama}
                  onChange={(pegawai) => setForm(f => ({ ...f, id_pegawai: pegawai?.id_pegawai ?? '', pegawai_nama: pegawai?.nama ?? '' }))}
                  placeholder="Cari pegawai..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Shift Kelompok */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shift Kelompok</label>
                  <select
                    value={form.shift_kelompok_id}
                    onChange={e => setForm(f => ({ ...f, shift_kelompok_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  >
                    <option value="">— Tidak ada —</option>
                    {shiftKelompokList.map(sk => (
                      <option key={sk.id} value={sk.id}>{sk.kode} – {sk.nama}</option>
                    ))}
                  </select>
                </div>
                {/* Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <UnitSearchInput
                    value={form.id_unit}
                    onChange={(unit) => setForm(f => ({ ...f, id_unit: unit?.id_unit ?? '' }))}
                    placeholder="Pilih unit..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Tanggal Shift */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Shift <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={form.tanggal_shift}
                    onChange={e => setForm(f => ({ ...f, tanggal_shift: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                {/* Jam Mulai */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jam Mulai <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={form.jam_mulai}
                    onChange={e => setForm(f => ({ ...f, jam_mulai: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                {/* Jam Selesai */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jam Selesai <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={form.jam_selesai}
                    onChange={e => setForm(f => ({ ...f, jam_selesai: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Jenis Shift */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Shift</label>
                  <select
                    value={form.jenis_shift}
                    onChange={e => setForm(f => ({ ...f, jenis_shift: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  >
                    {JENIS_SHIFT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                {/* Nomor Sesi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Sesi</label>
                  <input
                    type="number"
                    min={1}
                    value={form.nomor_sesi}
                    onChange={e => setForm(f => ({ ...f, nomor_sesi: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                {/* Status Roster */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Roster</label>
                  <select
                    value={form.status_roster}
                    onChange={e => setForm(f => ({ ...f, status_roster: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  >
                    {STATUS_ROSTER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Grace Telat Override */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grace Telat Override (menit)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.grace_telat_override_menit}
                    onChange={e => setForm(f => ({ ...f, grace_telat_override_menit: e.target.value }))}
                    placeholder="Default dari aturan"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                {/* Toleransi Pulang Cepat Override */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tol. Pulang Cepat Override (menit)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.toleransi_pulang_cepat_override_menit}
                    onChange={e => setForm(f => ({ ...f, toleransi_pulang_cepat_override_menit: e.target.value }))}
                    placeholder="Default dari aturan"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={form.catatan}
                  onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
                  placeholder="Catatan opsional..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Konfirmasi Hapus</h3>
            <p className="text-sm text-gray-600">
              Yakin hapus roster shift ID <strong>{confirmDelete.id}</strong> untuk pegawai{' '}
              <strong>{confirmDelete.pegawai_nama || confirmDelete.id_pegawai}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterShiftPage;
