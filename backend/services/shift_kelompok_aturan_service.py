"""
Shift Kelompok Aturan Service
"""
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.shift_kelompok_aturan import ShiftKelompokAturan
from repositories.shift_kelompok_aturan_repository import ShiftKelompokAturanRepository
from schemas.shift_kelompok_aturan import (
    ShiftKelompokAturanCreate,
    ShiftKelompokAturanUpdate,
    ShiftKelompokAturanResponse,
)


class ShiftKelompokAturanService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ShiftKelompokAturanRepository(db)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[ShiftKelompokAturanResponse]:
        items = self.repo.get_all(skip=skip, limit=limit, order_by="id", order_dir="desc")
        return [ShiftKelompokAturanResponse.model_validate(item) for item in items]

    def count_all(self) -> int:
        return self.repo.count()

    def get_by_id(self, aturan_id: int) -> ShiftKelompokAturanResponse:
        item = self.repo.get_by_id(aturan_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Shift kelompok aturan {aturan_id} tidak ditemukan")
        return ShiftKelompokAturanResponse.model_validate(item)

    def create(self, payload: ShiftKelompokAturanCreate) -> ShiftKelompokAturanResponse:
        data = payload.model_dump()
        if data.get("effective_end_date") and data["effective_end_date"] < data["effective_start_date"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="effective_end_date tidak boleh lebih kecil dari effective_start_date")

        item = ShiftKelompokAturan(**data)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return ShiftKelompokAturanResponse.model_validate(item)

    def update(self, aturan_id: int, payload: ShiftKelompokAturanUpdate) -> ShiftKelompokAturanResponse:
        item = self.repo.get_by_id(aturan_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Shift kelompok aturan {aturan_id} tidak ditemukan")

        data = payload.model_dump(exclude_unset=True)

        start_date = data.get("effective_start_date", item.effective_start_date)
        end_date = data.get("effective_end_date", item.effective_end_date)
        if end_date and start_date and end_date < start_date:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="effective_end_date tidak boleh lebih kecil dari effective_start_date")

        for key, value in data.items():
            setattr(item, key, value)

        self.db.commit()
        self.db.refresh(item)
        return ShiftKelompokAturanResponse.model_validate(item)

    def delete(self, aturan_id: int) -> None:
        item = self.repo.get_by_id(aturan_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Shift kelompok aturan {aturan_id} tidak ditemukan")

        self.db.delete(item)
        self.db.commit()
