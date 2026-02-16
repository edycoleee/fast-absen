import { useState, useEffect } from 'react';
import { absensiService } from '../services';

const Absensi = () => {
  const [absensi, setAbsensi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAbsensi();
  }, []);

  const fetchAbsensi = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await absensiService.getAll(0, 100);
      console.log('Absensi response:', response);
      console.log('Absensi data:', response.data);
      if (response.data && response.data.length > 0) {
        console.log('Sample absensi item:', response.data[0]);
      }
      setAbsensi(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data absensi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data absensi ini?')) return;
    
    try {
      await absensiService.delete(id);
      fetchAbsensi();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus absensi');
    }
  };

  // Format date only (without time)
  const formatDateOnly = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    } catch (error) {
      return '-';
    }
  };

  // Format time only
  const formatTimeOnly = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return '-';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Absensi</h1>
          <p className="text-gray-600 mt-1">Monitor data absensi pegawai</p>
        </div>
        <button onClick={fetchAbsensi} className="btn-secondary">
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pegawai
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jam Masuk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jam Keluar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {absensi.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      Tidak ada data absensi
                    </td>
                  </tr>
                ) : (
                  absensi.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {item.pegawai_nama || item.pegawai?.nama || item.user?.username || item.username || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.id_pegawai || item.pegawai?.nip || (item.user_id ? `User ID: ${item.user_id}` : '-')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium">{formatDateOnly(item.tanggal)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-700">
                        {item.jam_masuk ? formatTimeOnly(item.jam_masuk) : formatTimeOnly(item.tanggal)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-700">
                        {item.jam_keluar ? formatTimeOnly(item.jam_keluar) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded uppercase ${
                          item.status?.toLowerCase() === 'hadir' 
                            ? 'bg-green-100 text-green-800'
                            : item.status?.toLowerCase() === 'izin'
                            ? 'bg-yellow-100 text-yellow-800'
                            : item.status?.toLowerCase() === 'sakit'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status || 'Hadir'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono">
                        <div className="text-gray-900">
                          {item.ip_address || item.ip || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-primary-600 hover:text-primary-900 mr-3">
                          View
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Absensi;
