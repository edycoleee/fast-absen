"""
Pegawai Shift Kelompok Service
"""
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.pegawai_shift_kelompok import PegawaiShiftKelompok
from repositories.pegawai_shift_kelompok_repository import PegawaiShiftKelompokRepository
from schemas.pegawai_shift_kelompok import (
    PegawaiShiftKelompokCreate,
    PegawaiShiftKelompokUpdate,
    PegawaiShiftKelompokResponse,
)


class PegawaiShiftKelompokService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PegawaiShiftKelompokRepository(db)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[PegawaiShiftKelompokResponse]:
        items = self.repo.get_all_with_relations(skip=skip, limit=limit)
        return [self._to_response(item) for item in items]

    def count_all(self) -> int:
        return self.repo.count()

    def get_by_id(self, assignment_id: int) -> PegawaiShiftKelompokResponse:
        item = self.repo.get_by_id_with_relations(assignment_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Pegawai shift kelompok {assignment_id} tidak ditemukan")
        return self._to_response(item)

    def create(self, payload: PegawaiShiftKelompokCreate) -> PegawaiShiftKelompokResponse:
        data = payload.model_dump()
        if data.get("effective_end_date") and data["effective_end_date"] < data["effective_start_date"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="effective_end_date tidak boleh lebih kecil dari effective_start_date")

        item = PegawaiShiftKelompok(**data)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        item = self.repo.get_by_id_with_relations(item.id)
        return self._to_response(item)

    def update(self, assignment_id: int, payload: PegawaiShiftKelompokUpdate) -> PegawaiShiftKelompokResponse:
        item = self.repo.get_by_id_with_relations(assignment_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Pegawai shift kelompok {assignment_id} tidak ditemukan")

        data = payload.model_dump(exclude_unset=True)

        start_date = data.get("effective_start_date", item.effective_start_date)
        end_date = data.get("effective_end_date", item.effective_end_date)
        if end_date and start_date and end_date < start_date:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="effective_end_date tidak boleh lebih kecil dari effective_start_date")

        for key, value in data.items():
            setattr(item, key, value)

        self.db.commit()
        self.db.refresh(item)
        item = self.repo.get_by_id_with_relations(item.id)
        return self._to_response(item)

    def delete(self, assignment_id: int) -> None:
        item = self.repo.get_by_id(assignment_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Pegawai shift kelompok {assignment_id} tidak ditemukan")

        self.db.delete(item)
        self.db.commit()

    @staticmethod
    def _to_response(item: PegawaiShiftKelompok) -> PegawaiShiftKelompokResponse:
        data = PegawaiShiftKelompokResponse.model_validate(item).model_dump()
        data["pegawai_nama"] = item.pegawai.nama if item.pegawai else None
        data["shift_kelompok_nama"] = item.shift_kelompok.nama if item.shift_kelompok else None
        return PegawaiShiftKelompokResponse(**data)
