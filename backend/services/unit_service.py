"""
Unit Service
"""
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.unit import Unit
from repositories.unit_repository import UnitRepository
from schemas.unit import UnitCreate, UnitUpdate, UnitResponse


class UnitService:
    def __init__(self, db: Session):
        self.db = db
        self.unit_repo = UnitRepository(db)

    def get_all(self, skip: int = 0, limit: int = 100, search: str = '') -> List[UnitResponse]:
        units = self.unit_repo.get_all_with_search(skip=skip, limit=limit, search=search)
        return [UnitResponse.model_validate(unit) for unit in units]

    def count_all(self, search: str = '') -> int:
        return self.unit_repo.count_with_search(search)

    def get_by_id(self, id_unit: int) -> UnitResponse:
        unit = self.unit_repo.get(id_unit)
        if not unit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unit {id_unit} tidak ditemukan")
        return UnitResponse.model_validate(unit)

    def create(self, payload: UnitCreate) -> UnitResponse:
        existing = self.unit_repo.get(payload.id_unit)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unit {payload.id_unit} sudah ada")

        existing_name = self.unit_repo.get_by_nama(payload.nama_unit)
        if existing_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Nama unit '{payload.nama_unit}' sudah digunakan")

        unit = Unit(**payload.model_dump())
        self.db.add(unit)
        self.db.commit()
        self.db.refresh(unit)
        return UnitResponse.model_validate(unit)

    def update(self, id_unit: int, payload: UnitUpdate) -> UnitResponse:
        unit = self.unit_repo.get(id_unit)
        if not unit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unit {id_unit} tidak ditemukan")

        data = payload.model_dump(exclude_unset=True)

        nama_baru = data.get("nama_unit")
        if nama_baru and nama_baru != unit.nama_unit:
            duplicate = self.unit_repo.get_by_nama(nama_baru)
            if duplicate:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Nama unit '{nama_baru}' sudah digunakan")

        for key, value in data.items():
            setattr(unit, key, value)

        self.db.commit()
        self.db.refresh(unit)
        return UnitResponse.model_validate(unit)

    def delete(self, id_unit: int) -> None:
        unit = self.unit_repo.get(id_unit)
        if not unit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unit {id_unit} tidak ditemukan")

        has_pegawai = len(unit.pegawai) > 0
        if has_pegawai:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unit {id_unit} tidak bisa dihapus karena masih dipakai pegawai"
            )

        self.db.delete(unit)
        self.db.commit()
