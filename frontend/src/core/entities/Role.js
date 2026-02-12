/**
 * Role Entity
 * Represents a user role in the system
 */
export class Role {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.description = data.description || '';
    this.permissions = data.permissions || [];
  }

  /**
   * Check if role has a specific permission
   */
  hasPermission(permissionName) {
    return this.permissions.includes(permissionName);
  }

  /**
   * Get permission count
   */
  getPermissionCount() {
    return this.permissions.length;
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      permissions: this.permissions
    };
  }
}
