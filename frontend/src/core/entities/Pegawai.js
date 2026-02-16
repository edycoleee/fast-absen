/**
 * Pegawai Entity
 * Represents an employee in the system
 */
export function Pegawai(data = {}) {
  const entity = {
    id_pegawai: data.id_pegawai || null,
    nip: data.nip || '',
    nama: data.nama || '',
    jenis_kelamin: data.jenis_kelamin || 'L',
    tempat_lahir: data.tempat_lahir || '',
    tanggal_lahir: data.tanggal_lahir || null,
    alamat: data.alamat || '',
    id_ruang: data.id_ruang || null,
    status: data.status || 'PNS',
    foto: data.foto || null,
    created_at: data.created_at || null,
  };

  entity.getFullName = () => entity.nama;

  entity.getGenderLabel = () => (entity.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan');

  entity.getPhotoUrl = (baseUrl = '') => {
    if (!entity.foto) return null;
    return entity.foto.startsWith('http') ? entity.foto : `${baseUrl}${entity.foto}`;
  };

  entity.toJSON = () => ({
    id_pegawai: entity.id_pegawai,
    nip: entity.nip,
    nama: entity.nama,
    jenis_kelamin: entity.jenis_kelamin,
    tempat_lahir: entity.tempat_lahir,
    tanggal_lahir: entity.tanggal_lahir,
    alamat: entity.alamat,
    id_ruang: entity.id_ruang,
    status: entity.status,
    foto: entity.foto,
    created_at: entity.created_at
  });

  return entity;
}
