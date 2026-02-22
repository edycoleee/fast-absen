"""
Shift Kelompok Service
"""
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.shift_kelompok import ShiftKelompok
from repositories.shift_kelompok_repository import ShiftKelompokRepository
from schemas.shift_kelompok import ShiftKelompokCreate, ShiftKelompokUpdate, ShiftKelompokResponse


class ShiftKelompokService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ShiftKelompokRepository(db)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[ShiftKelompokResponse]:
        items = self.repo.get_all(skip=skip, limit=limit, order_by="id", order_dir="asc")
        return [ShiftKelompokResponse.model_validate(item) for item in items]

    def count_all(self) -> int:
        return self.repo.count()

    def get_by_id(self, shift_kelompok_id: int) -> ShiftKelompokResponse:
        item = self.repo.get_by_id(shift_kelompok_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Shift kelompok {shift_kelompok_id} tidak ditemukan")
        return ShiftKelompokResponse.model_validate(item)

    def create(self, payload: ShiftKelompokCreate) -> ShiftKelompokResponse:
        if self.repo.get_by_kode(payload.kode):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Kode '{payload.kode}' sudah digunakan")
        if self.repo.get_by_nama(payload.nama):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Nama '{payload.nama}' sudah digunakan")

        item = ShiftKelompok(**payload.model_dump())
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return ShiftKelompokResponse.model_validate(item)

    def update(self, shift_kelompok_id: int, payload: ShiftKelompokUpdate) -> ShiftKelompokResponse:
        item = self.repo.get_by_id(shift_kelompok_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Shift kelompok {shift_kelompok_id} tidak ditemukan")

        data = payload.model_dump(exclude_unset=True)

        new_kode = data.get("kode")
        if new_kode and new_kode != item.kode:
            if self.repo.get_by_kode(new_kode):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Kode '{new_kode}' sudah digunakan")

        new_nama = data.get("nama")
        if new_nama and new_nama != item.nama:
            if self.repo.get_by_nama(new_nama):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Nama '{new_nama}' sudah digunakan")

        for key, value in data.items():
            setattr(item, key, value)

        self.db.commit()
        self.db.refresh(item)
        return ShiftKelompokResponse.model_validate(item)

    def delete(self, shift_kelompok_id: int) -> None:
        item = self.repo.get_by_id(shift_kelompok_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Shift kelompok {shift_kelompok_id} tidak ditemukan")

        self.db.delete(item)
        self.db.commit()
