import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../domain/hooks';
import ApprovalRepository from '../../../data/repositories/ApprovalRepository';
import { formatErrorMessage, formatErrorForAlert } from '../../../utils/errorHandler';

const STATUS_COLOR = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

const TIPE_LABEL = {
  KOREKSI_MASUK: 'Koreksi Masuk',
  KOREKSI_KELUAR: 'Koreksi Keluar',
  MISSING_CHECKIN: 'Missing Check-in',
  MISSING_CHECKOUT: 'Missing Check-out',
  ALASAN_TERLAMBAT: 'Alasan Terlambat',
  ALASAN_PULANG_CEPAT: 'Alasan Pulang Cepat',
};

const LIMIT = 10;

const ApprovalPage = () => {
  const { user } = useAuth();

  // canDecide → true jika menu_guard.menus.approval.can_decide === true
  const canDecide = !!user?.menu_guard?.menus?.approval?.can_decide;

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

  // --- Decision modal ---
  const [decisionItem, setDecisionItem] = useState(null);
  const [decisionAction, setDecisionAction] = useState('APPROVED');
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState('');

  const fetchAssigned = useCallback(async (page = 1) => {
    try {
      setAssignedLoading(true);
      setAssignedError('');
      const res = await ApprovalRepository.getAssigned((page - 1) * LIMIT, LIMIT);
      setAssigned(res?.data?.items || []);
      setAssignedTotal(res?.data?.total ?? 0);
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
      setMine(res?.data?.items || []);
      setMineTotal(res?.data?.total ?? 0);
    } catch (err) {
      setMineError(formatErrorMessage(err, 'Gagal memuat pengajuan saya', user));
    } finally {
      setMineLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'assigned') fetchAssigned(assignedPage);
  }, [activeTab, assignedPage, fetchAssigned]);

  useEffect(() => {
    if (activeTab === 'mine') fetchMine(minePage);
  }, [activeTab, minePage, fetchMine]);

  // ESC to close decision modal
  useEffect(() => {
    if (!decisionItem) return;
    const handleEsc = (e) => { if (e.key === 'Escape') closeDecisionModal(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [decisionItem]);

  const openDecisionModal = (item) => {
    setDecisionItem(item);
    setDecisionAction('APPROVED');
    setDecisionNote('');
    setDecisionError('');
  };

  const closeDecisionModal = () => {
    setDecisionItem(null);
    setDecisionLoading(false);
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
      closeDecisionModal();
      fetchAssigned(assignedPage);
    } catch (err) {
      setDecisionError(formatErrorMessage(err, 'Gagal memproses keputusan', user));
    } finally {
      setDecisionLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  const renderTable = (items, showDecideBtn, total, page, setPage, loading, errorMsg, onRetry) => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {errorMsg && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 px-4 py-3 flex items-center gap-2">
          {errorMsg}
          <button onClick={onRetry} className="underline text-sm ml-2">Coba lagi</button>
        </div>
      )}
      {loading ? (
        <div className="p-10 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-500">Memuat...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center text-gray-500">Tidak ada data</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'Pegawai', 'Tipe', 'Tanggal Target', 'Alasan', 'Status', showDecideBtn ? 'Aksi' : null]
                  .filter(Boolean)
                  .map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{item.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.id_pegawai}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{TIPE_LABEL[item.tipe_pengajuan] || item.tipe_pengajuan}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatDate(item.target_tanggal)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-[180px] truncate" title={item.alasan}>{item.alasan}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLOR[item.status_pengajuan] || 'bg-gray-100 text-gray-700'}`}>
                      {item.status_pengajuan}
                    </span>
                  </td>
                  {showDecideBtn && (
                    <td className="px-4 py-3">
                      {item.status_pengajuan === 'PENDING' ? (
                        <button
                          onClick={() => openDecisionModal(item)}
                          className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                        >
                          Putuskan
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Selesai</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > LIMIT && (
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Halaman {page} dari {Math.ceil(total / LIMIT)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={items.length < LIMIT}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Approval Absensi</h1>
        <p className="text-gray-600 mt-1">Kelola pengajuan koreksi dan alasan kehadiran</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {canDecide && (
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'assigned'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ✅ Antrian Saya ({assignedTotal})
          </button>
        )}
        <button
          onClick={() => setActiveTab('mine')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'mine'
              ? 'border-b-2 border-primary-500 text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 Pengajuan Saya ({mineTotal})
        </button>
      </div>

      {activeTab === 'assigned' &&
        renderTable(
          assigned,
          canDecide,
          assignedTotal,
          assignedPage,
          setAssignedPage,
          assignedLoading,
          assignedError,
          () => fetchAssigned(assignedPage)
        )}

      {activeTab === 'mine' &&
        renderTable(
          mine,
          false,
          mineTotal,
          minePage,
          setMinePage,
          mineLoading,
          mineError,
          () => fetchMine(minePage)
        )}

      {/* Decision Modal */}
      {decisionItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-6">
          <div className="mx-auto w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[calc(100vh-3rem)] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Putuskan Pengajuan #{decisionItem.id}</h2>
              <button className="text-gray-400 hover:text-gray-600" onClick={closeDecisionModal}>✕</button>
            </div>

            <div className="mb-4 bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <p><span className="font-medium">Pegawai:</span> {decisionItem.id_pegawai}</p>
              <p><span className="font-medium">Tipe:</span> {TIPE_LABEL[decisionItem.tipe_pengajuan] || decisionItem.tipe_pengajuan}</p>
              <p><span className="font-medium">Tanggal:</span> {formatDate(decisionItem.target_tanggal)}</p>
              <p><span className="font-medium">Alasan:</span> {decisionItem.alasan}</p>
            </div>

            {decisionError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
                {decisionError}
              </div>
            )}

            <form onSubmit={handleDecide} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Keputusan</label>
                <select
                  value={decisionAction}
                  onChange={(e) => setDecisionAction(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                >
                  <option value="APPROVED">✅ Setujui</option>
                  <option value="REJECTED">❌ Tolak</option>
                  <option value="CANCELLED">🚫 Batalkan</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Catatan (opsional)</label>
                <textarea
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="Catatan untuk pegawai..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeDecisionModal} className="btn-secondary" disabled={decisionLoading}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={decisionLoading}>
                  {decisionLoading ? 'Memproses...' : 'Konfirmasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalPage;
