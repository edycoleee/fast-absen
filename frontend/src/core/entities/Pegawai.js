/**
 * Pegawai Entity
 * Represents an employee in the system
 */
export class Pegawai {
  constructor(data = {}) {
    this.id_pegawai = data.id_pegawai || null;
    this.nip = data.nip || '';
    this.nama = data.nama || '';
    this.jenis_kelamin = data.jenis_kelamin || 'L';
    this.tempat_lahir = data.tempat_lahir || '';
    this.tanggal_lahir = data.tanggal_lahir || null;
    this.alamat = data.alamat || '';
    this.id_ruang = data.id_ruang || null;
    this.status = data.status || 'PNS';
    this.foto = data.foto || null;
    this.created_at = data.created_at || null;
  }

  /**
   * Get full name
   */
  getFullName() {
    return this.nama;
  }

  /**
   * Get gender label
   */
  getGenderLabel() {
    return this.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan';
  }

  /**
   * Get photo URL
   */
  getPhotoUrl(baseUrl = '') {
    if (!this.foto) return null;
    return this.foto.startsWith('http') ? this.foto : `${baseUrl}${this.foto}`;
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id_pegawai: this.id_pegawai,
      nip: this.nip,
      nama: this.nama,
      jenis_kelamin: this.jenis_kelamin,
      tempat_lahir: this.tempat_lahir,
      tanggal_lahir: this.tanggal_lahir,
      alamat: this.alamat,
      id_ruang: this.id_ruang,
      status: this.status,
      foto: this.foto,
      created_at: this.created_at
    };
  }
}
