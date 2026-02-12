const Permissions = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Permissions</h1>
          <p className="text-gray-600 mt-1">Kelola data permissions sistem</p>
        </div>
        <button className="btn-primary">
          + Tambah Permission
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">🔑</div>
          <p className="text-lg">Halaman Permissions</p>
          <p className="text-sm mt-2">Fitur untuk kelola permissions akan segera hadir</p>
        </div>
      </div>
    </div>
  );
};

export default Permissions;
