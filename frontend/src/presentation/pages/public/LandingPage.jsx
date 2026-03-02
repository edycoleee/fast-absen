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
        <div className="grid md:grid-cols-3 gap-6">

          {/* Card 1: Face Login Absensi */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👤</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Login Wajah
              </h2>
              <p className="text-gray-600 mb-6 text-sm">
                Absensi menggunakan pengenalan wajah tanpa password
              </p>
              <button
                onClick={() => navigate('/login-face-absensi')}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Login dengan Wajah
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                Cepat &amp; mudah untuk pegawai
              </p>
            </div>
          </div>

          {/* Card 2: Password Login Absensi */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Login Password
              </h2>
              <p className="text-gray-600 mb-6 text-sm">
                Catat kehadiran dan lihat riwayat absensi Anda
              </p>
              <button
                onClick={() => navigate('/login-absensi')}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Login dengan Password
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                Untuk pegawai RSUD Sulfat
              </p>
            </div>
          </div>

          {/* Card 3: Login Admin */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👨‍💼</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Login Admin
              </h2>
              <p className="text-gray-600 mb-6 text-sm">
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
