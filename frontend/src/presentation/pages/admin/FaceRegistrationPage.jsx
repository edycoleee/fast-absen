import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import PegawaiRepository from '../../../data/repositories/PegawaiRepository';
import FaceRepository from '../../../data/repositories/FaceRepository';
import { useCamera } from '../../../domain/hooks/useCamera';
import { useCapture } from '../../../domain/hooks/useCapture';
import { useFaceValidation } from '../../../domain/hooks/useFaceValidation';
import { useOvalGuide } from '../../../domain/hooks/useOvalGuide';

/* ─────────────────────────────── constants ─────────────────────────────── */
const TABS = [
  { id: 'camera',         label: '📷 Kamera' },
  { id: 'upload-single',  label: '🖼️ Upload Satu' },
  { id: 'upload-multi',   label: '📁 Upload Banyak' },
];

/* ─────────────────────────── CaptureGrid sub-component ──────────────────── */
function CaptureGrid({ captures, onDelete }) {
  if (!captures.length)
    return (
      <p className="text-sm text-gray-400 italic text-center py-4">
        Belum ada foto yang ditangkap.
      </p>
    );

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-3">
      {captures.map((c, i) => (
        <div key={c.id} className="relative group rounded overflow-hidden border border-gray-200">
          <img src={c.image?.dataUrl} alt={`capture-${i}`} className="w-full h-20 object-cover" />
          {/* overlay info */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center">
            {c.image?.confidence != null && (
              <span className="text-xs text-white mb-1">
                {(c.image.confidence * 100).toFixed(0)}%
              </span>
            )}
            <button
              onClick={() => onDelete(c.id)}
              className="text-xs bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600"
            >
              Hapus
            </button>
          </div>
          {/* small badge */}
          <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded">
            {i + 1}
          </span>
          {c.image?.valid === false && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] px-1 rounded">
              ✕
            </span>
          )}
          {c.image?.valid === true && (
            <span className="absolute top-1 right-1 bg-green-500 text-white text-[10px] px-1 rounded">
              ✓
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── CameraSection sub-component ────────────────── */
function CameraSection({
  videoRef,
  overlayCanvasRef,
  cameraActive,
  cameraError,
  startCamera,
  stopCamera,
  faceInPosition,
  isAutoCapturing,
  captures,
  targetCount,
  onManualCapture,
  onStartAuto,
  onStopAuto,
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* video container */}
      <div className="relative w-full max-w-sm mx-auto rounded-lg overflow-hidden bg-gray-900 aspect-[3/4]">
        <video
          ref={videoRef}
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]" /* mirror */
        />
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full"
        />
        {!cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            {cameraError ? (
              <span className="text-red-400 text-xs px-4 text-center">{cameraError}</span>
            ) : (
              <span>Kamera belum aktif</span>
            )}
          </div>
        )}
        {cameraActive && isAutoCapturing && (
          <div className="absolute bottom-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
            ● REC
          </div>
        )}
      </div>

      {/* camera controls */}
      <div className="flex flex-wrap gap-2 justify-center">
        {!cameraActive ? (
          <button
            onClick={startCamera}
            className="btn-primary text-sm px-4 py-2"
          >
            Buka Kamera
          </button>
        ) : (
          <>
            <button
              onClick={onManualCapture}
              disabled={isAutoCapturing}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-40"
            >
              📸 Ambil Foto
            </button>
            {!isAutoCapturing ? (
              <button
                onClick={onStartAuto}
                disabled={captures.length >= targetCount}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-40"
              >
                ⏱ Auto Capture
              </button>
            ) : (
              <button
                onClick={onStopAuto}
                className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded-lg"
              >
                ⏹ Stop Auto
              </button>
            )}
            <button
              onClick={stopCamera}
              className="bg-gray-500 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg"
            >
              Tutup Kamera
            </button>
          </>
        )}
      </div>

      {faceInPosition && cameraActive && (
        <p className="text-xs text-green-600 font-medium">
          ✓ Wajah terdeteksi dalam posisi yang baik
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════ VerifyCard component ═══════════════════════ */
function VerifyCard({ idPegawai }) {
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const [camActive, setCamActive] = useState(false);
  const [camError, setCamError]   = useState(null);
  const streamRef = useRef(null);

  const [preview, setPreview]       = useState(null); // dataUrl
  const [b64, setB64]               = useState(null); // base64 string
  const [threshold, setThreshold]   = useState(0.6);
  const [verifying, setVerifying]   = useState(false);
  const [result, setResult]         = useState(null);  // { verified, similarity, message }
  const [verifyError, setVerifyError] = useState(null);

  /* camera helpers */
  const startCam = async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setCamActive(true); // mount video element dulu, stream di-attach via useEffect
    } catch {
      setCamError('Kamera tidak dapat diakses.');
    }
  };

  // Attach stream ke video element setelah camActive true (element sudah ter-mount)
  useEffect(() => {
    if (camActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [camActive]);

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamActive(false);
  };

  const snapFromCam = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth  || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPreview(dataUrl);
    setB64(dataUrl.split(',')[1]);
    setResult(null);
    setVerifyError(null);
    stopCam();
  };

  const loadFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setPreview(dataUrl);
      setB64(dataUrl.split(',')[1]);
      setResult(null);
      setVerifyError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleVerify = async () => {
    if (!b64) return;
    setVerifying(true);
    setVerifyError(null);
    setResult(null);
    try {
      const res = await FaceRepository.verifyFace(idPegawai, b64, threshold);
      setResult(res?.data ?? res);
    } catch (err) {
      setVerifyError(
        err?.response?.data?.detail || err?.message || 'Verifikasi gagal.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setB64(null);
    setResult(null);
    setVerifyError(null);
    stopCam();
  };

  const similarity  = result?.similarity ?? null;
  const verified    = result?.verified   ?? null;
  const pct         = similarity != null ? Math.round(similarity * 100) : null;

  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-1">🔍 Test Verifikasi Wajah</h2>
      <p className="text-xs text-gray-500 mb-4">
        Upload atau ambil foto baru untuk menguji apakah cocok dengan embedding yang tersimpan.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT: input */}
        <div className="flex flex-col gap-3">

          {/* Camera preview */}
          {camActive && (
            <div className="relative rounded-lg overflow-hidden bg-gray-900 aspect-[3/4] w-full max-w-sm mx-auto">
              <video ref={videoRef} muted playsInline autoPlay
                className="w-full h-full object-cover scale-x-[-1]" />
              <button
                onClick={snapFromCam}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white text-gray-800 text-sm font-medium px-4 py-1.5 rounded-full shadow hover:bg-gray-100"
              >
                📸 Ambil
              </button>
            </div>
          )}

          {/* Photo preview */}
          {preview && !camActive && (
            <div className="relative w-full max-w-xs mx-auto rounded-lg overflow-hidden border border-gray-200">
              <img src={preview} alt="preview" className="w-full object-cover max-h-48" />
              <button
                onClick={reset}
                className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded hover:bg-black/80"
              >
                Ganti
              </button>
            </div>
          )}

          {/* Buttons */}
          {!camActive && !preview && (
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={startCam}
                className="btn-primary text-sm px-4 py-2"
              >
                📷 Buka Kamera
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg border border-gray-300"
              >
                🖼️ Upload Foto
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { loadFile(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
          )}

          {camActive && (
            <div className="flex gap-2 justify-center">
              <button onClick={stopCam} className="bg-gray-500 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg">
                Tutup Kamera
              </button>
            </div>
          )}

          {camError && <p className="text-xs text-red-500 text-center">{camError}</p>}

          {/* Threshold slider */}
          <div className="mt-1">
            <label className="text-xs text-gray-600 flex justify-between mb-1">
              <span>Threshold kemiripan</span>
              <span className="font-medium text-gray-800">{threshold.toFixed(2)}</span>
            </label>
            <input
              type="range" min="0.3" max="0.9" step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>Longgar (0.3)</span>
              <span>Ketat (0.9)</span>
            </div>
          </div>
        </div>

        {/* RIGHT: result */}
        <div className="flex flex-col justify-between gap-4">

          {/* Result display */}
          {result ? (
            <div className={`rounded-xl border p-5 text-center ${
              verified
                ? 'bg-green-50 border-green-300'
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="text-4xl mb-2">{verified ? '✅' : '❌'}</div>
              <p className={`text-lg font-bold ${verified ? 'text-green-700' : 'text-red-700'}`}>
                {verified ? 'Wajah Cocok' : 'Wajah Tidak Cocok'}
              </p>

              {/* Similarity bar */}
              <div className="mt-4 mx-auto max-w-xs">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Similarity</span>
                  <span className="font-medium">{pct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: verified ? '#16a34a' : '#dc2626',
                    }}
                  />
                </div>
                <div className="relative mt-0.5">
                  <div
                    className="absolute top-0 h-3 w-px bg-gray-500"
                    style={{ left: `${threshold * 100}%` }}
                  />
                  <p className="text-[10px] text-gray-400 mt-1 text-center">
                    Threshold: {Math.round(threshold * 100)}%
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-500">{result.message}</p>
            </div>
          ) : verifyError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 text-center">
              ❌ {verifyError}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-400 text-sm">
              Hasil verifikasi akan tampil di sini
            </div>
          )}

          {/* Action button */}
          <button
            onClick={handleVerify}
            disabled={!b64 || verifying}
            className="btn-primary py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {verifying ? '⏳ Memverifikasi…' : '🔍 Verifikasi Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ FaceRegistrationPage ═══════════════════════ */
export default function FaceRegistrationPage() {
  const { idPegawai } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode') || 'register'; // 'register' | 'update'

  /* ── pegawai meta ─────────────────────────────────────────────────────── */
  const [pegawai, setPegawai]             = useState(null);
  const [embedCount, setEmbedCount]       = useState(null);
  const [loadingMeta, setLoadingMeta]     = useState(true);

  /* ── UI state ─────────────────────────────────────────────────────────── */
  const [activeTab, setActiveTab]         = useState('camera');
  const [targetCount, setTargetCount]     = useState(5);
  const [submitting, setSubmitting]       = useState(false);
  const [submitError, setSubmitError]     = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);

  /* ── camera & capture hooks ───────────────────────────────────────────── */
  const { videoRef, cameraActive, error: cameraError, startCamera, stopCamera, captureFrame } = useCamera();
  const { captures, addCapture, deleteCapture, resetCaptures, startAutoCapture, stopAutoCapture } = useCapture({ targetCaptures: targetCount });
  const { faceInPosition, validateFace } = useFaceValidation();
  const overlayCanvasRef = useRef(null);
  useOvalGuide(overlayCanvasRef, videoRef, cameraActive, faceInPosition);

  /* ── file input refs ──────────────────────────────────────────────────── */
  const singleFileRef = useRef(null);
  const multiFileRef  = useRef(null);

  /* ── load meta on mount ───────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [pData, eData] = await Promise.all([
          PegawaiRepository.getById(idPegawai),
          FaceRepository.getEmbeddingCount(idPegawai),
        ]);
        if (cancelled) return;
        setPegawai(pData?.data ?? pData);
        setEmbedCount(eData?.data?.total_embeddings ?? eData?.count ?? eData?.total ?? 0);
      } catch {
        // non-fatal: pegawai info optional
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [idPegawai]);

  /* ── stop camera & auto when switching tabs ───────────────────────────── */
  useEffect(() => {
    stopAutoCapture();
    setIsAutoCapturing(false);
    if (cameraActive) stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* ── auto-submit after targetCount reached ────────────────────────────── */
  useEffect(() => {
    if (isAutoCapturing && captures.length >= targetCount) {
      stopAutoCapture();
      setIsAutoCapturing(false);
      // brief pause then auto-submit
      const t = setTimeout(() => handleSubmit(), 800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captures.length, isAutoCapturing, targetCount]);

  /* ── capture helpers ──────────────────────────────────────────────────── */
  const handleCapture = useCallback(async () => {
    if (captures.length >= targetCount) return;
    const frame = captureFrame();
    if (!frame) return;
    console.log('Base64 capture:', frame.base64);
    // Debug: log sebelum addCapture
    console.log('addCapture input:', {
      dataUrl: frame.dataUrl,
      base64: frame.base64,
    });
    const result = await validateFace(frame.base64).catch(() => null);
    addCapture(
      {
        dataUrl:    frame.dataUrl,
        base64:     frame.base64,
        confidence: result?.confidence ?? null,
        valid:      result ? !result.no_face : null,
      }
    );
  }, [captures.length, targetCount, captureFrame, validateFace, addCapture]);

  const handleManualCapture = useCallback(() => {
    handleCapture();
  }, [handleCapture]);

  const handleStartAuto = useCallback(() => {
    setIsAutoCapturing(true);
    startAutoCapture(handleCapture);
  }, [startAutoCapture, handleCapture]);

  const handleStopAuto = useCallback(() => {
    stopAutoCapture();
    setIsAutoCapturing(false);
  }, [stopAutoCapture]);

  /* ── file upload helper ───────────────────────────────────────────────── */
  const processFiles = useCallback(async (files) => {
    for (const file of files) {
      if (captures.length >= targetCount) break;
      if (!file.type.startsWith('image/')) continue;
      await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target.result;
          const base64  = dataUrl.split(',')[1];
          // Debug: log base64
          console.log('Base64 upload:', base64);
          const result  = await validateFace(base64).catch(() => null);
          addCapture({
            dataUrl,
            base64,
            confidence: result?.confidence ?? null,
            valid:      result ? !result.no_face : null,
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
  }, [captures.length, targetCount, validateFace, addCapture]);

  /* ── delete embedding (update mode) ──────────────────────────────────── */
  const [deletingEmbed, setDeletingEmbed] = useState(false);
  const handleDeleteEmbeddings = async () => {
    if (!window.confirm('Hapus semua data wajah pegawai ini?')) return;
    setDeletingEmbed(true);
    try {
      await FaceRepository.deleteEmbeddings(idPegawai);
      setEmbedCount(0);
    } catch (err) {
      alert('Gagal menghapus: ' + (err?.message || 'Error'));
    } finally {
      setDeletingEmbed(false);
    }
  };

  /* ── submit ───────────────────────────────────────────────────────────── */
  const handleSubmit = useCallback(async () => {
    if (captures.length < 1) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Pastikan hanya base64 string yang valid
      const images = captures.map((c) => c.image?.base64).filter((b64) => typeof b64 === 'string' && b64.length > 0);
      if (images.length < 1) {
        setSubmitError('Tidak ada foto valid untuk dikirim.');
        setSubmitting(false);
        return;
      }
      await FaceRepository.registerFaces(idPegawai, images);
      setSubmitSuccess(true);
      setTimeout(() => navigate('/pegawai'), 1500);
    } catch (err) {
      // Ambil error detail dari backend (422)
      let detail = err?.response?.data?.detail || err?.message || 'Gagal menyimpan data wajah.';
      // Jika error detail berupa string panjang, tampilkan semua
      if (typeof detail === 'string' && detail.length > 0) {
        setSubmitError(detail);
      } else if (Array.isArray(detail)) {
        setSubmitError(detail.join('\n'));
      } else {
        setSubmitError('Gagal menyimpan data wajah.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [captures, idPegawai, navigate]);

  /* ── derived ──────────────────────────────────────────────────────────── */
  const progress = Math.min(captures.length / targetCount, 1);
  const canSubmit = captures.length >= 1 && !submitting && !submitSuccess;

  /* ═══════════════════════════════ RENDER ══════════════════════════════ */
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/pegawai')}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← Kembali
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {mode === 'update' ? 'Update Data Wajah' : 'Registrasi Wajah Pegawai'}
          </h1>
          {loadingMeta ? (
            <p className="text-sm text-gray-400">Memuat data pegawai…</p>
          ) : pegawai ? (
            <p className="text-sm text-gray-500">
              {pegawai.nama_lengkap ?? pegawai.nama ?? '—'} · NIP {pegawai.nip ?? '—'}
              {embedCount != null && (
                <span className="ml-2 text-xs text-blue-600">
                  ({embedCount} embedding tersimpan)
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-gray-400">ID: {idPegawai}</p>
          )}
        </div>
      </div>

      {/* ── Success banner ─────────────────────────────────────────────── */}
      {submitSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg text-green-700 text-sm text-center">
          ✅ Data wajah berhasil disimpan! Mengalihkan ke halaman pegawai…
        </div>
      )}

      {/* ── Error banner ───────────────────────────────────────────────── */}
      {submitError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm whitespace-pre-line">
          ❌ {submitError}
        </div>
      )}

      {/* ── Main card ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-6">

        {/* target count + delete block */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Target foto:</span>
            {[5, 10].map((n) => (
              <label key={n} className="flex items-center gap-1 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="targetCount"
                  value={n}
                  checked={targetCount === n}
                  onChange={() => { setTargetCount(n); resetCaptures(); }}
                  className="accent-primary-600"
                />
                <span>{n} foto {n === 10 ? '(akurat)' : '(cepat)'}</span>
              </label>
            ))}
          </div>

          {/* delete existing embeddings (update mode or if already have data) */}
          {(mode === 'update' || (embedCount != null && embedCount > 0)) && (
            <button
              onClick={handleDeleteEmbeddings}
              disabled={deletingEmbed}
              className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg disabled:opacity-40"
            >
              {deletingEmbed ? 'Menghapus…' : '🗑 Hapus Semua Embedding'}
            </button>
          )}
        </div>

        {/* ── Input method tabs ────────────────────────────────────────── */}
        <div className="flex border-b border-gray-200 mb-5 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-sm px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-700 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Two-column layout ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT: input method */}
          <div>
            {activeTab === 'camera' && (
              <CameraSection
                videoRef={videoRef}
                overlayCanvasRef={overlayCanvasRef}
                cameraActive={cameraActive}
                cameraError={cameraError}
                startCamera={startCamera}
                stopCamera={stopCamera}
                faceInPosition={faceInPosition}
                isAutoCapturing={isAutoCapturing}
                captures={captures}
                targetCount={targetCount}
                onManualCapture={handleManualCapture}
                onStartAuto={handleStartAuto}
                onStopAuto={handleStopAuto}
              />
            )}

            {activeTab === 'upload-single' && (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 transition"
                  onClick={() => singleFileRef.current?.click()}
                >
                  <p className="text-3xl mb-2">🖼️</p>
                  <p className="text-sm text-gray-500">Klik untuk memilih satu foto</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP</p>
                </div>
                <input
                  ref={singleFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) processFiles([e.target.files[0]]);
                    e.target.value = '';
                  }}
                />
                <p className="text-xs text-gray-400">
                  Pastikan wajah terlihat jelas, pencahayaan cukup.
                </p>
              </div>
            )}

            {activeTab === 'upload-multi' && (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 transition"
                  onClick={() => multiFileRef.current?.click()}
                >
                  <p className="text-3xl mb-2">📁</p>
                  <p className="text-sm text-gray-500">Klik untuk memilih beberapa foto</p>
                  <p className="text-xs text-gray-400 mt-1">Pilih hingga {targetCount} foto sekaligus</p>
                </div>
                <input
                  ref={multiFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) processFiles(Array.from(e.target.files));
                    e.target.value = '';
                  }}
                />
                <p className="text-xs text-gray-400">
                  Foto akan divalidasi satu per satu. Maksimum {targetCount} foto.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: captures + progress */}
          <div>
            {/* progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Foto terkumpul</span>
                <span>{captures.length} / {targetCount}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${progress * 100}%`,
                    backgroundColor: progress >= 1 ? '#16a34a' : '#3b82f6',
                  }}
                />
              </div>
            </div>

            {/* grid */}
            <CaptureGrid captures={captures} onDelete={deleteCapture} />

            {/* reset + submit */}
            <div className="flex gap-2 mt-4">
              {captures.length > 0 && (
                <button
                  onClick={resetCaptures}
                  className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg"
                >
                  Reset Foto
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-1 btn-primary py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting
                  ? 'Menyimpan…'
                  : `💾 Simpan ${captures.length} Foto Wajah`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── tips ───────────────────────────────────────────────────────── */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>Tips registrasi wajah:</strong>
        <ul className="mt-1 list-disc list-inside space-y-0.5">
          <li>Gunakan pencahayaan yang cukup, hindari backlight</li>
          <li>Arahkan wajah ke depan kamera dan masuk ke dalam oval</li>
          <li>Variasikan sedikit sudut untuk hasil yang lebih akurat</li>
          <li>Hindari menggunakan kacamata gelap atau masker</li>
        </ul>
      </div>

      {/* ── Verification Test Card ──────────────────────────────────────── */}
      {embedCount != null && embedCount > 0 && (
        <VerifyCard idPegawai={idPegawai} />
      )}
    </div>
  );
}
