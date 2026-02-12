/**
 * User Entity
 * Represents a user in the system
 */
export class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.username = data.username || '';
    this.id_pegawai = data.id_pegawai || null;
    this.is_active = data.is_active ?? true;
    this.roles = data.roles || [];
    this.pegawai_nama = data.pegawai_nama || null;
    this.created_at = data.created_at || null;
  }

  /**
   * Check if user has a specific role
   */
  hasRole(roleName) {
    return this.roles.includes(roleName);
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.hasRole('admin');
  }

  /**
   * Get primary role (first role in list)
   */
  getPrimaryRole() {
    return this.roles[0] || null;
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      id_pegawai: this.id_pegawai,
      is_active: this.is_active,
      roles: this.roles,
      pegawai_nama: this.pegawai_nama,
      created_at: this.created_at
    };
  }
}
