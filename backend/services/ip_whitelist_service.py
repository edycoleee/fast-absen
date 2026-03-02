"""
IP Whitelist Service
Logic bisnis untuk manajemen whitelist IP absensi
"""
import ipaddress
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from repositories.ip_whitelist_repository import IpWhitelistRepository
from schemas.ip_whitelist import IpWhitelistCreate, IpWhitelistUpdate, IpWhitelistResponse


class IpWhitelistService:
    def __init__(self, db: Session):
        self.repo = IpWhitelistRepository(db)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[IpWhitelistResponse]:
        items = self.repo.get_all(skip=skip, limit=limit)
        return [IpWhitelistResponse.model_validate(item) for item in items]

    def count_all(self) -> int:
        return self.repo.count_all()

    def get_by_id(self, id: int) -> IpWhitelistResponse:
        obj = self.repo.get_by_id(id)
        if not obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"IP whitelist dengan id {id} tidak ditemukan"
            )
        return IpWhitelistResponse.model_validate(obj)

    def create(self, data: IpWhitelistCreate, created_by: int) -> IpWhitelistResponse:
        # Cek duplikat
        existing = self.repo.get_by_ip(data.ip_address)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"IP '{data.ip_address}' sudah terdaftar di whitelist"
            )
        obj = self.repo.create({
            "ip_address": data.ip_address,
            "label": data.label,
            "is_active": data.is_active,
            "created_by": created_by,
        })
        return IpWhitelistResponse.model_validate(obj)

    def update(self, id: int, data: IpWhitelistUpdate) -> IpWhitelistResponse:
        # Cek duplikat jika ip_address diubah
        if data.ip_address is not None:
            existing = self.repo.get_by_ip(data.ip_address)
            if existing and existing.id != id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"IP '{data.ip_address}' sudah terdaftar di whitelist"
                )
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        obj = self.repo.update(id, update_dict)
        if not obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"IP whitelist dengan id {id} tidak ditemukan"
            )
        return IpWhitelistResponse.model_validate(obj)

    def delete(self, id: int) -> None:
        success = self.repo.delete(id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"IP whitelist dengan id {id} tidak ditemukan"
            )

    # ---------------------------------------------------------------
    # Metode untuk validasi check-in
    # ---------------------------------------------------------------
    def is_ip_allowed(self, client_ip: str) -> bool:
        """
        Kembalikan True jika:
          1. Tabel whitelist kosong (tidak ada pembatasan)
          2. client_ip cocok dengan salah satu entry aktif
             (bisa IP tunggal atau termasuk dalam CIDR range)
        """
        active_list = self.repo.get_active()

        # Tidak ada pembatasan jika whitelist kosong
        if not active_list:
            return True

        try:
            client_addr = ipaddress.ip_address(client_ip)
        except ValueError:
            # IP tidak valid → tolak
            return False

        for entry in active_list:
            try:
                # Coba sebagai IP tunggal
                if client_addr == ipaddress.ip_address(entry.ip_address):
                    return True
            except ValueError:
                pass
            try:
                # Coba sebagai CIDR network
                network = ipaddress.ip_network(entry.ip_address, strict=False)
                if client_addr in network:
                    return True
            except ValueError:
                pass

        return False
