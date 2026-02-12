import { useState, useEffect } from 'react';
import { usePegawai } from '../../domain/hooks';

const Pegawai = () => {
  const { pegawai, loading, error, pagination, fetchPegawai, deletePegawai } = usePegawai();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPegawai(page, 10, search);
  }, [page, search, fetchPegawai]);

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pegawai ini?')) return;
    
    try {
      await deletePegawai(id);
      fetchPegawai(page, 10, search);
    } catch (err) {
      alert(err.message || 'Gagal menghapus pegawai');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPegawai();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pegawai</h1>
          <p className="text-gray-600 mt-1">Kelola data pegawai</p>
        </div>
        <button className="btn-primary">
          + Tambah Pegawai
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pegawai (nama, NIP, email)..."
            className="input-field flex-1"
          />
          <button type="submit" className="btn-primary">
            🔍 Cari
          </button>
        </form>
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
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Foto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NIP / Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jabatan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kontak
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pegawai.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        Tidak ada data
                      </td>
                    </tr>
                  ) : (
                    pegawai.map((p) => (
                      <tr key={p.id_pegawai} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {p.foto_url ? (
                            <img 
                              src={`http://192.168.171.15:8000${p.foto_url}`}
                              alt={p.nama}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-gray-500 text-lg">👤</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{p.nama}</div>
                          <div className="text-sm text-gray-500">{p.nip}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">{p.jabatan || '-'}</div>
                          <div className="text-xs text-gray-500">{p.departemen || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">{p.email || '-'}</div>
                          <div className="text-xs text-gray-500">{p.no_telepon || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-primary-600 hover:text-primary-900 mr-3">
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(p.id_pegawai)}
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

            {/* Pagination */}
            {pagination.total > pegawai.length && (
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit) || 1}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={pegawai.length < pagination.limit}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Pegawai;
