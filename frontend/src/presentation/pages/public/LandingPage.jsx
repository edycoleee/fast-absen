import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <div className="w-full max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-white text-5xl">🏥</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Sistem Absensi RSUD Sulfat
          </h1>
          <p className="text-xl text-gray-600">
            Selamat datang di sistem informasi absensi rumah sakit
          </p>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Login Admin Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👨‍💼</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Login Admin
              </h2>
              <p className="text-gray-600 mb-6">
                Kelola sistem, pegawai, dan data absensi
              </p>
              <button
                onClick={() => navigate('/login-admin')}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Masuk sebagai Admin
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                Akses penuh untuk administrator
              </p>
            </div>
          </div>

          {/* Login Absensi Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Login Absensi
              </h2>
              <p className="text-gray-600 mb-6">
                Catat kehadiran dan lihat riwayat absensi Anda
              </p>
              <button
                onClick={() => navigate('/login-absensi')}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Masuk sebagai Pegawai
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                Untuk pegawai RSUD Sulfat
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            © 2026 RSUD Sulfat. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
