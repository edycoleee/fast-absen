"""
Pegawai Repository
Database operations for Pegawai model
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from models.pegawai import Pegawai
from repositories.base import BaseRepository


class PegawaiRepository(BaseRepository[Pegawai]):
    """Pegawai repository"""
    
    def __init__(self, db: Session):
        super().__init__(Pegawai, db)
    
    def get_by_nip(self, nip: str) -> Optional[Pegawai]:
        """Get pegawai by NIP"""
        return self.db.query(Pegawai).filter(Pegawai.nip == nip).first()
    
    def search(self, query: str, skip: int = 0, limit: int = 100) -> List[Pegawai]:
        """Search pegawai by name or NIP"""
        return (
            self.db.query(Pegawai)
            .filter(or_(
                Pegawai.nama.ilike(f"%{query}%"),
                Pegawai.nip.ilike(f"%{query}%")
            ))
            .offset(skip)
            .limit(limit)
            .all()
        )
