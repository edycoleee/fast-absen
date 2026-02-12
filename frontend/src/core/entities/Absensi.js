/**
 * Absensi Entity
 * Represents an attendance record in the system
 */
export class Absensi {
  constructor(data = {}) {
    this.id = data.id || null;
    this.id_pegawai = data.id_pegawai || null;
    this.tanggal = data.tanggal || null;
    this.jam_masuk = data.jam_masuk || null;
    this.jam_keluar = data.jam_keluar || null;
    this.status = data.status || 'HADIR';
    this.keterangan = data.keterangan || '';
    this.foto_masuk = data.foto_masuk || null;
    this.foto_keluar = data.foto_keluar || null;
    this.created_at = data.created_at || null;
    this.pegawai_nama = data.pegawai_nama || null;
  }

  /**
   * Check if attendance is complete (has both check-in and check-out)
   */
  isComplete() {
    return !!this.jam_masuk && !!this.jam_keluar;
  }

  /**
   * Get status badge color
   */
  getStatusColor() {
    const colors = {
      'HADIR': 'green',
      'SAKIT': 'yellow',
      'IZIN': 'blue',
      'ALPA': 'red',
      'CUTI': 'purple'
    };
    return colors[this.status] || 'gray';
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id: this.id,
      id_pegawai: this.id_pegawai,
      tanggal: this.tanggal,
      jam_masuk: this.jam_masuk,
      jam_keluar: this.jam_keluar,
      status: this.status,
      keterangan: this.keterangan,
      foto_masuk: this.foto_masuk,
      foto_keluar: this.foto_keluar,
      created_at: this.created_at,
      pegawai_nama: this.pegawai_nama
    };
  }
}
