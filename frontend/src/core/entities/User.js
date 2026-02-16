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
    pegawai_nama: data.pegawai_nama || null,
    created_at: data.created_at || null,
  };

  entity.hasRole = (roleName) => entity.roles.includes(roleName);

  entity.isAdmin = () => entity.hasRole('admin');

  entity.getPrimaryRole = () => entity.roles[0] || null;

  entity.toJSON = () => ({
    id: entity.id,
    username: entity.username,
    id_pegawai: entity.id_pegawai,
    is_active: entity.is_active,
    roles: entity.roles,
    pegawai_nama: entity.pegawai_nama,
    created_at: entity.created_at
  });

  return entity;
}
