/**
 * Role Entity
 * Represents a user role in the system
 */
export function Role(data = {}) {
  const entity = {
    id: data.id || null,
    name: data.name || '',
    description: data.description || '',
    permissions: data.permissions || [],
  };

  entity.hasPermission = (permissionName) => entity.permissions.includes(permissionName);

  entity.getPermissionCount = () => entity.permissions.length;

  entity.toJSON = () => ({
    id: entity.id,
    name: entity.name,
    description: entity.description,
    permissions: entity.permissions
  });

  return entity;
}
