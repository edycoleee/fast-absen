/**
 * Absensi Entity
 * Represents an attendance record in the system
 */
export function Absensi(data = {}) {
  const entity = {
    id: data.id || null,
    id_pegawai: data.id_pegawai || null,
    tanggal: data.tanggal || null,
    jam_masuk: data.jam_masuk || null,
    jam_keluar: data.jam_keluar || null,
    status: data.status || 'HADIR',
    keterangan: data.keterangan || '',
    foto_masuk: data.foto_masuk || null,
    foto_keluar: data.foto_keluar || null,
    created_at: data.created_at || null,
    pegawai_nama: data.pegawai_nama || null,
  };

  entity.isComplete = () => !!entity.jam_masuk && !!entity.jam_keluar;

  entity.getStatusColor = () => {
    const colors = {
      HADIR: 'green',
      SAKIT: 'yellow',
      IZIN: 'blue',
      ALPA: 'red',
      CUTI: 'purple'
    };
    return colors[entity.status] || 'gray';
  };

  entity.toJSON = () => ({
    id: entity.id,
    id_pegawai: entity.id_pegawai,
    tanggal: entity.tanggal,
    jam_masuk: entity.jam_masuk,
    jam_keluar: entity.jam_keluar,
    status: entity.status,
    keterangan: entity.keterangan,
    foto_masuk: entity.foto_masuk,
    foto_keluar: entity.foto_keluar,
    created_at: entity.created_at,
    pegawai_nama: entity.pegawai_nama
  });

  return entity;
}
