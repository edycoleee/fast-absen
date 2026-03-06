import { useState, useEffect, useCallback } from 'react';
import { usePenilaianShiftAbsensi, useAuth } from '../../../domain/hooks';
import { formatErrorMessage, formatErrorForAlert } from '../../../utils/errorHandler';
import PegawaiSearchInput from '../../components/common/PegawaiSearchInput';
import UnitSearchInput from '../../components/common/UnitSearchInput';

const STATUS_FINAL_COLORS = {
  TEPAT_WAKTU: 'bg-green-100 text-green-800',
  TERLAMBAT: 'bg-yellow-100 text-yellow-800',
  PULANG_CEPAT: 'bg-orange-100 text-orange-800',
  MANGKIR: 'bg-red-100 text-red-800',
  IZIN: 'bg-blue-100 text-blue-800',
  SAKIT: 'bg-purple-100 text-purple-800',
  CUTI: 'bg-indigo-100 text-indigo-800',
  LEMBUR: 'bg-teal-100 text-teal-800',
};

const formatDt = (isoStr) => {
  if (!isoStr) return '-';
  try {
    return new Date(isoStr).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return isoStr; }
};

const toDatetimeLocal = (isoStr) => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch { return ''; }
};

const emptyForm = {
  roster_shift_id: '',
  id_pegawai: '',
  pegawai_nama: '',
  matched_absensi_id: '',
  checkin_aktual: '',
  checkout_aktual: '',
  menit_telat: 0,
  menit_pulang_cepat: 0,
  menit_lembur: 0,
  status_final: '',
  is_manual_override: false,
  override_reason: '',
  approved_by_pegawai: '',
};

const emptyEvalForm = {
  start_date: '',
  end_date: '',
  id_unit: '',
  id_pegawai: '',
  pegawai_nama: '',
  force_recalculate: false,
};

const PenilaianShiftAbsensiPage = () => {
  const { user } = useAuth();
  const {
    penilaian, loading, error, pagination,
    fetchPenilaian, createPenilaian, updatePenilaian, deletePenilaian, evaluate,
  } = usePenilaianShiftAbsensi();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const totalPages = Math.ceil(pagination.total / pageSize) || 1;

  // CRUD modal
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Evaluate modal
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalForm, setEvalForm] = useState(emptyEvalForm);
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [evalError, setEvalError] = useState('');

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPenilaian(page, pageSize);
  }, [fetchPenilaian, page, pageSize]);

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  }, []);

  const openEdit = useCallback((item) => {
    setEditTarget(item);
    setForm({
      roster_shift_id: item.roster_shift_id ?? '',
      id_pegawai: item.id_pegawai ?? '',
      pegawai_nama: item.pegawai_nama ?? '',
      matched_absensi_id: item.matched_absensi_id ?? '',
      checkin_aktual: toDatetimeLocal(item.checkin_aktual),
      checkout_aktual: toDatetimeLocal(item.checkout_aktual),
      menit_telat: item.menit_telat ?? 0,
      menit_pulang_cepat: item.menit_pulang_cepat ?? 0,
      menit_lembur: item.menit_lembur ?? 0,
      status_final: item.status_final ?? '',
      is_manual_override: item.is_manual_override ?? false,
      override_reason: item.override_reason ?? '',
      approved_by_pegawai: item.approved_by_pegawai ?? '',
    });
    setFormError('');
    setShowModal(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.roster_shift_id) { setFormError('Roster Shift ID wajib diisi'); return; }
    if (!form.id_pegawai) { setFormError('Pegawai wajib diisi'); return; }
    if (!form.status_final) { setFormError('Status Final wajib diisi'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        roster_shift_id: Number(form.roster_shift_id),
        id_pegawai: form.id_pegawai,
        matched_absensi_id: form.matched_absensi_id !== '' ? Number(form.matched_absensi_id) : null,
        checkin_aktual: form.checkin_aktual ? new Date(form.checkin_aktual).toISOString() : null,
        checkout_aktual: form.checkout_aktual ? new Date(form.checkout_aktual).toISOString() : null,
        menit_telat: Number(form.menit_telat) || 0,
        menit_pulang_cepat: Number(form.menit_pulang_cepat) || 0,
        menit_lembur: Number(form.menit_lembur) || 0,
        status_final: form.status_final,
        is_manual_override: form.is_manual_override,
        override_reason: form.override_reason || null,
        approved_by_pegawai: form.approved_by_pegawai || null,
      };
      if (editTarget) {
        await updatePenilaian(editTarget.id, payload);
      } else {
        await createPenilaian(payload);
      }
      setShowModal(false);
      fetchPenilaian(page, pageSize);
    } catch (err) {
      setFormError(formatErrorMessage(err, 'Gagal menyimpan penilaian', user));
    } finally {
      setSaving(false);
    }
  }, [form, editTarget, createPenilaian, updatePenilaian, fetchPenilaian, page, pageSize, user]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deletePenilaian(confirmDelete.id);
      setConfirmDelete(null);
      fetchPenilaian(page, pageSize);
    } catch (err) {
      alert(formatErrorForAlert(formatErrorMessage(err, 'Gagal menghapus penilaian', user)));
    } finally {
      setDeleting(false);
    }
  }, [confirmDelete, deletePenilaian, fetchPenilaian, page, pageSize, user]);

  const openEvalModal = useCallback(() => {
    setEvalForm(emptyEvalForm);
    setEvalResult(null);
    setEvalError('');
    setShowEvalModal(true);
  }, []);

  const handleEvaluate = useCallback(async () => {
    setEvaluating(true);
    setEvalError('');
    try {
      const params = {
        start_date: evalForm.start_date || null,
        end_date: evalForm.end_date || null,
        id_unit: evalForm.id_unit !== '' ? Number(evalForm.id_unit) : null,
        id_pegawai: evalForm.id_pegawai || null,
        force_recalculate: evalForm.force_recalculate,
      };
      const res = await evaluate(params);
      const result = res?.data ?? res;
      setEvalResult(result);
      fetchPenilaian(page, pageSize);
    } catch (err) {
      setEvalError(formatErrorMessage(err, 'Gagal menjalankan evaluasi', user));
    } finally {
      setEvaluating(false);
    }
  }, [evalForm, evaluate, fetchPenilaian, page, pageSize, user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⚖️ Penilaian Shift Absensi</h1>
          <p className="text-gray-500 text-sm mt-1">Hasil evaluasi roster vs kehadiran aktual</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openEvalModal}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            ▶ Jalankan Evaluasi
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            + Tambah Manual
          </button>
        </div>
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
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tgl Shift</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Check-in</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Check-out</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Telat</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Pulang Cepat</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Lembur</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Override</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">Memuat data...</td>
                </tr>
              ) : penilaian.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-400">Belum ada data penilaian shift absensi</td>
                </tr>
              ) : (
                penilaian.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.pegawai_nama || '-'}</div>
                      <div className="text-xs text-gray-400">{item.id_pegawai}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      <div>{item.roster_tanggal_shift || '-'}</div>
                      {item.roster_status && (
                        <div className="text-gray-400">{item.roster_status}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{formatDt(item.checkin_aktual)}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{formatDt(item.checkout_aktual)}</td>
                    <td className="px-4 py-3 text-center">
                      {item.menit_telat > 0
                        ? <span className="text-yellow-700 font-medium">{item.menit_telat}m</span>
                        : <span className="text-gray-400">-</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.menit_pulang_cepat > 0
                        ? <span className="text-orange-700 font-medium">{item.menit_pulang_cepat}m</span>
                        : <span className="text-gray-400">-</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.menit_lembur > 0
                        ? <span className="text-teal-700 font-medium">{item.menit_lembur}m</span>
                        : <span className="text-gray-400">-</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_FINAL_COLORS[item.status_final] || 'bg-gray-100 text-gray-800'}`}>
                        {item.status_final || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.is_manual_override ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800" title={item.override_reason || ''}>
                          Override
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Auto</span>
                      )}
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
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              &laquo; Prev
            </button>
            <span className="px-2">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              Next &raquo;
            </button>
          </div>
        </div>
      </div>

      {/* ====== EVALUATE MODAL ====== */}
      {showEvalModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">▶ Jalankan Evaluasi Shift</h2>
              <button onClick={() => setShowEvalModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              {!evalResult ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Evaluasi membandingkan data roster shift dengan kehadiran aktual (absensi) dalam rentang tanggal yang dipilih.
                  </p>

                  {evalError && (
                    <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">{evalError}</div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                      <input type="date" value={evalForm.start_date}
                        onChange={e => setEvalForm(f => ({ ...f, start_date: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
                      <input type="date" value={evalForm.end_date}
                        onChange={e => setEvalForm(f => ({ ...f, end_date: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit (opsional)</label>
                    <UnitSearchInput
                      value={evalForm.id_unit}
                      onChange={(id) => setEvalForm(f => ({ ...f, id_unit: id ?? '' }))}
                      placeholder="Semua unit..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pegawai (opsional)</label>
                    <PegawaiSearchInput
                      value={evalForm.id_pegawai}
                      displayValue={evalForm.pegawai_nama}
                      onChange={(id, nama) => setEvalForm(f => ({ ...f, id_pegawai: id ?? '', pegawai_nama: nama ?? '' }))}
                      placeholder="Semua pegawai..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="force_recalculate"
                      type="checkbox"
                      checked={evalForm.force_recalculate}
                      onChange={e => setEvalForm(f => ({ ...f, force_recalculate: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600"
                    />
                    <label htmlFor="force_recalculate" className="text-sm text-gray-700">
                      Force recalculate (lewati record yang sudah ada)
                    </label>
                  </div>
                </div>
              ) : (
                /* Evaluate Result */
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-emerald-800 font-semibold mb-3">✅ Evaluasi selesai</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white rounded p-3 border border-emerald-100">
                        <p className="text-gray-500 text-xs">Total Roster</p>
                        <p className="text-2xl font-bold text-gray-900">{evalResult.total_roster ?? 0}</p>
                      </div>
                      <div className="bg-white rounded p-3 border border-emerald-100">
                        <p className="text-gray-500 text-xs">Dievaluasi</p>
                        <p className="text-2xl font-bold text-emerald-700">{evalResult.evaluated_count ?? 0}</p>
                      </div>
                      <div className="bg-white rounded p-3 border border-emerald-100">
                        <p className="text-gray-500 text-xs">Dibuat Baru</p>
                        <p className="text-2xl font-bold text-blue-700">{evalResult.created_count ?? 0}</p>
                      </div>
                      <div className="bg-white rounded p-3 border border-emerald-100">
                        <p className="text-gray-500 text-xs">Diperbarui</p>
                        <p className="text-2xl font-bold text-yellow-700">{evalResult.updated_count ?? 0}</p>
                      </div>
                      <div className="bg-white rounded p-3 border border-emerald-100">
                        <p className="text-gray-500 text-xs">Dilewati (Manual)</p>
                        <p className="text-2xl font-bold text-amber-700">{evalResult.skipped_manual_override ?? 0}</p>
                      </div>
                      <div className="bg-white rounded p-3 border border-emerald-100">
                        <p className="text-gray-500 text-xs">Dilewati (Exist)</p>
                        <p className="text-2xl font-bold text-gray-600">{evalResult.skipped_existing ?? 0}</p>
                      </div>
                    </div>
                    {(evalResult.failed_count ?? 0) > 0 && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-red-700 font-medium text-sm mb-2">⚠️ Gagal: {evalResult.failed_count} record</p>
                        <ul className="space-y-1 max-h-40 overflow-y-auto">
                          {(evalResult.failures || []).map((f, i) => (
                            <li key={i} className="text-xs text-red-600 bg-white rounded px-2 py-1 border border-red-100">
                              {typeof f === 'string' ? f : JSON.stringify(f)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setEvalResult(null); setEvalError(''); }}
                    className="w-full py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    ← Evaluasi Lagi
                  </button>
                </div>
              )}
            </div>

            {!evalResult && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={() => setShowEvalModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Batal
                </button>
                <button onClick={handleEvaluate} disabled={evaluating}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                  {evaluating ? 'Mengevaluasi...' : '▶ Jalankan'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== CREATE/EDIT MODAL ====== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editTarget ? 'Edit Penilaian Shift' : 'Tambah Penilaian Manual'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">{formError}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Roster Shift ID <span className="text-red-500">*</span></label>
                  <input type="number" min={1} value={form.roster_shift_id}
                    onChange={e => setForm(f => ({ ...f, roster_shift_id: e.target.value }))}
                    placeholder="ID roster shift..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Absensi ID (matched)</label>
                  <input type="number" min={1} value={form.matched_absensi_id}
                    onChange={e => setForm(f => ({ ...f, matched_absensi_id: e.target.value }))}
                    placeholder="ID absensi..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pegawai <span className="text-red-500">*</span></label>
                <PegawaiSearchInput
                  value={form.id_pegawai}
                  displayValue={form.pegawai_nama}
                  onChange={(id, nama) => setForm(f => ({ ...f, id_pegawai: id ?? '', pegawai_nama: nama ?? '' }))}
                  placeholder="Cari pegawai..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Aktual</label>
                  <input type="datetime-local" value={form.checkin_aktual}
                    onChange={e => setForm(f => ({ ...f, checkin_aktual: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Aktual</label>
                  <input type="datetime-local" value={form.checkout_aktual}
                    onChange={e => setForm(f => ({ ...f, checkout_aktual: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Menit Telat</label>
                  <input type="number" min={0} value={form.menit_telat}
                    onChange={e => setForm(f => ({ ...f, menit_telat: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Menit Pulang Cepat</label>
                  <input type="number" min={0} value={form.menit_pulang_cepat}
                    onChange={e => setForm(f => ({ ...f, menit_pulang_cepat: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Menit Lembur</label>
                  <input type="number" min={0} value={form.menit_lembur}
                    onChange={e => setForm(f => ({ ...f, menit_lembur: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status Final <span className="text-red-500">*</span></label>
                <input type="text" value={form.status_final}
                  onChange={e => setForm(f => ({ ...f, status_final: e.target.value }))}
                  placeholder="TEPAT_WAKTU / TERLAMBAT / MANGKIR / ..."
                  list="status-final-list"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                <datalist id="status-final-list">
                  {['TEPAT_WAKTU','TERLAMBAT','PULANG_CEPAT','MANGKIR','IZIN','SAKIT','CUTI','LEMBUR'].map(s => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              {/* Manual Override section */}
              <div className="border border-amber-200 rounded-lg p-4 bg-amber-50 space-y-3">
                <div className="flex items-center gap-2">
                  <input id="is_manual_override" type="checkbox" checked={form.is_manual_override}
                    onChange={e => setForm(f => ({ ...f, is_manual_override: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600" />
                  <label htmlFor="is_manual_override" className="text-sm font-medium text-amber-800">
                    Manual Override
                  </label>
                </div>
                {form.is_manual_override && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Override</label>
                      <textarea rows={2} value={form.override_reason}
                        onChange={e => setForm(f => ({ ...f, override_reason: e.target.value }))}
                        placeholder="Alasan perubahan manual..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Disetujui oleh (ID Pegawai)</label>
                      <input type="text" value={form.approved_by_pegawai}
                        onChange={e => setForm(f => ({ ...f, approved_by_pegawai: e.target.value }))}
                        placeholder="ID pegawai penyetuju..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Konfirmasi Hapus</h3>
            <p className="text-sm text-gray-600">
              Yakin hapus penilaian ID <strong>{confirmDelete.id}</strong> untuk pegawai{' '}
              <strong>{confirmDelete.pegawai_nama || confirmDelete.id_pegawai}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                Batal
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PenilaianShiftAbsensiPage;
