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

// ─── Constants ────────────────────────────────────────────────────────────────

const JENIS_OPTIONS = ['PAGI', 'SORE', 'MALAM', 'ON_CALL', 'CUSTOM'];

const NAMA_BULAN = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const NAMA_HARI_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

// Warna default per jenis shift (untuk kamus)
const JENIS_COLOR_MAP = {
  PAGI:    { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300' },
  SORE:    { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  MALAM:   { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
  ON_CALL: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  CUSTOM:  { bg: 'bg-teal-100',   text: 'text-teal-800',   border: 'border-teal-300' },
  LIBUR:   { bg: 'bg-gray-100',   text: 'text-gray-500',   border: 'border-gray-300' },
};

const DEFAULT_KAMUS = [
  { kode: 'P1', jam_mulai: '07:00', jam_selesai: '14:00', jenis_shift: 'PAGI',  is_libur: false },
  { kode: 'P2', jam_mulai: '07:00', jam_selesai: '11:00', jenis_shift: 'PAGI',  is_libur: false },
  { kode: 'P3', jam_mulai: '07:00', jam_selesai: '12:30', jenis_shift: 'PAGI',  is_libur: false },
  { kode: 'S1', jam_mulai: '14:00', jam_selesai: '21:00', jenis_shift: 'SORE',  is_libur: false },
  { kode: 'M1', jam_mulai: '21:00', jam_selesai: '07:00', jenis_shift: 'MALAM', is_libur: false },
  { kode: 'L1', jam_mulai: '',      jam_selesai: '',      jenis_shift: 'CUSTOM',is_libur: true  },
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
        jenis_shift: entry.jenis_shift,
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
  const colors = entry.is_libur ? JENIS_COLOR_MAP.LIBUR : (JENIS_COLOR_MAP[entry.jenis_shift] || JENIS_COLOR_MAP.CUSTOM);
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
        const colors = k.is_libur ? JENIS_COLOR_MAP.LIBUR : (JENIS_COLOR_MAP[k.jenis_shift] || JENIS_COLOR_MAP.CUSTOM);
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

  // ─ Grid rows
  const [rows, setRows] = useState([]);
  const [addPegawai, setAddPegawai] = useState({ id_pegawai: '', nama: '', id_unit: null });

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

  // ── Load shift kelompok list
  useEffect(() => {
    apiClient.get('/shift-kelompok/', { params: { skip: 0, limit: 500 } })
      .then(res => {
        const items = res.data?.data?.items ?? res.data?.items ?? [];
        setShiftKelompokList(items);
      })
      .catch(() => {});
  }, []);

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

  // ── Kamus editor
  const openKamusEditor = () => {
    setKamEdits([...kamus]);
    setEditingKamus(true);
  };
  const saveKamus = () => {
    const codes = kamEdits.map(k => k.kode.trim().toUpperCase()).filter(Boolean);
    const unique = new Set(codes);
    if (unique.size !== codes.length) { alert('Kode kamus tidak boleh duplikat.'); return; }
    setKamus(kamEdits.map(k => ({ ...k, kode: k.kode.trim().toUpperCase() })));
    setEditingKamus(false);
  };
  const addKamusRow = () => setKamEdits(prev => [...prev,
    { kode: '', jam_mulai: '07:00', jam_selesai: '14:00', jenis_shift: 'PAGI', is_libur: false }
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
            const colors = k.is_libur ? JENIS_COLOR_MAP.LIBUR : (JENIS_COLOR_MAP[k.jenis_shift] || JENIS_COLOR_MAP.CUSTOM);
            return (
              <div key={k.kode} className={`px-2 py-1 rounded border text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}>
                <span className="font-bold">{k.kode}</span>
                {k.is_libur ? ' · Libur' : ` · ${k.jam_mulai}–${k.jam_selesai} · ${k.jenis_shift}`}
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

      {/* Add employee */}
      <div className="bg-white border rounded-lg p-3 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-600 mb-1">Tambah Pegawai ke Grid</label>
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
          <div className="p-3 border-b bg-gray-50 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">{rows.length} pegawai</span>
            <span className="text-xs text-gray-400">· Klik sel untuk memilih kode shift</span>
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
                      const colors = !kode ? null : (entry?.is_libur ? JENIS_COLOR_MAP.LIBUR : (JENIS_COLOR_MAP[entry?.jenis_shift] || JENIS_COLOR_MAP.CUSTOM));
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
                      <button
                        onClick={() => setFillDialog({ rowIdx: ri, pattern: '', offset: 0 })}
                        className="px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 mr-1"
                        title="Isi dengan pola berulang"
                      >
                        🔁 Pola
                      </button>
                      <button
                        onClick={() => handleClearRow(ri)}
                        className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 mr-1"
                        title="Kosongkan baris ini"
                      >
                        🗑 Hapus Isi
                      </button>
                      <button
                        onClick={() => handleRemoveRow(ri)}
                        className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        title="Hapus pegawai dari grid"
                      >
                        ✕
                      </button>
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
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">📖 Editor Kamus Kode Shift</h2>
              <button onClick={() => setEditingKamus(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Definisikan kode shift beserta jam dan jenisnya. Kode LIBUR tidak akan dibuat sebagai baris roster.</p>
            <table className="w-full text-sm border-collapse mb-3">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-600">
                  <th className="border px-2 py-1.5">Kode</th>
                  <th className="border px-2 py-1.5">Jam Mulai</th>
                  <th className="border px-2 py-1.5">Jam Selesai</th>
                  <th className="border px-2 py-1.5">Jenis Shift</th>
                  <th className="border px-2 py-1.5">Libur</th>
                  <th className="border px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {kamEdits.map((k, i) => (
                  <tr key={i}>
                    <td className="border px-1 py-1">
                      <input
                        value={k.kode}
                        onChange={e => updateKamusRow(i, 'kode', e.target.value.toUpperCase())}
                        className="border rounded px-1.5 py-1 w-full text-center font-mono font-bold"
                        maxLength={6}
                        placeholder="P1"
                      />
                    </td>
                    <td className="border px-1 py-1">
                      <input
                        type="time"
                        value={k.jam_mulai}
                        onChange={e => updateKamusRow(i, 'jam_mulai', e.target.value)}
                        disabled={k.is_libur}
                        className="border rounded px-1.5 py-1 w-full disabled:opacity-40"
                      />
                    </td>
                    <td className="border px-1 py-1">
                      <input
                        type="time"
                        value={k.jam_selesai}
                        onChange={e => updateKamusRow(i, 'jam_selesai', e.target.value)}
                        disabled={k.is_libur}
                        className="border rounded px-1.5 py-1 w-full disabled:opacity-40"
                      />
                      {!k.is_libur && isLintasTanggal(k.jam_mulai, k.jam_selesai) && (
                        <div className="text-purple-600 text-[10px] mt-0.5">🌙 Lintas tanggal</div>
                      )}
                    </td>
                    <td className="border px-1 py-1">
                      <select
                        value={k.jenis_shift}
                        onChange={e => updateKamusRow(i, 'jenis_shift', e.target.value)}
                        disabled={k.is_libur}
                        className="border rounded px-1 py-1 w-full text-xs disabled:opacity-40"
                      >
                        {JENIS_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                    </td>
                    <td className="border px-1 py-1 text-center">
                      <div
                        onClick={() => updateKamusRow(i, 'is_libur', !k.is_libur)}
                        className={`inline-flex items-center cursor-pointer w-10 h-5 rounded-full transition-colors ${k.is_libur ? 'bg-gray-400' : 'bg-gray-200'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${k.is_libur ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                    </td>
                    <td className="border px-1 py-1 text-center">
                      <button onClick={() => removeKamusRow(i)} className="text-red-500 hover:text-red-700 text-xs">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-2">
              <button onClick={addKamusRow} className="px-3 py-1.5 text-sm border border-dashed border-gray-400 text-gray-600 rounded hover:bg-gray-50">
                + Tambah Kode
              </button>
              <button onClick={saveKamus} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 ml-auto">
                Simpan Kamus
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
                    <th className="border px-2 py-1.5 text-left">Jenis</th>
                  </tr>
                </thead>
                <tbody>
                  {previewItems.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border px-2 py-1 text-gray-400">{i + 1}</td>
                      <td className="border px-2 py-1 font-medium">{p.id_pegawai}</td>
                      <td className="border px-2 py-1">{p.tanggal_shift}</td>
                      <td className="border px-2 py-1 font-mono">
                        {new Date(p.jam_mulai).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="border px-2 py-1 font-mono">
                        {new Date(p.jam_selesai).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="border px-2 py-1">
                        <span className={`px-1 py-0.5 rounded ${(JENIS_COLOR_MAP[p.jenis_shift] || JENIS_COLOR_MAP.CUSTOM).bg} ${(JENIS_COLOR_MAP[p.jenis_shift] || JENIS_COLOR_MAP.CUSTOM).text}`}>
                          {p.jenis_shift}
                        </span>
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
