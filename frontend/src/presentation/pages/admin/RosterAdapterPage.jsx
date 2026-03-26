/**
 * Roster Adapter Page
 * Pembuatan jadwal bulanan dengan sistem kode shift (P1, S1, M1, L1, ...).
 * User mendefinisikan kamus kode → jam, lalu mengisi grid pegawai × hari,
 * sistem mengkonversi ke baris roster dan batch-submit ke backend.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../domain/hooks';
import { formatErrorMessage, formatErrorForAlert } from '../../../utils/errorHandler';
import PegawaiSearchInput from '../../components/common/PegawaiSearchInput';
import apiClient from '../../../data/api/client';
import RosterShiftRepository from '../../../data/repositories/RosterShiftRepository';
import KamusPolaShiftRepository from '../../../data/repositories/KamusPolaShiftRepository';
import KamusKodeShiftRepository from '../../../data/repositories/KamusKodeShiftRepository';

// ─── Constants ────────────────────────────────────────────────────────────────

const NAMA_BULAN = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const NAMA_HARI_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

// Warna per entri kamus: libur = abu-abu, aktif = teal
const JENIS_COLOR_MAP = {
  AKTIF:   { bg: 'bg-teal-100',   text: 'text-teal-800',   border: 'border-teal-300' },
  LIBUR:   { bg: 'bg-gray-100',   text: 'text-gray-500',   border: 'border-gray-300' },
};

const DEFAULT_KAMUS = [
  { kode: 'P1', label: 'Pagi 1',  jam_mulai: '07:00', jam_selesai: '14:00', is_libur: false },
  { kode: 'P2', label: 'Pagi 2',  jam_mulai: '07:00', jam_selesai: '11:00', is_libur: false },
  { kode: 'P3', label: 'Pagi 3',  jam_mulai: '07:00', jam_selesai: '12:30', is_libur: false },
  { kode: 'S1', label: 'Sore 1',  jam_mulai: '14:00', jam_selesai: '21:00', is_libur: false },
  { kode: 'M1', label: 'Malam 1', jam_mulai: '21:00', jam_selesai: '07:00', is_libur: false },
  { kode: 'L1', label: 'Libur',   jam_mulai: '',      jam_selesai: '',      is_libur: true  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDaysInMonth = (year, month) => {
  const count = new Date(year, month, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const d = i + 1;
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    return { day: d, dayName: NAMA_HARI_SHORT[dayOfWeek], isSunday: dayOfWeek === 0 };
  });
};

const padTime = (t) => {
  if (!t) return '00:00';
  const [h, m] = t.split(':');
  return `${String(h).padStart(2, '0')}:${String(m || '0').padStart(2, '0')}`;
};

const isLintasTanggal = (jam_mulai, jam_selesai) => {
  if (!jam_mulai || !jam_selesai) return false;
  return padTime(jam_selesai) < padTime(jam_mulai);
};

const buildDatetimeUTC = (year, month, day, timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(year, month - 1, day, h, m, 0, 0);
  return d.toISOString();
};

const buildRosterPayloads = (rows, kamus, tahun, bulan, shiftKelompokId, idUnit) => {
  const payloads = [];
  const kamMap = Object.fromEntries(kamus.map(k => [k.kode, k]));

  for (const row of rows) {
    for (const [dayStr, kode] of Object.entries(row.grid)) {
      if (!kode || !kode.trim()) continue;
      const entry = kamMap[kode];
      if (!entry || entry.is_libur) continue;

      const day = parseInt(dayStr, 10);
      const mulai = entry.jam_mulai;
      const selesai = entry.jam_selesai;
      const lintas = isLintasTanggal(mulai, selesai);

      const selesaiDay = lintas ? day + 1 : day;
      // Guard: if day + 1 overflows the month, skip to avoid invalid date
      const maxDay = new Date(tahun, bulan, 0).getDate();
      if (lintas && day === maxDay) {
        // Allow: selesai is next month day 1
      }

      const jam_mulai_iso = buildDatetimeUTC(tahun, bulan, day, mulai);
      let jam_selesai_iso;
      if (lintas) {
        // Next day: handle month overflow
        const selesaiDate = new Date(tahun, bulan - 1, day + 1);
        jam_selesai_iso = buildDatetimeUTC(
          selesaiDate.getFullYear(),
          selesaiDate.getMonth() + 1,
          selesaiDate.getDate(),
          selesai
        );
      } else {
        jam_selesai_iso = buildDatetimeUTC(tahun, bulan, day, selesai);
      }

      payloads.push({
        id_pegawai: row.id_pegawai,
        shift_kelompok_id: shiftKelompokId ? parseInt(shiftKelompokId) : null,
        id_unit: row.id_unit ? parseInt(row.id_unit) : (idUnit ? parseInt(idUnit) : null),
        tanggal_shift: `${tahun}-${String(bulan).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        jam_mulai: jam_mulai_iso,
        jam_selesai: jam_selesai_iso,
        nomor_sesi: 1,
        status_roster: 'AKTIF',
        catatan: null,
      });
    }
  }
  return payloads;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Badge kode shift di dalam sel grid */
const KodeBadge = ({ kode, kamMap }) => {
  if (!kode) return null;
  const entry = kamMap[kode];
  if (!entry) return <span className="px-1 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">{kode}</span>;
  const colors = entry.is_libur ? JENIS_COLOR_MAP.LIBUR : JENIS_COLOR_MAP.AKTIF;
  return (
    <span className={`px-1 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
      {kode}
    </span>
  );
};

/** Popup pilihan kode untuk satu sel */
const CellPopup = ({ anchorRect, kamus, currentKode, onSelect, onClose }) => {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const top = anchorRect ? anchorRect.bottom + window.scrollY : 0;
  const left = anchorRect ? anchorRect.left + window.scrollX : 0;

  return (
    <div
      ref={ref}
      style={{ position: 'absolute', top, left, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded shadow-lg p-1 flex flex-col gap-0.5 min-w-[80px]"
    >
      <button
        className="text-left text-xs px-2 py-1 rounded hover:bg-gray-100 text-gray-500"
        onClick={() => onSelect('')}
      >
        — Kosong
      </button>
      {kamus.map(k => {
        const colors = k.is_libur ? JENIS_COLOR_MAP.LIBUR : JENIS_COLOR_MAP.AKTIF;
        return (
          <button
            key={k.kode}
            onClick={() => onSelect(k.kode)}
            className={`text-left text-xs px-2 py-1 rounded font-medium border ${colors.bg} ${colors.text} ${colors.border} ${currentKode === k.kode ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
          >
            {k.kode}{k.is_libur ? ' (Libur)' : ` ${k.jam_mulai}–${k.jam_selesai}`}
          </button>
        );
      })}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const RosterAdapterPage = () => {
  const { user } = useAuth();
  const now = new Date();

  // ─ Settings
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [shiftKelompokId, setShiftKelompokId] = useState('');
  const [idUnit, setIdUnit] = useState('');
  const [shiftKelompokList, setShiftKelompokList] = useState([]);

  // ─ Kamus kode
  const [kamus, setKamus] = useState(DEFAULT_KAMUS);
  const [editingKamus, setEditingKamus] = useState(false);
  const [kamEdits, setKamEdits] = useState(DEFAULT_KAMUS);
  const [kamusLoading, setKamusLoading] = useState(false);
  const [kamusSaveError, setKamusSaveError] = useState('');

  // ─ Kamus pola
  const [editingPola, setEditingPola] = useState(false);
  const [polaList, setPolaList] = useState([]);
  const [polaLoading, setPolaLoading] = useState(false);
  const [polaError, setPolaError] = useState('');
  const [polaForm, setPolaForm] = useState(null); // null | { id?, nama, pola, offset_default, deskripsi }
  const [polaSaving, setPolaSaving] = useState(false);

  // ─ Grid rows
  const [rows, setRows] = useState([]);
  const [addPegawai, setAddPegawai] = useState({ id_pegawai: '', nama: '', id_unit: null });

  // ─ Bulk add by unit
  const [unitList, setUnitList] = useState([]);
  const [bulkUnit, setBulkUnit] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // ─ Download template
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // ─ Upload Excel
  const [uploadError, setUploadError] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null); // { total_rows, errors }
  const uploadInputRef = useRef(null);

  // ─ Copy/paste grid
  const [copiedGrid, setCopiedGrid] = useState(null); // { grid, nama }

  // ─ Cell popup
  const [popup, setPopup] = useState(null); // { rowIdx, day, rect }

  // ─ Pattern fill
  const [fillDialog, setFillDialog] = useState(null); // { rowIdx, pattern: '', offset: 0 }

  // ─ Preview / save
  const [previewItems, setPreviewItems] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [saveError, setSaveError] = useState('');

  const days = getDaysInMonth(tahun, bulan);
  const kamMap = Object.fromEntries(kamus.map(k => [k.kode, k]));

  // ── Load shift kelompok list + unit list
  useEffect(() => {
    apiClient.get('/shift-kelompok/', { params: { skip: 0, limit: 500 } })
      .then(res => {
        const items = res.data?.data?.items ?? res.data?.items ?? [];
        setShiftKelompokList(items);
      })
      .catch(() => {});
    // Pre-load pola list for fill dialog
    KamusPolaShiftRepository.getAll({ only_active: true })
      .then(res => setPolaList(res?.data?.items ?? []))
      .catch(() => {});
    // Load unit list for bulk add
    apiClient.get('/unit/', { params: { skip: 0, limit: 500 } })
      .then(res => {
        const items = res.data?.data?.items ?? res.data?.items ?? [];
        setUnitList(items);
      })
      .catch(() => {});
    // Load kamus kode dari backend (persistent)
    KamusKodeShiftRepository.getAll({ only_active: false })
      .then(items => {
        if (items && items.length > 0) setKamus(items);
      })
      .catch(() => {});
  }, []);

  // ── Bulk add by unit
  const handleBulkAddByUnit = useCallback(async () => {
    if (!bulkUnit) return;
    setBulkLoading(true);
    try {
      const res = await apiClient.get('/pegawai/', { params: { skip: 0, limit: 1000, id_unit: bulkUnit } });
      const items = res.data?.data?.items ?? res.data?.items ?? [];
      if (items.length === 0) {
        alert('Tidak ada pegawai aktif di unit ini.');
        return;
      }
      let added = 0;
      setRows(prev => {
        const existingIds = new Set(prev.map(r => r.id_pegawai));
        const newRows = items
          .filter(p => !existingIds.has(p.id_pegawai))
          .map(p => ({ id_pegawai: p.id_pegawai, nama: p.nama, id_unit: p.id_unit, grid: {} }));
        added = newRows.length;
        return [...prev, ...newRows];
      });
      // show brief result (use timeout to read added after setState)
      setTimeout(() => {
        if (added === 0) alert('Semua pegawai dari unit ini sudah ada di grid.');
      }, 50);
      setBulkUnit('');
    } catch {
      alert('Gagal memuat pegawai unit. Coba lagi.');
    } finally {
      setBulkLoading(false);
    }
  }, [bulkUnit]);

  // ── Download template Excel
  const handleDownloadTemplate = useCallback(async () => {
    setDownloadingTemplate(true);
    try {
      // Jika grid sudah ada isinya → kirim id pegawai yang ada di grid
      // Jika grid kosong → fallback ke filter unit
      const gridIds = rows.map(r => r.id_pegawai).filter(Boolean);
      await RosterShiftRepository.downloadTemplate({
        tahun,
        bulan,
        id_unit: gridIds.length === 0 ? (idUnit || undefined) : undefined,
        id_pegawai: gridIds.length > 0 ? gridIds : undefined,
      });
    } catch {
      alert('Gagal mengunduh template. Coba lagi.');
    } finally {
      setDownloadingTemplate(false);
    }
  }, [tahun, bulan, idUnit, rows]);

  // ── Upload Excel template
  const handleUploadExcel = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so user can re-upload same file
    e.target.value = '';
    setUploadError('');
    setUploadResult(null);
    setUploadLoading(true);
    try {
      const res = await RosterShiftRepository.parseTemplate(file, { tahun, bulan });
      const data = res?.data ?? res;
      const parsedRows = data?.rows ?? [];
      if (parsedRows.length === 0) {
        setUploadError('Tidak ada data pegawai yang ditemukan di file Excel. Pastikan file menggunakan template yang benar.');
        return;
      }
      // Merge ke grid yang ada (tambah baru, update yang sudah ada)
      setRows(prev => {
        const existingMap = Object.fromEntries(prev.map(r => [r.id_pegawai, r]));
        const result = [...prev];
        for (const r of parsedRows) {
          if (existingMap[r.id_pegawai]) {
            // Update grid yang sudah ada
            const idx = result.findIndex(x => x.id_pegawai === r.id_pegawai);
            if (idx >= 0) result[idx] = { ...result[idx], grid: { ...r.grid } };
          } else {
            result.push({ id_pegawai: r.id_pegawai, nama: r.nama, id_unit: r.id_unit, grid: r.grid });
          }
        }
        return result;
      });
      setUploadResult({ total_rows: parsedRows.length, errors: data?.errors ?? [] });
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Gagal memproses file Excel.';
      setUploadError(msg);
    } finally {
      setUploadLoading(false);
    }
  }, [tahun, bulan]);

  // ── Pola CRUD helpers
  const loadPolaList = useCallback(async () => {
    setPolaLoading(true);
    setPolaError('');
    try {
      const res = await KamusPolaShiftRepository.getAll();
      setPolaList(res?.data?.items ?? []);
    } catch { setPolaError('Gagal memuat kamus pola.'); }
    finally { setPolaLoading(false); }
  }, []);

  const openPolaEditor = useCallback(() => {
    setPolaForm(null);
    setPolaError('');
    setEditingPola(true);
    loadPolaList();
  }, [loadPolaList]);

  const handlePolaFormChange = (field, value) =>
    setPolaForm(prev => ({ ...prev, [field]: value }));

  const handleSavePola = async () => {
    if (!polaForm) return;
    const { id, nama, pola, offset_default, deskripsi } = polaForm;
    if (!nama?.trim() || !pola?.trim()) { setPolaError('Nama dan pola wajib diisi.'); return; }
    setPolaSaving(true);
    setPolaError('');
    try {
      const payload = {
        nama: nama.trim(),
        pola: pola.trim().toUpperCase(),
        offset_default: parseInt(offset_default ?? 0, 10),
        deskripsi: deskripsi || null,
      };
      if (id) {
        await KamusPolaShiftRepository.update(id, payload);
      } else {
        await KamusPolaShiftRepository.create(payload);
      }
      await loadPolaList();
      setPolaForm(null);
    } catch (err) {
      const d = err?.response?.data;
      setPolaError(d?.detail || d?.message || err?.message || 'Gagal menyimpan pola.');
    } finally { setPolaSaving(false); }
  };

  const handleDeletePola = async (id) => {
    if (!window.confirm('Hapus pola ini? Data tidak dapat dipulihkan.')) return;
    try {
      await KamusPolaShiftRepository.delete(id);
      await loadPolaList();
    } catch (err) {
      const d = err?.response?.data;
      setPolaError(d?.detail || d?.message || err?.message || 'Gagal menghapus pola.');
    }
  };

  // ── Cell click handler
  const handleCellClick = useCallback((e, rowIdx, day) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopup({ rowIdx, day, rect });
  }, []);

  const handleCellSelect = useCallback((kode) => {
    if (!popup) return;
    const { rowIdx, day } = popup;
    setRows(prev => prev.map((r, i) => i === rowIdx
      ? { ...r, grid: { ...r.grid, [day]: kode } }
      : r
    ));
    setPopup(null);
  }, [popup]);

  // ── Add employee row
  const handleAddRow = () => {
    if (!addPegawai.id_pegawai) return;
    if (rows.find(r => r.id_pegawai === addPegawai.id_pegawai)) {
      alert('Pegawai sudah ada di daftar.');
      return;
    }
    setRows(prev => [...prev, {
      id_pegawai: addPegawai.id_pegawai,
      nama: addPegawai.nama,
      id_unit: addPegawai.id_unit,
      grid: {},
    }]);
    setAddPegawai({ id_pegawai: '', nama: '', id_unit: null });
  };

  const handleRemoveRow = (rowIdx) => {
    setRows(prev => prev.filter((_, i) => i !== rowIdx));
  };

  // ── Pattern fill
  const handleFill = () => {
    if (!fillDialog) return;
    const { rowIdx, pattern, offset } = fillDialog;
    const patternArr = pattern.split(',').map(s => s.trim()).filter(Boolean);
    if (patternArr.length === 0) return;

    const newGrid = {};
    days.forEach((d, idx) => {
      const pos = (idx + parseInt(offset || 0, 10)) % patternArr.length;
      const kode = patternArr[pos] || '';
      newGrid[d.day] = kode;
    });

    setRows(prev => prev.map((r, i) => i === rowIdx
      ? { ...r, grid: { ...r.grid, ...newGrid } }
      : r
    ));
    setFillDialog(null);
  };

  const handleClearRow = (rowIdx) => {
    setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, grid: {} } : r));
  };

  const handleCopyGrid = (rowIdx) => {
    const row = rows[rowIdx];
    setCopiedGrid({ grid: { ...row.grid }, nama: row.nama });
  };

  const handlePasteGrid = (rowIdx) => {
    if (!copiedGrid) return;
    setRows(prev => prev.map((r, i) =>
      i === rowIdx ? { ...r, grid: { ...copiedGrid.grid } } : r
    ));
  };

  // ── Kamus editor
  const openKamusEditor = () => {
    setKamEdits([...kamus]);
    setKamusSaveError('');
    setEditingKamus(true);
  };
  const saveKamus = async () => {
    const codes = kamEdits.map(k => k.kode.trim().toUpperCase()).filter(Boolean);
    const unique = new Set(codes);
    if (unique.size !== codes.length) { alert('Kode kamus tidak boleh duplikat.'); return; }
    if (codes.length === 0) { alert('Minimal satu kode harus diisi.'); return; }

    setKamusLoading(true);
    setKamusSaveError('');
    try {
      const originalIds = new Set(kamus.filter(k => k.id).map(k => k.id));
      const newEdits = kamEdits.map(k => ({ ...k, kode: k.kode.trim().toUpperCase() }));

      const saved = [];
      for (const k of newEdits) {
        const payload = {
          kode:        k.kode,
          label:       k.label || null,
          jam_mulai:   k.is_libur ? null : (k.jam_mulai || '00:00'),
          jam_selesai: k.is_libur ? null : (k.jam_selesai || '00:00'),
          is_libur:    k.is_libur,
          is_active:   k.is_active !== false,
        };
        if (k.id) {
          const updated = await KamusKodeShiftRepository.update(k.id, payload);
          saved.push(updated);
          originalIds.delete(k.id);
        } else {
          const created = await KamusKodeShiftRepository.create(payload);
          saved.push(created);
        }
      }
      // Hapus yang dihilangkan dari editor
      for (const deletedId of originalIds) {
        await KamusKodeShiftRepository.delete(deletedId);
      }

      setKamus(saved);
      setEditingKamus(false);
    } catch (err) {
      const msg = err?.response?.data?.detail ?? err?.message ?? 'Gagal menyimpan kamus.';
      setKamusSaveError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setKamusLoading(false);
    }
  };
  const addKamusRow = () => setKamEdits(prev => [...prev,
    { kode: '', label: '', jam_mulai: '07:00', jam_selesai: '14:00', is_libur: false }
  ]);
  const updateKamusRow = (idx, field, value) => setKamEdits(prev =>
    prev.map((k, i) => i === idx ? { ...k, [field]: value } : k)
  );
  const removeKamusRow = (idx) => setKamEdits(prev => prev.filter((_, i) => i !== idx));

  // ── Preview
  const handlePreview = () => {
    const payloads = buildRosterPayloads(rows, kamus, tahun, bulan, shiftKelompokId, idUnit);
    if (payloads.length === 0) {
      alert('Tidak ada data roster yang akan dibuat. Periksa grid Anda.');
      return;
    }
    setSaveResult(null);
    setSaveError('');
    setPreviewItems(payloads);
  };

  // ── Save
  const handleSave = async () => {
    if (!previewItems || previewItems.length === 0) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await RosterShiftRepository.batchCreate(previewItems);
      const data = res?.data ?? res;
      setSaveResult(data);
      setPreviewItems(null);
    } catch (err) {
      const msg = formatErrorMessage(err, 'Gagal menyimpan roster', user);
      setSaveError(formatErrorForAlert(msg));
    } finally {
      setSaving(false);
    }
  };

  // ── Reset
  const handleReset = () => {
    setRows([]);
    setSaveResult(null);
    setSaveError('');
  };

  // ─────────────────────────────────────────────────── Render ─────────────────

  return (
    <div className="p-4 space-y-4" onClick={() => setPopup(null)}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Roster Adapter</h1>
          <p className="text-sm text-gray-500">Buat jadwal bulanan dengan kode shift, lalu simpan ke Roster Shift</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={openKamusEditor}
            className="px-3 py-1.5 text-sm border border-indigo-300 text-indigo-700 rounded hover:bg-indigo-50"
          >
            📖 Kamus Kode
          </button>
          <button
            onClick={openPolaEditor}
            className="px-3 py-1.5 text-sm border border-purple-300 text-purple-700 rounded hover:bg-purple-50"
          >
            🔁 Kamus Pola
          </button>
          <button
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            className="px-3 py-1.5 text-sm border border-green-400 text-green-700 rounded hover:bg-green-50 disabled:opacity-50"
            title={`Download template Excel roster ${NAMA_BULAN[bulan]} ${tahun}`}
          >
            {downloadingTemplate ? '⏳ Mengunduh…' : '📥 Template Excel'}
          </button>
          <label
            className="px-3 py-1.5 text-sm border border-orange-400 text-orange-700 rounded hover:bg-orange-50 cursor-pointer"
            title="Upload Excel template yang sudah diisi"
          >
            {uploadLoading ? '⏳ Memproses…' : '📤 Upload Excel'}
            <input
              ref={uploadInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleUploadExcel}
              disabled={uploadLoading}
            />
          </label>
          <button
            onClick={handlePreview}
            disabled={rows.length === 0}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            👁 Preview &amp; Simpan
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
          >
            🔄 Reset Grid
          </button>
        </div>
      </div>

      {/* Settings bar */}
      <div className="bg-white border rounded-lg p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tahun</label>
          <input
            type="number"
            value={tahun}
            onChange={e => setTahun(parseInt(e.target.value))}
            className="border rounded px-2 py-1.5 text-sm w-24"
            min="2020" max="2100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Bulan</label>
          <select
            value={bulan}
            onChange={e => setBulan(parseInt(e.target.value))}
            className="border rounded px-2 py-1.5 text-sm w-36"
          >
            {NAMA_BULAN.slice(1).map((n, i) => (
              <option key={i + 1} value={i + 1}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Shift Kelompok (opsional)</label>
          <select
            value={shiftKelompokId}
            onChange={e => setShiftKelompokId(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm w-52"
          >
            <option value="">— Tidak dipilih —</option>
            {shiftKelompokList.map(sk => (
              <option key={sk.id} value={sk.id}>{sk.kode} – {sk.nama}</option>
            ))}
          </select>
        </div>
        <div className="text-sm text-gray-500 self-center pt-4">
          📅 {NAMA_BULAN[bulan]} {tahun} · {days.length} hari
        </div>
      </div>

      {/* Kamus summary badges */}
      <div className="bg-white border rounded-lg p-3">
        <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Kamus Kode Aktif</div>
        <div className="flex flex-wrap gap-2">
          {kamus.map(k => {
            const colors = k.is_libur ? JENIS_COLOR_MAP.LIBUR : JENIS_COLOR_MAP.AKTIF;
            return (
              <div key={k.kode} className={`px-2 py-1 rounded border text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}>
                <span className="font-bold">{k.kode}</span>
                {k.label ? ` · ${k.label}` : ''}
                {k.is_libur ? ' · Libur' : ` · ${k.jam_mulai}–${k.jam_selesai}`}
                {!k.is_libur && isLintasTanggal(k.jam_mulai, k.jam_selesai) && (
                  <span className="ml-1 text-purple-600" title="Lintas Tanggal">🌙</span>
                )}
              </div>
            );
          })}
          <button onClick={openKamusEditor} className="px-2 py-1 rounded border border-dashed border-gray-300 text-xs text-gray-400 hover:bg-gray-50">
            + Edit
          </button>
        </div>
      </div>

      {/* Upload result banner */}
      {uploadResult && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-green-800">
              ✅ Excel berhasil diparsing: {uploadResult.total_rows} pegawai dimuat ke grid
            </span>
            <button onClick={() => setUploadResult(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
          </div>
          {uploadResult.errors?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-amber-700 mb-1">⚠ Peringatan ({uploadResult.errors.length} baris):</p>
              <ul className="text-xs text-amber-700 list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto">
                {uploadResult.errors.map((e, i) => (
                  <li key={i}>Baris {e.baris} ({e.id_pegawai}): {e.pesan}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {uploadError && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700 flex items-start justify-between gap-2">
          <span>⚠ {uploadError}</span>
          <button onClick={() => setUploadError('')} className="text-xs underline shrink-0">Tutup</button>
        </div>
      )}

      {/* Add employee */}
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tambah Pegawai ke Grid</p>
        {/* Per orang */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-600 mb-1">Cari per orang</label>
            <PegawaiSearchInput
              value={addPegawai.id_pegawai}
              displayValue={addPegawai.nama}
              onChange={(id, nama, id_unit) => setAddPegawai({ id_pegawai: id || '', nama: nama || '', id_unit: id_unit ?? null })}
              placeholder="Cari nama / ID pegawai..."
            />
          </div>
          <button
            onClick={handleAddRow}
            disabled={!addPegawai.id_pegawai}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            + Tambah
          </button>
        </div>
        {/* Per unit */}
        <div className="flex flex-wrap gap-3 items-end border-t border-dashed border-gray-200 pt-3">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-600 mb-1">Tambah semua pegawai per unit</label>
            <select
              value={bulkUnit}
              onChange={e => setBulkUnit(e.target.value)}
              className="border rounded px-2 py-2 text-sm w-full"
            >
              <option value="">— Pilih unit —</option>
              {unitList.map(u => (
                <option key={u.id_unit} value={u.id_unit}>{u.nama_unit}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleBulkAddByUnit}
            disabled={!bulkUnit || bulkLoading}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
          >
            {bulkLoading ? '⏳ Memuat…' : '+ Tambah Semua'}
          </button>
          <div className="text-xs text-gray-400 self-center">
            💡 Atau download <button onClick={handleDownloadTemplate} className="underline text-green-700 hover:text-green-900">template Excel</button>, isi, lalu upload.
          </div>
        </div>
      </div>

      {/* Save Result Banner */}
      {saveResult && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4">
          <div className="font-semibold text-green-800">
            ✅ Roster berhasil disimpan: {saveResult.total_created} entri dibuat
            {saveResult.total_errors > 0 && `, ${saveResult.total_errors} gagal`}
          </div>
          {saveResult.errors && saveResult.errors.length > 0 && (
            <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
              {saveResult.errors.map((e, i) => (
                <li key={i}>Baris {e.row} (pegawai {e.id_pegawai}, {e.tanggal_shift}): {e.error}</li>
              ))}
            </ul>
          )}
          <button onClick={() => setSaveResult(null)} className="mt-2 text-xs text-gray-500 hover:underline">Tutup</button>
        </div>
      )}
      {saveError && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">
          {saveError}
          <button onClick={() => setSaveError('')} className="ml-2 text-xs underline">Tutup</button>
        </div>
      )}

      {/* Grid */}
      {rows.length === 0 ? (
        <div className="bg-white border rounded-lg p-10 text-center text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <div className="font-medium">Belum ada pegawai di grid</div>
          <div className="text-sm mt-1">Tambahkan pegawai di atas untuk mulai mengisi jadwal</div>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="p-3 border-b bg-gray-50 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-700">{rows.length} pegawai</span>
            <span className="text-xs text-gray-400">· Klik sel untuk memilih kode shift</span>
            {copiedGrid && (
              <span className="ml-auto flex items-center gap-1.5 text-xs bg-orange-50 border border-orange-200 text-orange-700 px-2 py-1 rounded">
                📋 Clipboard: <strong>{copiedGrid.nama}</strong>
                <button
                  onClick={() => setCopiedGrid(null)}
                  className="ml-1 text-orange-400 hover:text-orange-700 font-bold leading-none"
                  title="Hapus clipboard"
                >✕</button>
              </span>
            )}
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: '60vh' }}>
            <table className="border-collapse text-xs" style={{ minWidth: `${48 + rows.length * 0}px` }}>
              <thead>
                <tr className="bg-gray-50">
                  {/* Sticky first col */}
                  <th className="sticky left-0 z-20 bg-gray-50 border border-gray-200 px-2 py-2 text-left font-semibold text-gray-700 whitespace-nowrap min-w-[160px]">
                    Pegawai
                  </th>
                  {days.map(d => (
                    <th
                      key={d.day}
                      className={`border border-gray-200 px-1 py-1 text-center font-medium min-w-[38px] ${d.isSunday ? 'bg-red-50 text-red-600' : 'text-gray-600'}`}
                    >
                      <div>{d.day}</div>
                      <div className="text-gray-400 font-normal">{d.dayName}</div>
                    </th>
                  ))}
                  <th className="sticky right-0 z-20 bg-gray-50 border border-gray-200 px-2 py-2 text-center font-semibold text-gray-700 min-w-[120px]">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={row.id_pegawai} className="hover:bg-blue-50/30">
                    {/* Sticky name cell */}
                    <td className="sticky left-0 z-10 bg-white border border-gray-200 px-2 py-1.5 whitespace-nowrap">
                      <div className="font-medium text-gray-900 truncate max-w-[150px]" title={row.nama}>{row.nama}</div>
                      <div className="text-gray-400 text-[10px]">{row.id_pegawai}</div>
                    </td>
                    {/* Day cells */}
                    {days.map(d => {
                      const kode = row.grid[d.day] || '';
                      const entry = kamMap[kode];
                      const colors = !kode ? null : (entry?.is_libur ? JENIS_COLOR_MAP.LIBUR : JENIS_COLOR_MAP.AKTIF);
                      return (
                        <td
                          key={d.day}
                          className={`border border-gray-200 text-center p-0 ${d.isSunday ? 'bg-red-50' : ''}`}
                        >
                          <button
                            className={`w-full h-full px-1 py-1.5 text-xs font-medium rounded-none transition-colors ${
                              kode && colors
                                ? `${colors.bg} ${colors.text} hover:opacity-80`
                                : 'hover:bg-gray-100 text-gray-300'
                            }`}
                            onClick={(e) => handleCellClick(e, ri, d.day)}
                            title={kode ? `${kode}${entry && !entry.is_libur ? ` ${entry.jam_mulai}–${entry.jam_selesai}` : ''}` : 'Klik untuk mengisi'}
                          >
                            {kode || '·'}
                          </button>
                        </td>
                      );
                    })}
                    {/* Action cell */}
                    <td className="sticky right-0 z-10 bg-white border border-gray-200 px-2 py-1 text-center whitespace-nowrap">
                      <div className="flex flex-wrap gap-1 justify-center">
                        <button
                          onClick={() => setFillDialog({ rowIdx: ri, pattern: '', offset: 0 })}
                          className="px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                          title="Isi dengan pola berulang"
                        >
                          🔁 Pola
                        </button>
                        <button
                          onClick={() => handleCopyGrid(ri)}
                          className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                            copiedGrid?.nama === row.nama && JSON.stringify(copiedGrid?.grid) === JSON.stringify(row.grid)
                              ? 'bg-green-500 text-white border-green-500'
                              : 'bg-green-100 text-green-700 border-transparent hover:bg-green-200'
                          }`}
                          title="Salin pola baris ini"
                        >
                          📋 Copy
                        </button>
                        {copiedGrid && (
                          <button
                            onClick={() => handlePasteGrid(ri)}
                            className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 border border-orange-300"
                            title={`Tempel pola dari ${copiedGrid.nama}`}
                          >
                            📌 Paste
                          </button>
                        )}
                        <button
                          onClick={() => handleClearRow(ri)}
                          className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                          title="Kosongkan baris ini"
                        >
                          🗑 Hapus
                        </button>
                        <button
                          onClick={() => handleRemoveRow(ri)}
                          className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          title="Hapus pegawai dari grid"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Cell Popup ─────────────────────────────────────────────────── */}
      {popup && (
        <CellPopup
          anchorRect={popup.rect}
          kamus={kamus}
          currentKode={rows[popup.rowIdx]?.grid[popup.day] || ''}
          onSelect={handleCellSelect}
          onClose={() => setPopup(null)}
        />
      )}

      {/* ─── Kamus Editor Modal ──────────────────────────────────────────── */}
      {editingKamus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingKamus(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold">📖 Editor Kamus Kode Shift</h2>
              <button onClick={() => setEditingKamus(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Definisikan kode shift beserta jam dan jenisnya. Kode bertanda <strong>Libur</strong> tidak akan dibuat sebagai baris roster.</p>

            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="w-full text-sm border-collapse" style={{ minWidth: '600px' }}>
                <thead>
                  <tr className="bg-gray-100 text-xs text-gray-600 uppercase tracking-wide">
                    <th className="border-b border-gray-200 px-3 py-2.5 text-left font-semibold w-20">Kode</th>
                    <th className="border-b border-gray-200 px-3 py-2.5 text-left font-semibold">Label</th>
                    <th className="border-b border-gray-200 px-3 py-2.5 text-left font-semibold w-32">Jam Mulai</th>
                    <th className="border-b border-gray-200 px-3 py-2.5 text-left font-semibold w-32">Jam Selesai</th>
                    <th className="border-b border-gray-200 px-3 py-2.5 text-center font-semibold w-28">Hari Libur?</th>
                    <th className="border-b border-gray-200 px-3 py-2.5 text-center font-semibold w-36">Tampilan di Grid</th>
                    <th className="border-b border-gray-200 px-2 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {kamEdits.map((k, i) => {
                    const colors = k.is_libur ? JENIS_COLOR_MAP.LIBUR : JENIS_COLOR_MAP.AKTIF;
                    const lintas = !k.is_libur && isLintasTanggal(k.jam_mulai, k.jam_selesai);
                    return (
                      <tr key={i} className={`transition-colors ${
                        k.is_libur ? 'bg-gray-50/60' : 'bg-white'
                      } hover:bg-blue-50/40`}>
                        {/* Kode */}
                        <td className="px-2 py-2">
                          <input
                            value={k.kode}
                            onChange={e => updateKamusRow(i, 'kode', e.target.value.toUpperCase())}
                            className="border rounded px-2 py-1.5 w-full text-center font-mono font-bold text-sm tracking-wider"
                            maxLength={6}
                            placeholder="P1"
                          />
                        </td>
                        {/* Label */}
                        <td className="px-2 py-2">
                          <input
                            value={k.label || ''}
                            onChange={e => updateKamusRow(i, 'label', e.target.value)}
                            className="border rounded px-2 py-1.5 w-full text-sm"
                            placeholder="Pagi 1"
                            disabled={false}
                          />
                        </td>
                        {/* Jam Mulai */}
                        <td className="px-2 py-2">
                          <input
                            type="time"
                            value={k.jam_mulai}
                            onChange={e => updateKamusRow(i, 'jam_mulai', e.target.value)}
                            disabled={k.is_libur}
                            className="border rounded px-2 py-1.5 w-full text-sm disabled:opacity-40 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        {/* Jam Selesai */}
                        <td className="px-2 py-2">
                          <input
                            type="time"
                            value={k.jam_selesai}
                            onChange={e => updateKamusRow(i, 'jam_selesai', e.target.value)}
                            disabled={k.is_libur}
                            className="border rounded px-2 py-1.5 w-full text-sm disabled:opacity-40 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          {lintas && (
                            <div className="flex items-center gap-0.5 text-purple-600 text-[10px] mt-1">
                              🌙 <span>Lintas tanggal</span>
                            </div>
                          )}
                        </td>
                        {/* Is Libur toggle */}
                        <td className="px-2 py-2 text-center">
                          <label className="inline-flex flex-col items-center gap-1 cursor-pointer select-none">
                            <div
                              onClick={() => updateKamusRow(i, 'is_libur', !k.is_libur)}
                              className={`relative inline-flex w-11 h-6 rounded-full transition-colors cursor-pointer ${
                                k.is_libur ? 'bg-gray-400' : 'bg-gray-200'
                              }`}
                            >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                k.is_libur ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </div>
                            <span className={`text-[10px] font-medium ${
                              k.is_libur ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              {k.is_libur ? 'Ya' : 'Tidak'}
                            </span>
                          </label>
                        </td>
                        {/* Preview */}
                        <td className="px-2 py-2 text-center">
                          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded text-xs font-bold border ${
                            colors.bg} ${colors.text} ${colors.border}`}>
                            {k.kode || '—'}
                          </span>
                          <div className="text-gray-400 text-[10px] mt-1 leading-tight">
                            {k.is_libur
                              ? (k.label || 'Hari Libur')
                              : (k.jam_mulai && k.jam_selesai
                                  ? `${k.jam_mulai}–${k.jam_selesai}${lintas ? ' +1' : ''}`
                                  : '—'
                                )
                            }
                          </div>
                        </td>
                        {/* Delete */}
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => removeKamusRow(i)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-1 transition-colors"
                            title="Hapus kode ini"
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 mt-4 flex-wrap items-center">
              <button onClick={addKamusRow} className="px-3 py-1.5 text-sm border border-dashed border-gray-400 text-gray-600 rounded hover:bg-gray-50">
                + Tambah Kode
              </button>
              {kamusSaveError && (
                <p className="text-xs text-red-600 flex-1">{kamusSaveError}</p>
              )}
              <button
                onClick={saveKamus}
                disabled={kamusLoading}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 ml-auto font-medium disabled:opacity-60"
              >
                {kamusLoading ? 'Menyimpan…' : '💾 Simpan Kamus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Pattern Fill Modal ──────────────────────────────────────────── */}
      {fillDialog !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setFillDialog(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-3">🔁 Isi Pola Berulang</h2>
            <p className="text-sm text-gray-500 mb-1">
              Pegawai: <strong>{rows[fillDialog.rowIdx]?.nama}</strong>
            </p>
            <div className="mb-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
              Tersedia: {kamus.map(k => k.kode).join(', ')}
            </div>
            {/* Pilih dari kamus */}
            {polaList.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-600 mb-1.5">Pilih dari Kamus Pola:</p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {polaList.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setFillDialog(d => ({ ...d, pattern: p.pola, offset: p.offset_default ?? 0 }))}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        fillDialog.pattern === p.pola && String(fillDialog.offset) === String(p.offset_default ?? 0)
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                      }`}
                      title={p.deskripsi || p.pola}
                    >
                      <span className="font-semibold">{p.nama}</span>
                      <span className="ml-1 opacity-70 font-mono">{p.pola}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-dashed border-gray-200 my-3" />
              </div>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pola (pisah koma)
            </label>
            <input
              className="border rounded px-3 py-2 w-full text-sm font-mono mb-1"
              placeholder="P1,S1,M1,L1,L1"
              value={fillDialog.pattern}
              onChange={e => setFillDialog(d => ({ ...d, pattern: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mb-3">Contoh: <code>P1,S1,M1,L1,L1</code> → pola 5 hari berulang</p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Offset awal (0 = mulai dari awal pola)
            </label>
            <input
              type="number"
              className="border rounded px-3 py-2 w-24 text-sm mb-4"
              value={fillDialog.offset}
              onChange={e => setFillDialog(d => ({ ...d, offset: e.target.value }))}
              min="0"
            />

            <div className="flex gap-2 justify-end">
              <button onClick={() => setFillDialog(null)} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">Batal</button>
              <button
                onClick={handleFill}
                disabled={!fillDialog.pattern.trim()}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                Isi Grid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Kamus Pola Modal ────────────────────────────────────────────── */}
      {editingPola && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingPola(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">🔁 Kamus Pola Shift</h2>
              <button onClick={() => setEditingPola(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Simpan pola shift berulang (e.g. <code className="bg-gray-100 px-1 rounded">P1,S1,M1,L1,L1</code>) agar bisa dipilih cepat saat mengisi grid.
            </p>

            {polaError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{polaError}</div>
            )}

            {/* Form tambah / edit */}
            {polaForm !== null && (
              <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="text-sm font-semibold text-purple-800 mb-3">
                  {polaForm.id ? '✏️ Edit Pola' : '➕ Tambah Pola Baru'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nama Pola <span className="text-red-500">*</span></label>
                    <input
                      className="border rounded px-2 py-1.5 w-full text-sm"
                      placeholder="Shift 5-Hari IGD"
                      value={polaForm.nama ?? ''}
                      onChange={e => handlePolaFormChange('nama', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Offset Default</label>
                    <input
                      type="number"
                      min="0"
                      className="border rounded px-2 py-1.5 w-full text-sm"
                      value={polaForm.offset_default ?? 0}
                      onChange={e => handlePolaFormChange('offset_default', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Pola (pisah koma) <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="border rounded px-2 py-1.5 w-full text-sm font-mono"
                      placeholder="P1,S1,M1,L1,L1"
                      value={polaForm.pola ?? ''}
                      onChange={e => handlePolaFormChange('pola', e.target.value)}
                    />
                    {polaForm.pola && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {polaForm.pola.split(',').map((k, i) => {
                          const entry = kamMap[k.trim().toUpperCase()];
                          const colors = entry?.is_libur ? JENIS_COLOR_MAP.LIBUR : JENIS_COLOR_MAP.AKTIF;
                          return (
                            <span key={i} className={`px-1.5 py-0.5 rounded text-xs font-medium border ${
                              entry ? `${colors.bg} ${colors.text} ${colors.border}` : 'bg-yellow-50 text-yellow-700 border-yellow-300'
                            }`}>
                              {k.trim().toUpperCase() || '—'}
                            </span>
                          );
                        })}
                        <span className="text-xs text-gray-400 self-center">
                          · siklus {polaForm.pola.split(',').filter(k => k.trim()).length} hari
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi (opsional)</label>
                    <input
                      className="border rounded px-2 py-1.5 w-full text-sm"
                      placeholder="Keterangan tambahan…"
                      value={polaForm.deskripsi ?? ''}
                      onChange={e => handlePolaFormChange('deskripsi', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPolaForm(null); setPolaError(''); }}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSavePola}
                    disabled={polaSaving}
                    className="px-4 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 ml-auto"
                  >
                    {polaSaving ? 'Menyimpan…' : '💾 Simpan'}
                  </button>
                </div>
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {polaLoading ? (
                <div className="text-center text-gray-400 py-8 text-sm">Memuat…</div>
              ) : polaList.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <div className="text-3xl mb-2">🔁</div>
                  <div className="text-sm">Belum ada pola tersimpan</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {polaList.map(p => (
                    <div key={p.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-gray-800">{p.nama}</span>
                            <span className="text-xs text-gray-400">offset: {p.offset_default}</span>
                            <span className="text-xs text-gray-400">· {p.panjang_siklus ?? p.pola.split(',').length} hari</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {p.pola.split(',').map((k, i) => {
                              const entry = kamMap[k.trim()];
                              const colors = entry?.is_libur ? JENIS_COLOR_MAP.LIBUR : JENIS_COLOR_MAP.AKTIF;
                              return (
                                <span key={i} className={`px-1.5 py-0.5 rounded text-xs font-medium border ${
                                  entry ? `${colors.bg} ${colors.text} ${colors.border}` : 'bg-yellow-50 text-yellow-700 border-yellow-300'
                                }`}>{k.trim()}</span>
                              );
                            })}
                          </div>
                          {p.deskripsi && (
                            <p className="text-xs text-gray-500 mt-1">{p.deskripsi}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => setPolaForm({ id: p.id, nama: p.nama, pola: p.pola, offset_default: p.offset_default, deskripsi: p.deskripsi ?? '' })}
                            className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeletePola(p.id)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 pt-4 border-t border-gray-100 mt-4">
              {polaForm === null && (
                <button
                  onClick={() => setPolaForm({ nama: '', pola: '', offset_default: 0, deskripsi: '' })}
                  className="px-3 py-1.5 text-sm border border-dashed border-purple-400 text-purple-600 rounded hover:bg-purple-50"
                >
                  + Tambah Pola Baru
                </button>
              )}
              <button
                onClick={() => setEditingPola(false)}
                className="ml-auto px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Preview Modal ───────────────────────────────────────────────── */}
      {previewItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPreviewItems(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">👁 Preview Roster</h2>
                <p className="text-sm text-gray-500">{previewItems.length} baris roster akan dibuat untuk {NAMA_BULAN[bulan]} {tahun}</p>
              </div>
              <button onClick={() => setPreviewItems(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="overflow-auto flex-1 border rounded text-xs">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="border px-2 py-1.5 text-left">#</th>
                    <th className="border px-2 py-1.5 text-left">Pegawai</th>
                    <th className="border px-2 py-1.5 text-left">Tanggal</th>
                    <th className="border px-2 py-1.5 text-left">Jam Mulai</th>
                    <th className="border px-2 py-1.5 text-left">Jam Selesai</th>
                  </tr>
                </thead>
                <tbody>
                  {previewItems.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border px-2 py-1 text-gray-400">{i + 1}</td>
                      <td className="border px-2 py-1 font-medium">{p.id_pegawai}</td>
                      <td className="border px-2 py-1">{p.tanggal_shift}</td>
                      <td className="border px-2 py-1 font-mono">
                        {new Date(p.jam_mulai).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="border px-2 py-1 font-mono">
                        {new Date(p.jam_selesai).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setPreviewItems(null)} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
                Kembali Edit
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-semibold"
              >
                {saving ? 'Menyimpan...' : `✅ Simpan ${previewItems.length} Roster`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterAdapterPage;
