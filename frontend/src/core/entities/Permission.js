/**
 * Permission Entity
 * Represents a permission in the system
 */
export class Permission {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.description = data.description || '';
  }

  /**
   * Get permission category (prefix before dot)
   */
  getCategory() {
    return this.name.split('.')[0] || '';
  }

  /**
   * Get permission action (suffix after dot)
   */
  getAction() {
    return this.name.split('.')[1] || '';
  }

  /**
   * Convert to plain object
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description
    };
  }
}
