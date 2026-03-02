"""
Kamus Kode Shift Service
"""
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.kamus_kode_shift import KamusKodeShift
from repositories.kamus_kode_shift_repository import KamusKodeShiftRepository
from schemas.kamus_kode_shift import KamusKodeShiftCreate, KamusKodeShiftUpdate, KamusKodeShiftResponse


class KamusKodeShiftService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = KamusKodeShiftRepository(db)

    def get_all(self, skip: int = 0, limit: int = 200, only_active: bool = False) -> List[KamusKodeShiftResponse]:
        if only_active:
            items = self.repo.get_all_active()
        else:
            items = self.repo.get_all(skip=skip, limit=limit, order_by="id", order_dir="asc")
        return [KamusKodeShiftResponse.model_validate(item) for item in items]

    def count_all(self) -> int:
        return self.repo.count()

    def get_by_id(self, kamus_id: int) -> KamusKodeShiftResponse:
        item = self.repo.get_by_id(kamus_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kamus kode shift id={kamus_id} tidak ditemukan"
            )
        return KamusKodeShiftResponse.model_validate(item)

    def get_by_kode(self, kode: str) -> KamusKodeShiftResponse:
        item = self.repo.get_by_kode(kode)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kode shift '{kode}' tidak ditemukan"
            )
        return KamusKodeShiftResponse.model_validate(item)

    def create(self, payload: KamusKodeShiftCreate) -> KamusKodeShiftResponse:
        if self.repo.get_by_kode(payload.kode):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Kode '{payload.kode}' sudah ada dalam kamus"
            )
        item = KamusKodeShift(**payload.model_dump())
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return KamusKodeShiftResponse.model_validate(item)

    def update(self, kamus_id: int, payload: KamusKodeShiftUpdate) -> KamusKodeShiftResponse:
        item = self.repo.get_by_id(kamus_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kamus kode shift id={kamus_id} tidak ditemukan"
            )
        data = payload.model_dump(exclude_unset=True)
        new_kode = data.get("kode")
        if new_kode and new_kode != item.kode:
            if self.repo.get_by_kode(new_kode):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Kode '{new_kode}' sudah digunakan"
                )
        for key, value in data.items():
            setattr(item, key, value)
        self.db.commit()
        self.db.refresh(item)
        return KamusKodeShiftResponse.model_validate(item)

    def delete(self, kamus_id: int) -> None:
        item = self.repo.get_by_id(kamus_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kamus kode shift id={kamus_id} tidak ditemukan"
            )
        self.db.delete(item)
        self.db.commit()
