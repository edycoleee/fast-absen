"""
Role Repository
Database operations for Role model
"""
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from models.role import Role
from models.permission import Permission
from repositories.base import BaseRepository


class RoleRepository(BaseRepository[Role]):
    """Role repository"""
    
    def __init__(self, db: Session):
        super().__init__(Role, db)
    
    def get_by_name(self, name: str) -> Optional[Role]:
        """Get role by name"""
        return self.db.query(Role).filter(Role.name == name).first()

    def get(self, role_id: int) -> Optional[Role]:
        """Get role by ID"""
        return self.get_by_id(role_id)
    
    def get_with_permissions(self, role_id: int) -> Optional[Role]:
        """Get role with permissions eager loaded"""
        return (
            self.db.query(Role)
            .options(joinedload(Role.permissions))
            .filter(Role.id == role_id)
            .first()
        )
    
    def get_all_with_permissions(self, skip: int = 0, limit: int = 100) -> List[Role]:
        """Get all roles with permissions"""
        return (
            self.db.query(Role)
            .options(joinedload(Role.permissions))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_all(self) -> int:
        """Count all roles"""
        return self.db.query(Role).count()
    
    def add_permission(self, role: Role, permission: Permission) -> Role:
        """Add permission to role"""
        if permission not in role.permissions:
            role.permissions.append(permission)
            self.db.commit()
            self.db.refresh(role)
        return role
    
    def remove_permission(self, role: Role, permission: Permission) -> Role:
        """Remove permission from role"""
        if permission in role.permissions:
            role.permissions.remove(permission)
            self.db.commit()
            self.db.refresh(role)
        return role
    
    def set_permissions(self, role: Role, permissions: List[Permission]) -> Role:
        """Set role permissions (replace all existing permissions)"""
        role.permissions = permissions
        self.db.commit()
        self.db.refresh(role)
        return role
