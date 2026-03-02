"""
IP Whitelist Repository
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from models.ip_whitelist import IpWhitelist


class IpWhitelistRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100) -> List[IpWhitelist]:
        return (
            self.db.query(IpWhitelist)
            .order_by(IpWhitelist.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_all(self) -> int:
        return self.db.query(IpWhitelist).count()

    def get_active(self) -> List[IpWhitelist]:
        """Ambil semua IP yang is_active=True untuk validasi check-in."""
        return (
            self.db.query(IpWhitelist)
            .filter(IpWhitelist.is_active == True)
            .all()
        )

    def get_by_id(self, id: int) -> Optional[IpWhitelist]:
        return self.db.query(IpWhitelist).filter(IpWhitelist.id == id).first()

    def get_by_ip(self, ip_address: str) -> Optional[IpWhitelist]:
        return (
            self.db.query(IpWhitelist)
            .filter(IpWhitelist.ip_address == ip_address)
            .first()
        )

    def create(self, data: dict) -> IpWhitelist:
        obj = IpWhitelist(**data)
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, id: int, data: dict) -> Optional[IpWhitelist]:
        obj = self.get_by_id(id)
        if not obj:
            return None
        for key, value in data.items():
            setattr(obj, key, value)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, id: int) -> bool:
        obj = self.get_by_id(id)
        if not obj:
            return False
        self.db.delete(obj)
        self.db.commit()
        return True
