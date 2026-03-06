import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../domain/hooks';
import { useRosterUploadBatch } from '../../../domain/hooks';
import { formatErrorMessage, formatErrorForAlert } from '../../../utils/errorHandler';

const STATUS_CONFIG = {
  UPLOADED:  { label: 'Uploaded',  cls: 'bg-gray-100 text-gray-700' },
  VALIDATED: { label: 'Validated', cls: 'bg-blue-100 text-blue-800' },
  IMPORTED:  { label: 'Imported',  cls: 'bg-green-100 text-green-800' },
  FAILED:    { label: 'Failed',    cls: 'bg-red-100 text-red-800' },
};

const fmtDate = (v) => (v ? new Date(v).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }) : '-');

const RosterUploadBatchPage = () => {
  const { user } = useAuth();
  const {
    batches,
    loading,
    error,
    pagination,
    fetchBatches,
    importExcel,
    downloadTemplate,
    deleteBatch,
  } = useRosterUploadBatch();

  const [page, setPage] = useState(1);

  /* Upload modal state */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedByPegawai, setUploadedByPegawai] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [importResult, setImportResult] = useState(null); // { batch, result }
  const fileInputRef = useRef(null);

  /* Download state */
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchBatches(page, 20);
  }, [page, fetchBatches]);

  /* Esc to close modal */
  useEffect(() => {
    if (!isModalOpen) return;
    const onEsc = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isModalOpen]);

  /* ── Template download ──────────────────────────────────── */
  const handleDownloadTemplate = async () => {
    try {
      setDownloading(true);
      const blob = await downloadTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'roster_template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(formatErrorForAlert(formatErrorMessage(err, 'Gagal mengunduh template', user)));
    } finally {
      setDownloading(false);
    }
  };

  /* ── Upload modal ───────────────────────────────────────── */
  const openModal = () => {
    setSelectedFile(null);
    setUploadedByPegawai('');
    setUploadError('');
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setUploading(false);
    setUploadError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadError('');
  };

  const handleImport = async (e) => {
    e.preventDefault();
    setUploadError('');

    if (!selectedFile) {
      setUploadError('Pilih file Excel (.xlsx atau .xlsm) terlebih dahulu.');
      return;
    }
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xlsm'].includes(ext)) {
      setUploadError('Format file tidak valid. Hanya .xlsx dan .xlsm yang diterima.');
      return;
    }

    setUploading(true);
    setImportResult(null);
    try {
      const data = await importExcel(selectedFile, uploadedByPegawai || null);
      const result = data?.data ?? data;
      setImportResult(result); // { batch, result }
      fetchBatches(1, 20);
      setPage(1);
    } catch (err) {
      setUploadError(formatErrorMessage(err, 'Gagal mengimpor roster', user));
    } finally {
      setUploading(false);
    }
  };

  /* ── Delete ─────────────────────────────────────────────── */
  const handleDelete = async (batch) => {
    if (!window.confirm(`Hapus batch "${batch.file_name}"?`)) return;
    try {
      await deleteBatch(batch.id);
      fetchBatches(page, 20);
    } catch (err) {
      alert(formatErrorForAlert(formatErrorMessage(err, 'Gagal menghapus batch', user)));
    }
  };

  /* ── Pagination ─────────────────────────────────────────── */
  const totalPages = pagination.limit > 0 ? Math.ceil(pagination.total / pagination.limit) : 1;

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Roster Upload</h1>
          <p className="text-sm text-gray-500 mt-1">
            Import jadwal shift pegawai dari file Excel
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={downloading}
            className="btn-secondary w-full sm:w-auto"
          >
            {downloading ? '⏳ Mengunduh...' : '📥 Download Template'}
          </button>
          <button type="button" onClick={openModal} className="btn-primary w-full sm:w-auto">
            📤 Upload Roster
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['File', 'Status', 'Periode', 'Total Baris', 'Valid', 'Invalid', 'Diupload Oleh', 'Tanggal Upload', 'Aksi'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Belum ada riwayat upload roster.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const statusCfg = STATUS_CONFIG[batch.upload_status] ?? STATUS_CONFIG.UPLOADED;
                  return (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 max-w-[200px] truncate" title={batch.file_name}>
                          {batch.file_name}
                        </p>
                        <p className="text-xs text-gray-400 font-mono truncate max-w-[200px]" title={batch.id}>
                          {batch.id}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {batch.period_start ?? '-'} → {batch.period_end ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">{batch.total_rows ?? 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-green-700">{batch.valid_rows ?? 0}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${(batch.invalid_rows ?? 0) > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                          {batch.invalid_rows ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {batch.uploaded_by_nama ?? batch.uploaded_by_pegawai ?? <span className="italic text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(batch.created_at)}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <button type="button" onClick={() => handleDelete(batch)} className="text-red-600 hover:text-red-800 font-medium">Hapus</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Total: <span className="font-medium">{pagination.total}</span> batch
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">{page} / {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Upload Roster Excel</h2>
              <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">

              {/* Import result panel */}
              {importResult && (
                <div className={`rounded-lg border p-4 ${importResult.batch?.upload_status === 'FAILED' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    {importResult.batch?.upload_status === 'IMPORTED' ? '✅' : importResult.batch?.upload_status === 'FAILED' ? '❌' : 'ℹ️'}
                    Hasil Import
                  </h3>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                      <p className="text-xl font-bold text-gray-800">{importResult.batch?.total_rows ?? 0}</p>
                      <p className="text-xs text-gray-500">Total Baris</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                      <p className="text-xl font-bold text-green-700">{importResult.batch?.valid_rows ?? 0}</p>
                      <p className="text-xs text-gray-500">Valid</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                      <p className={`text-xl font-bold ${(importResult.batch?.invalid_rows ?? 0) > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                        {importResult.batch?.invalid_rows ?? 0}
                      </p>
                      <p className="text-xs text-gray-500">Invalid</p>
                    </div>
                  </div>

                  {/* Row errors */}
                  {importResult.result?.errors && importResult.result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-700 mb-2">Detail Error Baris:</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {importResult.result.errors.map((err, i) => (
                          <div key={i} className="text-xs bg-white border border-red-100 rounded px-3 py-1.5">
                            <span className="font-medium text-gray-600">Baris {err.row ?? i + 1}:</span>{' '}
                            <span className="text-red-700">{err.message ?? err.error ?? JSON.stringify(err)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!importResult && (
                <form onSubmit={handleImport} className="space-y-4">
                  {uploadError && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                      {uploadError}
                    </div>
                  )}

                  {/* Info box */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
                    <p className="font-medium mb-1">📋 Ketentuan upload:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs">
                      <li>Format file wajib <strong>.xlsx</strong> atau <strong>.xlsm</strong></li>
                      <li>Header kolom harus sesuai template resmi</li>
                      <li>Duplikasi dan overlap shift akan dideteksi otomatis</li>
                    </ul>
                  </div>

                  {/* File input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      File Excel <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xlsm"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    {selectedFile && (
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  {/* Uploaded by pegawai */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ID Pegawai Pengunggah <span className="text-gray-400 text-xs font-normal">(opsional)</span>
                    </label>
                    <input
                      type="text"
                      value={uploadedByPegawai}
                      onChange={(e) => setUploadedByPegawai(e.target.value)}
                      placeholder="Contoh: P001"
                      className="input-field"
                    />
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={closeModal} className="btn-secondary" disabled={uploading}>
                      Batal
                    </button>
                    <button type="submit" className="btn-primary" disabled={uploading}>
                      {uploading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Mengimpor...
                        </span>
                      ) : 'Import'}
                    </button>
                  </div>
                </form>
              )}

              {importResult && (
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                  <button type="button" onClick={closeModal} className="btn-secondary">Tutup</button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportResult(null);
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="btn-primary"
                  >
                    Upload Lagi
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterUploadBatchPage;
