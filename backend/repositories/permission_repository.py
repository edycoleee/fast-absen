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
    
    def get_by_name(self, name: str) -> Optional[Permission]:
        """Get permission by name"""
        return self.db.query(Permission).filter(Permission.name == name).first()
