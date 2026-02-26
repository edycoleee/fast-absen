import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../domain/hooks';
import AuthRepository from '../../../data/repositories/AuthRepository';

// ─── icons sebagai inline SVG ───────────────────────────────

const IconSpinner = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const IconKey = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
);

const IconFace = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ─── TAB: Login dengan Username + Password ────────────────────

const PasswordTab = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa username dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Masukkan username"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Masukkan password"
          required
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? <><IconSpinner /> Memproses...</> : 'Masuk'}
      </button>
    </form>
  );
};

// ─── FACE LOGIN: popup window (OAuth2-style) ────────────────────
// Parent membuka popup /login-face-popup?username=...
// Popup mengirim hasil via postMessage → parent hydrate auth state

const FaceTab = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [waiting,  setWaiting]  = useState(false); // popup sedang terbuka
  const [error,    setError]    = useState('');
  const [checking, setChecking] = useState(false); // sedang validasi username

  const { setAuthData } = useAuth();

  // ── Validasi username lalu buka popup ────────────────────────
  const openFacePopup = async () => {
    if (!username.trim()) return;
    setError('');
    setChecking(true);

    // Cek username dulu sebelum buka popup — hindari buka kamera sia-sia
    try {
      await AuthRepository.checkUsername(username.trim());
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Username tidak ditemukan atau akun tidak aktif.';
      setError(msg);
      setChecking(false);
      return; // STOP — jangan buka popup
    } finally {
      setChecking(false);
    }
    setError('');
    setWaiting(true);

    // Posisi tengah layar
    const w    = 500;
    const h    = 700;
    const left = Math.round((screen.width  - w) / 2);
    const top  = Math.round((screen.height - h) / 2);

    const popup = window.open(
      `/login-face-popup?username=${encodeURIComponent(username.trim())}&threshold=0.6`,
      'faceLoginPopup',
      `width=${w},height=${h},left=${left},top=${top},resizable=no,scrollbars=no`
    );

    if (!popup) {
      setWaiting(false);
      setError('Popup diblokir oleh browser. Izinkan popup untuk halaman ini, lalu coba lagi.');
      return;
    }

    // ── Listener untuk menerima hasil dari popup ──────────────────
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'FACE_LOGIN_RESULT') return;

      window.removeEventListener('message', handleMessage);
      clearInterval(closedCheck);
      setWaiting(false);

      if (event.data.success) {
        // Hydrate auth state dari token yang diterima lalu navigasi
        setAuthData(event.data.data);
        onSuccess();
      } else {
        const msg = event.data.message;
        // Jangan tampilkan error jika user sengaja membatalkan
        if (msg && msg !== 'Dibatalkan oleh pengguna') {
          setError(msg);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Bersihkan listener bila popup ditutup paksa (tanpa kirim pesan)
    const closedCheck = setInterval(() => {
      if (popup.closed) {
        clearInterval(closedCheck);
        window.removeEventListener('message', handleMessage);
        setWaiting(false);
      }
    }, 500);
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        <strong>Cara penggunaan:</strong>
        <ol className="mt-1 ml-4 list-decimal space-y-1">
          <li>Masukkan username</li>
          <li>Klik <em>Login dengan Wajah</em></li>
          <li>Pada popup yang muncul, hadapkan wajah ke kamera lalu klik <em>Verifikasi</em></li>
        </ol>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Masukkan username Anda"
          disabled={waiting}
          onKeyDown={(e) => e.key === 'Enter' && username.trim() && !waiting && !checking && openFacePopup()}
        />
      </div>

      <button
        onClick={openFacePopup}
        disabled={!username.trim() || waiting || checking}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {checking ? (
          <><IconSpinner /> Memeriksa username...</>
        ) : waiting ? (
          <><IconSpinner /> Menunggu verifikasi wajah...</>
        ) : (
          <><IconFace /> Login dengan Wajah</>
        )}
      </button>

      {waiting && (
        <p className="text-center text-xs text-gray-500 leading-relaxed">
          Selesaikan verifikasi wajah pada popup yang terbuka.<br />
          Jika popup tidak muncul, izinkan popup di browser Anda.
        </p>
      )}
    </div>
  );
};

// ─── HALAMAN UTAMA ────────────────────────────────────────────

const LoginAbsensi = () => {
  const [tab, setTab] = useState('password'); // 'password' | 'face'
  const navigate = useNavigate();

  const handleSuccess = () => navigate('/absensi-dashboard');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* Back */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 flex items-center text-sm font-medium"
            >
              ← Kembali ke beranda
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-4xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Login Absensi</h1>
            <p className="text-gray-600 mt-1 text-sm">Sistem Absensi RSUD Sulfat</p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6 gap-1">
            <button
              onClick={() => setTab('password')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === 'password'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <IconKey /> Password
            </button>
            <button
              onClick={() => setTab('face')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === 'face'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <IconFace /> Login Wajah
            </button>
          </div>

          {/* Content */}
          {tab === 'password' ? (
            <PasswordTab onSuccess={handleSuccess} />
          ) : (
            <FaceTab onSuccess={handleSuccess} />
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Login menggunakan kredensial pegawai RSUD Sulfat
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginAbsensi;

