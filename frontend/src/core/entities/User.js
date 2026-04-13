/**
 * User Entity
 * Represents a user in the system
 */
export function User(data = {}) {
  const entity = {
    id: data.id || null,
    username: data.username || '',
    id_pegawai: data.id_pegawai || null,
    is_active: data.is_active ?? true,
    roles: data.roles || [],
    permissions: data.permissions || [],
    menu_guard: data.menu_guard || {},
    pegawai_nama: data.pegawai_nama || null,
    created_at: data.created_at || null,
    // SSO global identity — claims yang ada di setiap JWT token
    nik: data.nik || null,           // Kunci identitas lintas aplikasi
    unit_id: data.unit_id || null,   // Unit kerja utama
    full_name: data.full_name || null, // Nama lengkap dari pegawai
  };

  entity.hasRole = (roleName) => entity.roles.includes(roleName);

  entity.isAdmin = () => entity.hasRole('admin');

  entity.getPrimaryRole = () => entity.roles[0] || null;

  /** Nama tampil: full_name jika ada, fallback pegawai_nama, fallback username */
  entity.displayName = () => entity.full_name || entity.pegawai_nama || entity.username;

  entity.toJSON = () => ({
    id: entity.id,
    username: entity.username,
    id_pegawai: entity.id_pegawai,
    is_active: entity.is_active,
    roles: entity.roles,
    permissions: entity.permissions,
    menu_guard: entity.menu_guard,
    pegawai_nama: entity.pegawai_nama,
    created_at: entity.created_at,
    nik: entity.nik,
    unit_id: entity.unit_id,
    full_name: entity.full_name,
  });

  return entity;
}
