import { useEffect, useState, useCallback } from 'react';
import AppSettingRepository from '../../../data/repositories/AppSettingRepository';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const THRESHOLD_MIN  = 0.30;
const THRESHOLD_MAX  = 0.90;
const THRESHOLD_STEP = 0.05;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const SectionCard = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
    <h2 className="text-base font-semibold text-gray-800 mb-1">{title}</h2>
    {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
    {children}
  </div>
);

const Badge = ({ locked }) =>
  locked ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
      🔒 Dikunci
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
      🔓 Terbuka
    </span>
  );

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const SystemSettingsPage = () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [alert,    setAlert]    = useState(null); // { type: 'success'|'error', msg }

  const [threshold, setThreshold] = useState(0.60);
  const [locked,    setLocked]    = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { threshold: t, locked: l } = await AppSettingRepository.getFaceThreshold();
      setThreshold(clamp(t, THRESHOLD_MIN, THRESHOLD_MAX));
      setLocked(l);
    } catch (err) {
      setAlert({ type: 'error', msg: err?.response?.data?.detail ?? 'Gagal memuat pengaturan.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // ── Save helpers ───────────────────────────────────────────────────────────
  const showAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const saveThreshold = async () => {
    setSaving(true);
    try {
      await AppSettingRepository.update('face_threshold', threshold.toFixed(2));
      showAlert('success', `Threshold disimpan: ${threshold.toFixed(2)}`);
    } catch (err) {
      showAlert('error', err?.response?.data?.detail ?? 'Gagal menyimpan threshold.');
    } finally {
      setSaving(false);
    }
  };

  const saveLock = async (newLocked) => {
    setSaving(true);
    try {
      await AppSettingRepository.update('face_threshold_locked', newLocked ? 'true' : 'false');
      setLocked(newLocked);
      showAlert(
        'success',
        newLocked
          ? '🔒 Threshold dikunci — pengguna tidak dapat mengubah.'
          : '🔓 Threshold dibuka — pengguna dapat menyesuaikan.',
      );
    } catch (err) {
      showAlert('error', err?.response?.data?.detail ?? 'Gagal menyimpan status kunci.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const percent = ((threshold - THRESHOLD_MIN) / (THRESHOLD_MAX - THRESHOLD_MIN)) * 100;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">⚙️ Pengaturan Sistem</h1>
      <p className="text-sm text-gray-500 mb-6">Konfigurasi parameter pengenalan wajah dan kebijakan sistem.</p>

      {/* Alert */}
      {alert && (
        <div
          className={`mb-5 px-4 py-3 rounded-lg text-sm font-medium flex items-start gap-2 ${
            alert.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <span>{alert.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{alert.msg}</span>
        </div>
      )}

      {/* Face Threshold Card */}
      <SectionCard
        title="Ambang Batas Pengenalan Wajah (Face Threshold)"
        subtitle="Nilai kemiripan (cosine similarity) minimum agar wajah diterima. Semakin tinggi = semakin ketat."
      >
        {/* Value + Badge row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-3xl font-bold text-indigo-700">{threshold.toFixed(2)}</span>
          <Badge locked={locked} />
        </div>

        {/* Slider */}
        <div className="relative mb-1">
          <input
            type="range"
            min={THRESHOLD_MIN}
            max={THRESHOLD_MAX}
            step={THRESHOLD_STEP}
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          {/* Tick labels */}
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{THRESHOLD_MIN}</span>
            <span>0.60</span>
            <span>{THRESHOLD_MAX}</span>
          </div>
        </div>

        {/* Description row */}
        <p className="text-xs text-gray-500 mt-2 mb-5">
          {threshold < 0.50 && '⚡ Sangat longgar — banyak orang bisa cocok'}
          {threshold >= 0.50 && threshold < 0.65 && '✅ Standar — keseimbangan antara keamanan dan kemudahan'}
          {threshold >= 0.65 && threshold < 0.80 && '🔐 Ketat — profil wajah harus berkualitas baik'}
          {threshold >= 0.80 && '🔒 Sangat ketat — hanya dalam kondisi ideal'}
        </p>

        <button
          onClick={saveThreshold}
          disabled={saving}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm px-5 py-2 rounded-lg transition-colors"
        >
          {saving ? 'Menyimpan...' : '💾 Simpan Threshold'}
        </button>
      </SectionCard>

      {/* Lock Card */}
      <SectionCard
        title="Kebijakan Kunci Threshold"
        subtitle="Saat dikunci, pengguna tidak dapat mengubah threshold pada halaman Login Wajah. Backend juga akan mengabaikan threshold yang dikirim oleh klien."
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">
              {locked ? '🔒 Threshold saat ini: DIKUNCI' : '🔓 Threshold saat ini: TERBUKA'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {locked
                ? 'Pengguna tidak dapat mengubah threshold. Nilai sistem berlaku untuk semua.'
                : 'Pengguna dapat menggeser slider threshold saat login wajah.'}
            </p>
          </div>
          {/* Toggle switch */}
          <button
            onClick={() => saveLock(!locked)}
            disabled={saving}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none disabled:opacity-60 ${
              locked ? 'bg-red-500' : 'bg-gray-300'
            }`}
            aria-label="Toggle lock"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                locked ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
          <strong>Catatan:</strong> Backend selalu menerapkan kunci secara mandiri. Meski klien mengirim threshold
          berbeda, sistem akan menggunakan nilai threshold yang tersimpan di sini jika status kunci aktif.
        </div>
      </SectionCard>
    </div>
  );
};

export default SystemSettingsPage;
