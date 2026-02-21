"""
Absensi Repository
Database operations for Absensi model - Updated for check-in/check-out system
"""
from typing import List, Optional, Dict
from datetime import datetime, date
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func, extract
from models.absensi import Absensi
from repositories.base import BaseRepository


class AbsensiRepository(BaseRepository[Absensi]):
    """Absensi repository with check-in/check-out support"""
    
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
    
    def get_by_pegawai_and_date(self, id_pegawai: str, tanggal: date) -> Optional[Absensi]:
        """
        Get latest absensi for specific pegawai on specific date
        Important for resolving today's status when multiple shifts exist
        """
        return (
            self.db.query(Absensi)
            .filter(and_(
                Absensi.id_pegawai == id_pegawai,
                Absensi.tanggal == tanggal
            ))
            .order_by(Absensi.jam_masuk.desc(), Absensi.id.desc())
            .first()
        )

    def get_active_by_pegawai_and_date(self, id_pegawai: str, tanggal: date) -> Optional[Absensi]:
        """Get active absensi (checked-in, not yet checked-out) for a specific date"""
        return (
            self.db.query(Absensi)
            .filter(and_(
                Absensi.id_pegawai == id_pegawai,
                Absensi.tanggal == tanggal,
                Absensi.jam_masuk.isnot(None),
                Absensi.jam_keluar.is_(None)
            ))
            .order_by(Absensi.jam_masuk.desc(), Absensi.id.desc())
            .first()
        )
    
    def get_today_absensi(self, id_pegawai: str) -> Optional[Absensi]:
        """
        Get today's relevant absensi for a pegawai.
        Priority:
        1) Active session (belum check-out)
        2) Latest completed session
        """
        today = date.today()
        active = self.get_active_by_pegawai_and_date(id_pegawai, today)
        if active:
            return active

        return self.get_by_pegawai_and_date(id_pegawai, today)
    
    def create_check_in(self, absensi_data: dict) -> Absensi:
        """
        Create check-in record
        Validates that pegawai has no active check-in session today
        """
        # Check if there's an active session for today
        active_session = self.get_active_by_pegawai_and_date(
            absensi_data['id_pegawai'],
            absensi_data.get('tanggal', date.today())
        )
        
        if active_session:
            raise ValueError("Anda masih memiliki sesi absensi aktif. Silakan check-out terlebih dahulu sebelum check-in lagi.")
        
        # Set jam_masuk to now if not provided
        if 'jam_masuk' not in absensi_data or absensi_data['jam_masuk'] is None:
            absensi_data['jam_masuk'] = datetime.now()
        
        absensi = Absensi(**absensi_data)
        self.db.add(absensi)
        self.db.commit()
        self.db.refresh(absensi)
        return absensi
    
    def update_check_out(self, absensi_id: int, ip_address: Optional[str] = None) -> Optional[Absensi]:
        """Update check-out time"""
        absensi = self.get_by_id(absensi_id)
        
        if not absensi:
            raise ValueError("Absensi tidak ditemukan")
        
        if absensi.jam_keluar:
            raise ValueError("Sudah check-out sebelumnya")
        
        absensi.jam_keluar = datetime.now()
        if ip_address:
            absensi.ip_address = ip_address
        
        self.db.commit()
        self.db.refresh(absensi)
        return absensi
    
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
        start_date: date, 
        end_date: date, 
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
    
    def get_by_status(
        self,
        status: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Absensi]:
        """Get absensi records by status"""
        filters = [Absensi.status == status]
        
        if start_date:
            filters.append(Absensi.tanggal >= start_date)
        if end_date:
            filters.append(Absensi.tanggal <= end_date)
        
        return (
            self.db.query(Absensi)
            .filter(and_(*filters))
            .order_by(Absensi.tanggal.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_summary_by_pegawai(
        self,
        id_pegawai: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, int]:
        """
        Get summary statistics for a pegawai
        Returns count of each status
        """
        filters = [Absensi.id_pegawai == id_pegawai]
        
        if start_date:
            filters.append(Absensi.tanggal >= start_date)
        if end_date:
            filters.append(Absensi.tanggal <= end_date)
        
        results = (
            self.db.query(
                Absensi.status,
                func.count(Absensi.id).label('count')
            )
            .filter(and_(*filters))
            .group_by(Absensi.status)
            .all()
        )
        
        # Initialize all statuses to 0
        summary = {
            'HADIR': 0,
            'IZIN': 0,
            'SAKIT': 0,
            'ALPHA': 0,
            'TERLAMBAT': 0,
            'CUTI': 0
        }
        
        # Fill in actual counts
        for status, count in results:
            summary[status] = count
        
        return summary
    
    def get_monthly_summary(
        self,
        year: int,
        month: int,
        id_pegawai: Optional[str] = None
    ) -> Dict[str, int]:
        """Get monthly summary for all or specific pegawai"""
        filters = [
            extract('year', Absensi.tanggal) == year,
            extract('month', Absensi.tanggal) == month
        ]
        
        if id_pegawai:
            filters.append(Absensi.id_pegawai == id_pegawai)
        
        results = (
            self.db.query(
                Absensi.status,
                func.count(Absensi.id).label('count')
            )
            .filter(and_(*filters))
            .group_by(Absensi.status)
            .all()
        )
        
        summary = {
            'HADIR': 0,
            'IZIN': 0,
            'SAKIT': 0,
            'ALPHA': 0,
            'TERLAMBAT': 0,
            'CUTI': 0
        }
        
        for status, count in results:
            summary[status] = count
        
        return summary
    
    def count_by_pegawai(self, id_pegawai: str) -> int:
        """Count total absensi for a pegawai"""
        return self.db.query(func.count(Absensi.id)).filter(
            Absensi.id_pegawai == id_pegawai
        ).scalar()
    
    def get_pending_checkout(self, id_pegawai: Optional[str] = None) -> List[Absensi]:
        """
        Get records that have checked-in but not yet checked-out
        Useful for cleanup or reporting
        """
        filters = [
            Absensi.jam_masuk.isnot(None),
            Absensi.jam_keluar.is_(None)
        ]
        
        if id_pegawai:
            filters.append(Absensi.id_pegawai == id_pegawai)
        
        return (
            self.db.query(Absensi)
            .filter(and_(*filters))
            .order_by(Absensi.tanggal.desc())
            .all()
        )
