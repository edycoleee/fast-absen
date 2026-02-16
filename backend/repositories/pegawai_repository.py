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

    def get_by_id(self, id_pegawai: str) -> Optional[Pegawai]:
        """
        Override BaseRepository get_by_id to use id_pegawai instead of id
        Pegawai model uses id_pegawai as primary key
        """
        return self.db.query(Pegawai).filter(Pegawai.id_pegawai == id_pegawai).first()

    def get(self, pegawai_id: str) -> Optional[Pegawai]:
        """Get pegawai by ID (id_pegawai)"""
        return self.db.query(Pegawai).filter(Pegawai.id_pegawai == pegawai_id).first()
    
    def get_by_nip(self, nip: str) -> Optional[Pegawai]:
        """Get pegawai by NIP"""
        return self.db.query(Pegawai).filter(Pegawai.nip == nip).first()

    def create(self, pegawai: Pegawai) -> Pegawai:
        """Create new pegawai"""
        self.db.add(pegawai)
        self.db.commit()
        self.db.refresh(pegawai)
        return pegawai

    def update(self, pegawai: Pegawai) -> Pegawai:
        """Update pegawai"""
        self.db.commit()
        self.db.refresh(pegawai)
        return pegawai

    def delete(self, pegawai_id: str) -> bool:
        """Delete pegawai by ID (id_pegawai)"""
        pegawai = self.get(pegawai_id)
        if not pegawai:
            return False

        self.db.delete(pegawai)
        self.db.commit()
        return True
    
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
