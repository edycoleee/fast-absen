"""
Absensi Repository
Database operations for Absensi model
"""
from typing import List, Optional
from datetime import datetime, date
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from models.absensi import Absensi
from repositories.base import BaseRepository


class AbsensiRepository(BaseRepository[Absensi]):
    """Absensi repository"""
    
    def __init__(self, db: Session):
        super().__init__(Absensi, db)
    
    def get_by_pegawai(self, id_pegawai: str, skip: int = 0, limit: int = 100) -> List[Absensi]:
        """Get absensi records by pegawai ID"""
        return (
            self.db.query(Absensi)
            .filter(Absensi.id_pegawai == id_pegawai)
            .order_by(Absensi.tanggal.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_by_pegawai_and_id(self, id_pegawai: str, absensi_id: int) -> Optional[Absensi]:
        """Get specific absensi record for a pegawai"""
        return (
            self.db.query(Absensi)
            .filter(and_(Absensi.id == absensi_id, Absensi.id_pegawai == id_pegawai))
            .first()
        )
    
    def get_with_pegawai(self, absensi_id: int) -> Optional[Absensi]:
        """Get absensi with pegawai info"""
        return (
            self.db.query(Absensi)
            .options(joinedload(Absensi.pegawai))
            .filter(Absensi.id == absensi_id)
            .first()
        )
    
    def get_all_with_pegawai(self, skip: int = 0, limit: int = 100) -> List[Absensi]:
        """Get all absensi with pegawai info"""
        return (
            self.db.query(Absensi)
            .options(joinedload(Absensi.pegawai))
            .order_by(Absensi.tanggal.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_by_date_range(
        self, 
        start_date: datetime, 
        end_date: datetime, 
        id_pegawai: Optional[str] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Absensi]:
        """Get absensi records within date range"""
        query = self.db.query(Absensi).filter(
            and_(Absensi.tanggal >= start_date, Absensi.tanggal <= end_date)
        )
        
        if id_pegawai:
            query = query.filter(Absensi.id_pegawai == id_pegawai)
        
        return query.order_by(Absensi.tanggal.desc()).offset(skip).limit(limit).all()
    
    def count_by_pegawai(self, id_pegawai: str) -> int:
        """Count total absensi for a pegawai"""
        return self.db.query(func.count(Absensi.id)).filter(Absensi.id_pegawai == id_pegawai).scalar()
