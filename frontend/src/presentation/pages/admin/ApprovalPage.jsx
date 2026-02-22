import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../domain/hooks';
import ApprovalRepository from '../../../data/repositories/ApprovalRepository';
import { formatErrorMessage } from '../../../utils/errorHandler';

const STATUS_COLOR = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

const ACTION_COLOR = {
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
  REVISED: 'bg-yellow-100 text-yellow-800',
};

const TIPE_OPTIONS = [
  'KOREKSI_MASUK',
  'KOREKSI_KELUAR',
  'MISSING_CHECKIN',
  'MISSING_CHECKOUT',
  'ALASAN_TERLAMBAT',
  'ALASAN_PULANG_CEPAT',
];

const TIPE_LABEL = {
  KOREKSI_MASUK: 'Koreksi Masuk',
  KOREKSI_KELUAR: 'Koreksi Keluar',
  MISSING_CHECKIN: 'Missing Check-in',
  MISSING_CHECKOUT: 'Missing Check-out',
  ALASAN_TERLAMBAT: 'Alasan Terlambat',
  ALASAN_PULANG_CEPAT: 'Alasan Pulang Cepat',
};

const LIMIT = 20;

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const formatDt = (d) =>
  d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

const ApprovalPage = () => {
  const { user } = useAuth();
  const canDecide = !!user?.menu_guard?.menus?.approval?.can_decide;
  const isAdmin = !!user?.menu_guard?.is_admin;

  const [activeTab, setActiveTab] = useState(canDecide ? 'assigned' : 'mine');

  // --- Assigned queue ---
  const [assigned, setAssigned] = useState([]);
  const [assignedTotal, setAssignedTotal] = useState(0);
  const [assignedPage, setAssignedPage] = useState(1);
  const [assignedLoading, setAssignedLoading] = useState(false);
  const [assignedError, setAssignedError] = useState('');

  // --- Mine submissions ---
  const [mine, setMine] = useState([]);
  const [mineTotal, setMineTotal] = useState(0);
  const [minePage, setMinePage] = useState(1);
  const [mineLoading, setMineLoading] = useState(false);
  const [mineError, setMineError] = useState('');

  // --- Audit logs ---
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditFilter, setAuditFilter] = useState({ start_date: '', end_date: '', action_type: '', pengajuan_id: '' });

  // --- Decision modal ---
  const [decisionItem, setDecisionItem] = useState(null);
  const [decisionAction, setDecisionAction] = useState('APPROVED');
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState('');

  // --- Create modal ---
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ tipe_pengajuan: 'KOREKSI_MASUK', target_tanggal: '', alasan: '', roster_shift_id: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // --- Per-pengajuan log modal ---
  const [logItem, setLogItem] = useState(null);
  const [logEntries, setLogEntries] = useState([]);
  const [logLoading, setLogLoading] = useState(false);

  const fetchAssigned = useCallback(async (page = 1) => {
    try {
      setAssignedLoading(true);
      setAssignedError('');
      const res = await ApprovalRepository.getAssigned((page - 1) * LIMIT, LIMIT);
      setAssigned(res?.data?.items ?? res?.items ?? []);
      setAssignedTotal(res?.data?.total ?? res?.total ?? 0);
    } catch (err) {
      setAssignedError(formatErrorMessage(err, 'Gagal memuat antrian approval', user));
    } finally {
      setAssignedLoading(false);
    }
  }, [user]);

  const fetchMine = useCallback(async (page = 1) => {
    try {
      setMineLoading(true);
      setMineError('');
      const res = await ApprovalRepository.getMine((page - 1) * LIMIT, LIMIT);
      setMine(res?.data?.items ?? res?.items ?? []);
      setMineTotal(res?.data?.total ?? res?.total ?? 0);
    } catch (err) {
      setMineError(formatErrorMessage(err, 'Gagal memuat pengajuan saya', user));
    } finally {
      setMineLoading(false);
    }
  }, [user]);

  const fetchAuditLogs = useCallback(async (page = 1, filter = auditFilter) => {
    try {
      setAuditLoading(true);
      setAuditError('');
      const res = await ApprovalRepository.getAllLogs({
        start_date: filter.start_date || undefined,
        end_date: filter.end_date || undefined,
        action_type: filter.action_type || undefined,
        pengajuan_id: filter.pengajuan_id ? Number(filter.pengajuan_id) : undefined,
        skip: (page - 1) * LIMIT,
        limit: LIMIT,
      });
      setAuditLogs(res?.data?.items ?? res?.items ?? []);
      setAuditTotal(res?.data?.total ?? res?.total ?? 0);
    } catch (err) {
      setAuditError(formatErrorMessage(err, 'Gagal memuat audit log', user));
    } finally {
      setAuditLoading(false);
    }
  }, [user, auditFilter]);

  useEffect(() => {
    if (activeTab === 'assigned') fetchAssigned(assignedPage);
  }, [activeTab, assignedPage, fetchAssigned]);

  useEffect(() => {
    if (activeTab === 'mine') fetchMine(minePage);
  }, [activeTab, minePage, fetchMine]);

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditLogs(auditPage);
  }, [activeTab, auditPage, fetchAuditLogs]);

  useEffect(() => {
    if (!decisionItem && !logItem) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') { setDecisionItem(null); setLogItem(null); }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [decisionItem, logItem]);

  const openDecisionModal = (item) => {
    setDecisionItem(item);
    setDecisionAction('APPROVED');
    setDecisionNote('');
    setDecisionError('');
  };

  const handleDecide = async (e) => {
    e.preventDefault();
    setDecisionLoading(true);
    setDecisionError('');
    try {
      await ApprovalRepository.decide(decisionItem.id, {
        action: decisionAction,
        catatan_approval: decisionNote || null,
      });
      setDecisionItem(null);
      fetchAssigned(assignedPage);
    } catch (err) {
      setDecisionError(formatErrorMessage(err, 'Gagal memproses keputusan', user));
    } finally {
      setDecisionLoading(false);
    }
  };

  const openLogModal = async (item) => {
    setLogItem(item);
    setLogEntries([]);
    setLogLoading(true);
    try {
      const res = await ApprovalRepository.getLogs(item.id);
      setLogEntries(res?.data?.items ?? res?.items ?? []);
    } catch {
      setLogEntries([]);
    } finally {
      setLogLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.target_tanggal) { setCreateError('Tanggal wajib diisi'); return; }
    if (!createForm.alasan.trim()) { setCreateError('Alasan wajib diisi'); return; }
    setCreateLoading(true);
    setCreateError('');
    try {
      await ApprovalRepository.create({
        tipe_pengajuan: createForm.tipe_pengajuan,
        target_tanggal: createForm.target_tanggal,
        alasan: createForm.alasan,
        roster_shift_id: createForm.roster_shift_id ? Number(createForm.roster_shift_id) : null,
      });
      setShowCreate(false);
      setCreateForm({ tipe_pengajuan: 'KOREKSI_MASUK', target_tanggal: '', alasan: '', roster_shift_id: '' });
      fetchMine(minePage);
      setActiveTab('mine');
    } catch (err) {
      setCreateError(formatErrorMessage(err, 'Gagal membuat pengajuan', user));
    } finally {
      setCreateLoading(false);
    }
  };

  const renderTable = (items, showDecideBtn, total, page, setPage, loading, errorMsg, onRetry) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {errorMsg && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 px-4 py-3 flex items-center gap-2 text-sm">
          {errorMsg}
          <button onClick={onRetry} className="underline ml-2">Coba lagi</button>
        </div>
      )}
      {loading ? (
        <div className="p-10 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Memuat...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center text-gray-400 text-sm">Tidak ada data</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['ID', 'Pegawai', 'Tipe', 'Tanggal Target', 'Alasan', 'Status', 'Aksi'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.id_pegawai}</td>
                  <td className="px-4 py-3 text-gray-700">{TIPE_LABEL[item.tipe_pengajuan] || item.tipe_pengajuan}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(item.target_tanggal)}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate" title={item.alasan}>{item.alasan}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLOR[item.status_pengajuan] || 'bg-gray-100 text-gray-700'}`}>
                      {item.status_pengajuan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {showDecideBtn && item.status_pengajuan === 'PENDING' && (
                        <button
                          onClick={() => openDecisionModal(item)}
                          className="px-3 py-1 text-xs bg-primary-50 text-primary-700 rounded hover:bg-primary-100 transition-colors"
                        >
                          Putuskan
                        </button>
                      )}
                      <button
                        onClick={() => openLogModal(item)}
                        className="px-3 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
                      >
                        Log
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {total > LIMIT && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Total: {total} data</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              &laquo; Prev
            </button>
            <span>{page} / {Math.ceil(total / LIMIT)}</span>
            <button disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              Next &raquo;
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">✅ Approval Absensi</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola pengajuan koreksi dan alasan kehadiran</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(''); }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          + Buat Pengajuan
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {canDecide && (
          <button onClick={() => setActiveTab('assigned')}
            className={`px-5 py-3 font-medium text-sm transition-colors ${activeTab === 'assigned' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
            Antrian Saya {assignedTotal > 0 && <span className="ml-1 bg-primary-100 text-primary-700 rounded-full px-2 py-0.5 text-xs">{assignedTotal}</span>}
          </button>
        )}
        <button onClick={() => setActiveTab('mine')}
          className={`px-5 py-3 font-medium text-sm transition-colors ${activeTab === 'mine' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
          Pengajuan Saya {mineTotal > 0 && <span className="ml-1 bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs">{mineTotal}</span>}
        </button>
        {isAdmin && (
          <button onClick={() => setActiveTab('audit')}
            className={`px-5 py-3 font-medium text-sm transition-colors ${activeTab === 'audit' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
            Audit Log
          </button>
        )}
      </div>

      {/* Assigned */}
      {activeTab === 'assigned' && renderTable(
        assigned, canDecide, assignedTotal, assignedPage, setAssignedPage,
        assignedLoading, assignedError, () => fetchAssigned(assignedPage)
      )}

      {/* Mine */}
      {activeTab === 'mine' && renderTable(
        mine, false, mineTotal, minePage, setMinePage,
        mineLoading, mineError, () => fetchMine(minePage)
      )}

      {/* Audit Log */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Mulai</label>
                <input type="date" value={auditFilter.start_date}
                  onChange={e => setAuditFilter(f => ({ ...f, start_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Selesai</label>
                <input type="date" value={auditFilter.end_date}
                  onChange={e => setAuditFilter(f => ({ ...f, end_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipe Aksi</label>
                <select value={auditFilter.action_type}
                  onChange={e => setAuditFilter(f => ({ ...f, action_type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                  <option value="">Semua</option>
                  {['SUBMITTED','APPROVED','REJECTED','CANCELLED','REVISED'].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ID Pengajuan</label>
                <input type="number" min={1} value={auditFilter.pengajuan_id}
                  onChange={e => setAuditFilter(f => ({ ...f, pengajuan_id: e.target.value }))}
                  placeholder="Semua"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={() => { setAuditPage(1); fetchAuditLogs(1, auditFilter); }}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                Terapkan Filter
              </button>
            </div>
          </div>

          {/* Log table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {auditError && (
              <div className="bg-red-50 border-b border-red-200 text-red-700 px-4 py-3 text-sm">{auditError}</div>
            )}
            {auditLoading ? (
              <div className="p-10 text-center text-gray-500 text-sm">Memuat audit log...</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">Tidak ada audit log</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['ID Log', 'Pengajuan ID', 'Pelaku', 'Aksi', 'Catatan', 'Waktu'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.id}</td>
                        <td className="px-4 py-3 text-gray-700">{log.pengajuan_id}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{log.action_by_nama || '-'}</div>
                          <div className="text-xs text-gray-400">{log.action_by_pegawai}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${ACTION_COLOR[log.action_type] || 'bg-gray-100 text-gray-700'}`}>
                            {log.action_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={log.catatan}>{log.catatan || '-'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDt(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {auditTotal > LIMIT && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <span>Total: {auditTotal} log</span>
                <div className="flex items-center gap-2">
                  <button disabled={auditPage <= 1} onClick={() => setAuditPage(p => p - 1)}
                    className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">&laquo; Prev</button>
                  <span>{auditPage} / {Math.ceil(auditTotal / LIMIT)}</span>
                  <button disabled={auditPage >= Math.ceil(auditTotal / LIMIT)} onClick={() => setAuditPage(p => p + 1)}
                    className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next &raquo;</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== CREATE MODAL ====== */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Buat Pengajuan Absensi</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-4 space-y-4">
              {createError && (
                <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">{createError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Pengajuan <span className="text-red-500">*</span></label>
                <select value={createForm.tipe_pengajuan}
                  onChange={e => setCreateForm(f => ({ ...f, tipe_pengajuan: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                  {TIPE_OPTIONS.map(t => (
                    <option key={t} value={t}>{TIPE_LABEL[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Target <span className="text-red-500">*</span></label>
                <input type="date" value={createForm.target_tanggal}
                  onChange={e => setCreateForm(f => ({ ...f, target_tanggal: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roster Shift ID (opsional)</label>
                <input type="number" min={1} value={createForm.roster_shift_id}
                  onChange={e => setCreateForm(f => ({ ...f, roster_shift_id: e.target.value }))}
                  placeholder="ID roster shift terkait..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alasan <span className="text-red-500">*</span></label>
                <textarea rows={3} value={createForm.alasan}
                  onChange={e => setCreateForm(f => ({ ...f, alasan: e.target.value }))}
                  placeholder="Tuliskan alasan pengajuan..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Batal
                </button>
                <button type="submit" disabled={createLoading}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  {createLoading ? 'Mengirim...' : 'Kirim Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== DECISION MODAL ====== */}
      {decisionItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Putuskan Pengajuan #{decisionItem.id}</h2>
              <button onClick={() => setDecisionItem(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <p><span className="font-medium">Pegawai:</span> {decisionItem.id_pegawai}</p>
              <p><span className="font-medium">Tipe:</span> {TIPE_LABEL[decisionItem.tipe_pengajuan] || decisionItem.tipe_pengajuan}</p>
              <p><span className="font-medium">Tanggal:</span> {formatDate(decisionItem.target_tanggal)}</p>
              <p><span className="font-medium">Alasan:</span> {decisionItem.alasan}</p>
            </div>
            {decisionError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{decisionError}</div>
            )}
            <form onSubmit={handleDecide} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keputusan</label>
                <select value={decisionAction} onChange={(e) => setDecisionAction(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                  <option value="APPROVED">✅ Setujui</option>
                  <option value="REJECTED">❌ Tolak</option>
                  <option value="CANCELLED">🚫 Batalkan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
                <textarea value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                  placeholder="Catatan untuk pegawai..." />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setDecisionItem(null)} disabled={decisionLoading}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Batal
                </button>
                <button type="submit" disabled={decisionLoading}
                  className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  {decisionLoading ? 'Memproses...' : 'Konfirmasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== PER-PENGAJUAN LOG MODAL ====== */}
      {logItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Log Pengajuan #{logItem.id}</h2>
              <button onClick={() => setLogItem(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {logLoading ? (
                <p className="text-center text-gray-500 py-8">Memuat log...</p>
              ) : logEntries.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Belum ada log untuk pengajuan ini</p>
              ) : (
                <ul className="space-y-3">
                  {logEntries.map(log => (
                    <li key={log.id} className="flex gap-3">
                      <div className="mt-1 w-2 h-2 rounded-full bg-primary-400 flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${ACTION_COLOR[log.action_type] || 'bg-gray-100 text-gray-700'}`}>
                            {log.action_type}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{log.action_by_nama || log.action_by_pegawai || '-'}</span>
                          <span className="text-xs text-gray-400">{formatDt(log.created_at)}</span>
                        </div>
                        {log.catatan && <p className="text-sm text-gray-600 mt-1">{log.catatan}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200">
              <button onClick={() => setLogItem(null)}
                className="w-full py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalPage;
