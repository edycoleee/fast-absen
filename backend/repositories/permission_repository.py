"""
Permission Repository
Database operations for Permission model
"""
from typing import Optional
from sqlalchemy.orm import Session
from models.permission import Permission
from repositories.base import BaseRepository


class PermissionRepository(BaseRepository[Permission]):
    """Permission repository"""
    
    def __init__(self, db: Session):
        super().__init__(Permission, db)

    def get(self, permission_id: int) -> Optional[Permission]:
        """Get permission by ID"""
        return self.get_by_id(permission_id)
    
    def get_by_name(self, name: str) -> Optional[Permission]:
        """Get permission by name"""
        return self.db.query(Permission).filter(Permission.name == name).first()

    def get_all_filtered(self, skip: int = 0, limit: int = 10, search: Optional[str] = None):
        """Get permissions with optional name search"""
        q = self.db.query(Permission)
        if search:
            q = q.filter(Permission.name.ilike(f"%{search}%"))
        return q.order_by(Permission.name).offset(skip).limit(limit).all()

    def count_filtered(self, search: Optional[str] = None) -> int:
        """Count permissions with optional name filter"""
        q = self.db.query(Permission)
        if search:
            q = q.filter(Permission.name.ilike(f"%{search}%"))
        return q.count()

    def count_all(self) -> int:
        """Count all permissions"""
        return self.db.query(Permission).count()
