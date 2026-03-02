"""
Kamus Pola Shift Service
"""
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.kamus_pola_shift import KamusPolaShift
from repositories.kamus_pola_shift_repository import KamusPolaShiftRepository
from schemas.kamus_pola_shift import KamusPolaShiftCreate, KamusPolaShiftUpdate, KamusPolaShiftResponse


class KamusPolaShiftService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = KamusPolaShiftRepository(db)

    def get_all(self, skip: int = 0, limit: int = 200, only_active: bool = False) -> List[KamusPolaShiftResponse]:
        if only_active:
            items = self.repo.get_all_active()
        else:
            items = self.repo.get_all(skip=skip, limit=limit, order_by="id", order_dir="asc")
        return [KamusPolaShiftResponse.model_validate(item) for item in items]

    def count_all(self) -> int:
        return self.repo.count()

    def get_by_id(self, pola_id: int) -> KamusPolaShiftResponse:
        item = self.repo.get_by_id(pola_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kamus pola shift id={pola_id} tidak ditemukan"
            )
        return KamusPolaShiftResponse.model_validate(item)

    def create(self, payload: KamusPolaShiftCreate) -> KamusPolaShiftResponse:
        if self.repo.get_by_nama(payload.nama):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Nama pola '{payload.nama}' sudah ada"
            )
        item = KamusPolaShift(**payload.model_dump())
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return KamusPolaShiftResponse.model_validate(item)

    def update(self, pola_id: int, payload: KamusPolaShiftUpdate) -> KamusPolaShiftResponse:
        item = self.repo.get_by_id(pola_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kamus pola shift id={pola_id} tidak ditemukan"
            )
        data = payload.model_dump(exclude_unset=True)
        new_nama = data.get("nama")
        if new_nama and new_nama != item.nama:
            if self.repo.get_by_nama(new_nama):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Nama pola '{new_nama}' sudah digunakan"
                )
        for key, value in data.items():
            setattr(item, key, value)
        self.db.commit()
        self.db.refresh(item)
        return KamusPolaShiftResponse.model_validate(item)

    def delete(self, pola_id: int) -> None:
        item = self.repo.get_by_id(pola_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kamus pola shift id={pola_id} tidak ditemukan"
            )
        self.db.delete(item)
        self.db.commit()
