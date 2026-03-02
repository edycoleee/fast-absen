import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../domain/hooks';
import { useCamera } from '../../../domain/hooks/useCamera';
import { useOvalGuide } from '../../../domain/hooks/useOvalGuide';
import AppSettingRepository from '../../../data/repositories/AppSettingRepository';

// ── State machine ──────────────────────────────────────────────
const STEP = {
  USERNAME: 'username',   // input username
  CAMERA:   'camera',     // camera open, waiting for capture
  VERIFYING:'verifying',  // sending to backend
  SUCCESS:  'success',    // login OK
  FAILED:   'failed',     // login failed, can retry
};

export default function FaceLoginPage() {
  const navigate  = useNavigate();
  const { loginFace } = useAuth();

  // ── State ────────────────────────────────────────────────────
  const [step,            setStep]           = useState(STEP.USERNAME);
  const [username,       setUsername]       = useState('');
  const [threshold,      setThreshold]      = useState(0.6);
  const [thresholdLocked, setThresholdLocked] = useState(false);
  const [message,        setMessage]        = useState('');
  const [countdown,      setCountdown]      = useState(null);

  // ── Camera hook ──────────────────────────────────────────────
  const overlayCanvasRef = useRef(null);
  const {
    videoRef,
    cameraActive,
    error: cameraError,
    startCamera,
    stopCamera,
    captureFrame,
  } = useCamera();

  // oval guide overlay (same as FaceRegistrationPage)
  useOvalGuide(overlayCanvasRef, videoRef, cameraActive, false);

  // ── Open camera after username submitted ─────────────────────
  useEffect(() => {
    if (step === STEP.CAMERA) {
      startCamera();
    }
    // stop camera when leaving camera step
    if (step !== STEP.CAMERA && step !== STEP.VERIFYING) {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Cleanup on unmount ───────────────────────────────────────
  useEffect(() => () => stopCamera(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch system threshold on mount ─────────────────────────
  useEffect(() => {
    AppSettingRepository.getFaceThreshold().then(({ threshold: t, locked }) => {
      setThreshold(t);
      setThresholdLocked(locked);
    });
  }, []);

  // ── Handle username form submit ──────────────────────────────
  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setMessage('Arahkan wajah ke dalam oval, lalu klik Verifikasi.');
    setStep(STEP.CAMERA);
  };

  // ── Capture & verify ─────────────────────────────────────────
  const handleVerify = async () => {
    const frame = captureFrame(0.95);
    if (!frame) {
      setMessage('Gagal mengambil gambar. Pastikan kamera aktif.');
      return;
    }

    setStep(STEP.VERIFYING);
    setMessage('Memverifikasi wajah…');

    try {
      const response = await loginFace(username.trim(), frame.base64, threshold);
      const menuGuard = response?.data?.menu_guard ?? {};

      setStep(STEP.SUCCESS);
      const name = response?.data?.username ?? username;
      setMessage(`Login berhasil! Halo, ${name}!`);

      // countdown 2 detik lalu redirect
      let c = 2;
      setCountdown(c);
      const interval = setInterval(() => {
        c -= 1;
        if (c <= 0) {
          clearInterval(interval);
          if (!menuGuard.is_admin && !menuGuard.is_kepala_unit) {
            navigate('/absensi-dashboard');
          } else {
            navigate('/dashboard');
          }
        } else {
          setCountdown(c);
        }
      }, 1000);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Wajah tidak dikenali. Coba lagi.';
      setMessage(msg);
      setStep(STEP.FAILED);
    }
  };

  // ── Retry – kembali ke kamera tanpa hapus username ────────────
  const handleRetry = () => {
    setMessage('Arahkan wajah ke dalam oval, lalu klik Verifikasi.');
    setStep(STEP.CAMERA);
  };

  // ── Ganti user – kembali ke step username ────────────────────
  const handleChangeUser = () => {
    setStep(STEP.USERNAME);
    setMessage('');
  };

  const isProcessing = step === STEP.VERIFYING;

  // ════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-4 py-8">
      <div className="w-full max-w-md">

        {/* ── Logo & title ─────────────────────────────────── */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-4xl">👤</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Login Absensi – Wajah</h1>
          <p className="text-gray-500 mt-1 text-sm">Sistem Absensi RSUD Sulfat</p>
        </div>

        {/* ── Back to landing ──────────────────────────────── */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700 flex items-center text-sm font-medium"
          >
            ← Kembali ke beranda
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* ══ STEP: USERNAME ══════════════════════════════ */}
          {step === STEP.USERNAME && (
            <div className="p-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Masukkan Username</h2>
              <p className="text-sm text-gray-500 mb-6">
                Masukkan username Anda, lalu kamera akan terbuka untuk verifikasi wajah.
              </p>
              <form onSubmit={handleUsernameSubmit} className="space-y-5">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-field"
                    placeholder="Masukkan username"
                    required
                    autoFocus
                  />
                </div>

                {/* Threshold slider */}
                <div>
                  <label className="text-sm font-medium text-gray-700 flex justify-between mb-1">
                    <span>Sensitivitas pengenalan</span>
                    <span className="flex items-center gap-2">
                      <span className="text-green-700 font-semibold">{threshold.toFixed(2)}</span>
                      {thresholdLocked && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                          🔒 Dikunci admin
                        </span>
                      )}
                    </span>
                  </label>
                  <input
                    type="range" min="0.3" max="0.9" step="0.05"
                    value={threshold}
                    onChange={(e) => !thresholdLocked && setThreshold(parseFloat(e.target.value))}
                    disabled={thresholdLocked}
                    className={`w-full accent-green-600 ${
                      thresholdLocked ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>Longgar (0.3)</span>
                    <span>Ketat (0.9)</span>
                  </div>
                  {thresholdLocked && (
                    <p className="text-xs text-red-600 mt-1">
                      Threshold dikunci oleh admin. Nilai tidak dapat diubah.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-md"
                >
                  Buka Kamera →
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate('/login-absensi')}
                  className="text-sm text-green-600 hover:underline"
                >
                  Login dengan password
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP: CAMERA & VERIFYING ════════════════════ */}
          {(step === STEP.CAMERA || step === STEP.VERIFYING) && (
            <div className="p-6">
              {/* username badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Pengguna:</span>
                  <span className="font-semibold text-gray-800 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                    {username}
                  </span>
                </div>
                <button
                  onClick={handleChangeUser}
                  disabled={isProcessing}
                  className="text-xs text-gray-400 hover:text-gray-600 underline disabled:opacity-40"
                >
                  Ganti user
                </button>
              </div>

              {/* camera viewport */}
              <div className="relative w-full rounded-xl overflow-hidden bg-gray-900 aspect-[3/4] mb-4">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute inset-0 w-full h-full"
                />
                {!cameraActive && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                    Memulai kamera…
                  </div>
                )}
                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <p className="text-red-400 text-sm text-center">{cameraError}</p>
                  </div>
                )}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="text-3xl mb-2 animate-spin">⏳</div>
                      <p className="text-sm">Memverifikasi wajah…</p>
                    </div>
                  </div>
                )}
              </div>

              {/* instruction */}
              {message && (
                <p className="text-xs text-gray-500 text-center mb-3">{message}</p>
              )}

              {/* verify button */}
              <button
                onClick={handleVerify}
                disabled={!cameraActive || isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? '⏳ Memverifikasi…' : '🔍 Verifikasi Sekarang'}
              </button>
            </div>
          )}

          {/* ══ STEP: SUCCESS ════════════════════════════════ */}
          {step === STEP.SUCCESS && (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-green-700 mb-2">Login Berhasil!</h2>
              <p className="text-gray-600 text-sm mb-4">{message}</p>
              {countdown !== null && (
                <p className="text-sm text-gray-400">
                  Mengalihkan dalam <span className="font-bold text-green-600">{countdown}</span> detik…
                </p>
              )}
            </div>
          )}

          {/* ══ STEP: FAILED ═════════════════════════════════ */}
          {step === STEP.FAILED && (
            <div className="p-8">
              <div className="text-center mb-5">
                <div className="text-5xl mb-3">❌</div>
                <h2 className="text-lg font-bold text-red-600 mb-2">Verifikasi Gagal</h2>
                <p className="text-sm text-gray-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {message}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleRetry}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-md"
                >
                  🔄 Coba Lagi
                </button>
                <button
                  onClick={handleChangeUser}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl border border-gray-200 transition-colors"
                >
                  Ganti Username
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          © 2026 RSUD Sulfat. All rights reserved.
        </div>
      </div>
    </div>
  );
}
