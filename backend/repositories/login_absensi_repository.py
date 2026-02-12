"""
Login Absensi Repository
Database operations for LoginAbsensi model
"""
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from models.login_absensi import LoginAbsensi
from repositories.base import BaseRepository


class LoginAbsensiRepository(BaseRepository[LoginAbsensi]):
    """Login Absensi repository"""
    
    def __init__(self, db: Session):
        super().__init__(LoginAbsensi, db)
    
    def get_by_pegawai(self, id_pegawai: str, skip: int = 0, limit: int = 100) -> List[LoginAbsensi]:
        """Get login absensi records by pegawai ID"""
        return (
            self.db.query(LoginAbsensi)
            .filter(LoginAbsensi.id_pegawai == id_pegawai)
            .order_by(LoginAbsensi.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_with_pegawai(self, login_id: int) -> Optional[LoginAbsensi]:
        """Get login absensi with pegawai info"""
        return (
            self.db.query(LoginAbsensi)
            .options(joinedload(LoginAbsensi.pegawai))
            .filter(LoginAbsensi.id == login_id)
            .first()
        )
    
    def get_all_with_pegawai(self, skip: int = 0, limit: int = 100) -> List[LoginAbsensi]:
        """Get all login absensi with pegawai info"""
        return (
            self.db.query(LoginAbsensi)
            .options(joinedload(LoginAbsensi.pegawai))
            .order_by(LoginAbsensi.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
