import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../domain/hooks';
import apiClient from '../../../data/api/client';

const LoginAdmin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [healthDetail, setHealthDetail] = useState(null);
  const [healthError, setHealthError] = useState('');
  const [healthLoading, setHealthLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api/v1`;
    const originUrl = apiBaseUrl.replace(/\/api\/v1\/?$/, '') || window.location.origin;
    const healthUrl = `${originUrl}/health/detail`;

    const fetchHealthDetail = async () => {
      setHealthError('');
      setHealthLoading(true);

      try {
        const response = await apiClient.get(healthUrl);
        if (isMounted) {
          setHealthDetail(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setHealthError(err.response?.data?.message || 'Gagal mengambil status kesehatan API.');
        }
      } finally {
        if (isMounted) {
          setHealthLoading(false);
        }
      }
    };

    fetchHealthDetail();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(username, password);
      const menuGuard = response?.data?.menu_guard ?? {};
      // Regular pegawai who used admin login → redirect to absensi dashboard
      if (!menuGuard.is_admin && !menuGuard.is_kepala_unit) {
        navigate('/absensi-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa username dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 flex items-center text-sm font-medium"
            >
              ← Kembali ke beranda
            </button>
          </div>

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-4xl">🏥</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Sistem Absensi RSUD Sulfat</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Masukkan password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Memproses...' : 'Login'}
            </button>
          </form>

          {/* Health Check Card */}
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">💚</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Health Check
              </h3>
              <p className="text-sm text-gray-600">
                Status kesehatan sistem dan database
              </p>
            </div>
            
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              {healthLoading && (
                <div className="text-center text-gray-600 text-sm">Mengambil status...</div>
              )}
              {healthError && (
                <div className="text-center text-red-600 text-sm">{healthError}</div>
              )}
              {!healthLoading && !healthError && healthDetail && (
                <pre className="whitespace-pre-wrap text-xs text-gray-700 overflow-auto max-h-64">
                  {JSON.stringify(healthDetail, null, 2)}
                </pre>
              )}
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            © 2026 RSUD Sulfat. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginAdmin;
