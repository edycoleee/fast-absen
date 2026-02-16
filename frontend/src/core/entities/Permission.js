/**
 * Permission Entity
 * Represents a permission in the system
 */
export function Permission(data = {}) {
  const entity = {
    id: data.id || null,
    name: data.name || '',
    description: data.description || '',
  };

  entity.getCategory = () => entity.name.split('.')[0] || '';

  entity.getAction = () => entity.name.split('.')[1] || '';

  entity.toJSON = () => ({
    id: entity.id,
    name: entity.name,
    description: entity.description
  });

  return entity;
}
