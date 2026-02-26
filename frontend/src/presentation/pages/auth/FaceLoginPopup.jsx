import { useState, useEffect, useRef } from 'react';
import { useCamera } from '../../../domain/hooks/useCamera';
import AuthRepository from '../../../data/repositories/AuthRepository';
import './FaceLoginPopup.css';

/**
 * FaceLoginPopup — Halaman popup face recognition (OAuth2-style)
 *
 * Dibuka oleh parent window melalui window.open().
 * Membaca username dan threshold dari URL query params,
 * menangkap wajah dari kamera, memverifikasi via backend,
 * lalu mengirim hasilnya ke parent window via postMessage.
 *
 * Route: /login-face-popup?username=...&threshold=0.6
 */

// ── State machine values ──────────────────────────────────────
const STATUS = {
  IDLE:       'idle',
  CAPTURING:  'capturing',
  VERIFYING:  'verifying',
  SUCCESS:    'success',
  FAILED:     'failed',
};

// ── Kirim hasil ke parent window ──────────────────────────────
const sendToParent = (payload) => {
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(
      { type: 'FACE_LOGIN_RESULT', ...payload },
      window.location.origin
    );
  }
};

export default function FaceLoginPopup() {
  // ─── URL params ───────────────────────────────────────────────
  const params    = new URLSearchParams(window.location.search);
  const username  = params.get('username') || '';
  const threshold = parseFloat(params.get('threshold') || '0.6');

  // ─── State ────────────────────────────────────────────────────
  const [status,     setStatus]     = useState(STATUS.IDLE);
  const [message,    setMessage]    = useState('');
  const [confidence, setConfidence] = useState(0);

  // ─── Camera hook ──────────────────────────────────────────────
  const { videoRef, cameraActive, error: cameraError, startCamera, stopCamera, captureFrame } = useCamera();

  // Canvas hidden untuk capture
  const canvasRef = useRef(null);

  // ─── Lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    if (!username.trim()) {
      setMessage('Username tidak ditemukan. Tutup popup dan coba lagi.');
      setStatus(STATUS.FAILED);
      sendToParent({ success: false, message: 'Username tidak tersedia di URL params' });
      return;
    }

    startCamera().then(() => {
      setMessage('Arahkan wajah ke dalam panduan oval, lalu klik Verifikasi.');
    });

    return () => stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Jika kamera error, tampilkan pesan
  useEffect(() => {
    if (cameraError) {
      setMessage(cameraError);
      setStatus(STATUS.FAILED);
      sendToParent({ success: false, message: cameraError });
    }
  }, [cameraError]);

  // ─── Capture & Verify ─────────────────────────────────────────
  const captureAndVerify = async () => {
    setStatus(STATUS.CAPTURING);
    setMessage('Mengambil gambar...');

    const captured = captureFrame(0.95);
    if (!captured) {
      setStatus(STATUS.FAILED);
      setMessage('Gagal mengambil gambar. Pastikan kamera aktif.');
      return;
    }

    setStatus(STATUS.VERIFYING);
    setMessage('Memverifikasi wajah...');

    try {
      const response = await AuthRepository.loginFace(username, captured.base64, threshold);

      if (!response.success) throw new Error(response.message || 'Verifikasi gagal');

      const conf = response.data?.face_similarity ?? response.data?.confidence ?? 0;
      const name = response.data?.username ?? username;

      setConfidence(conf);
      setStatus(STATUS.SUCCESS);
      setMessage(`Login berhasil! Halo, ${name}!`);
      stopCamera();

      // Kirim data lengkap ke parent
      sendToParent({ success: true, data: response.data, message: 'Face login successful' });

      // Tutup popup setelah 1.5 detik
      setTimeout(() => window.close(), 1500);
    } catch (err) {
      const msg = err.response?.data?.detail
        || err.response?.data?.message
        || err.message
        || 'Wajah tidak dikenali, coba lagi.';
      setStatus(STATUS.FAILED);
      setMessage(msg);
    }
  };

  // ─── Retry ───────────────────────────────────────────────────
  const handleRetry = () => {
    setStatus(STATUS.IDLE);
    setConfidence(0);
    setMessage('Arahkan wajah ke dalam panduan oval, lalu klik Verifikasi.');
    if (!cameraActive) {
      startCamera();
    }
  };

  // ─── Batal / Tutup ────────────────────────────────────────────
  const handleCancel = () => {
    stopCamera();
    sendToParent({ success: false, message: 'Dibatalkan oleh pengguna' });
    window.close();
  };

  // ─── Render ───────────────────────────────────────────────────
  const isProcessing = status === STATUS.CAPTURING || status === STATUS.VERIFYING;

  return (
    <div className="flp-root">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flp-header">
        <h2 className="flp-title">🔐 Login Wajah</h2>
        <div className="flp-username-badge">{username || '(tidak ada username)'}</div>
        <button onClick={handleCancel} className="flp-btn-close" title="Tutup">✕</button>
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="flp-body">

        {/* Kamera */}
        <div className="flp-camera-section">
          <div className="flp-camera-box">
            {/* Placeholder sebelum kamera aktif */}
            {!cameraActive && status !== STATUS.SUCCESS && (
              <div className="flp-placeholder">
                <span className="flp-placeholder-icon">📷</span>
                <span>Memulai kamera...</span>
              </div>
            )}

            {/* Video stream — autoPlay muted playsInline wajib untuk mobile */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="flp-video"
              style={{ display: cameraActive ? 'block' : 'none' }}
            />

            {/* Canvas hidden untuk capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Oval guide overlay — tampil saat kamera aktif & idle/capturing */}
            {cameraActive && !isProcessing && status !== STATUS.SUCCESS && (
              <div className="flp-oval-overlay">
                <svg viewBox="0 0 100 100" className="flp-oval-svg" aria-hidden="true">
                  <ellipse
                    cx="50" cy="50" rx="30" ry="38"
                    fill="none"
                    stroke="white"
                    strokeWidth="0.6"
                    strokeDasharray="4 3"
                    opacity="0.85"
                    className="flp-oval-ellipse"
                  />
                </svg>
              </div>
            )}

            {/* Overlay spinner saat verifying */}
            {status === STATUS.VERIFYING && (
              <div className="flp-verifying-overlay">
                <div className="flp-spinner" />
                <span>Memverifikasi...</span>
              </div>
            )}

            {/* Overlay success */}
            {status === STATUS.SUCCESS && (
              <div className="flp-success-overlay">
                <div className="flp-success-icon">✓</div>
              </div>
            )}
          </div>
        </div>

        {/* Status text */}
        <div className="flp-status">
          {status === STATUS.SUCCESS ? (
            <div className="flp-status-success">
              <p className="flp-status-text">{message}</p>
              {confidence > 0 && (
                <p className="flp-confidence">
                  Kecocokan: {(confidence * 100).toFixed(1)}%
                </p>
              )}
            </div>
          ) : (
            <p className="flp-status-text">{message}</p>
          )}
        </div>

        {/* Tombol aksi */}
        <div className="flp-actions">
          {/* Idle / Capturing: tampilkan tombol Verifikasi + Batal */}
          {(status === STATUS.IDLE || status === STATUS.CAPTURING) && (
            <>
              <button
                onClick={captureAndVerify}
                disabled={!cameraActive || isProcessing}
                className="flp-btn-primary"
              >
                📸 Ambil & Verifikasi
              </button>
              <button onClick={handleCancel} className="flp-btn-secondary">
                Batal
              </button>
            </>
          )}

          {/* Verifying: tombol disabled */}
          {status === STATUS.VERIFYING && (
            <button disabled className="flp-btn-primary flp-btn-disabled">
              ⏳ Memverifikasi...
            </button>
          )}

          {/* Failed: Coba Lagi + Batal */}
          {status === STATUS.FAILED && (
            <>
              <button onClick={handleRetry} className="flp-btn-retry">
                🔄 Coba Lagi
              </button>
              <button onClick={handleCancel} className="flp-btn-secondary">
                Batal
              </button>
            </>
          )}

          {/* Success: jendela tutup otomatis */}
          {status === STATUS.SUCCESS && (
            <p className="flp-redirect-msg">Jendela akan tertutup otomatis...</p>
          )}
        </div>

        {/* Info threshold */}
        <div className="flp-threshold-info">
          <small>Threshold kecocokan: {(threshold * 100).toFixed(0)}%</small>
        </div>
      </div>
    </div>
  );
}
