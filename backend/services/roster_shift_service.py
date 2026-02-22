"""
Roster Shift Service
"""
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.roster_shift import RosterShift
from repositories.roster_shift_repository import RosterShiftRepository
from schemas.roster_shift import (
    RosterShiftCreate,
    RosterShiftUpdate,
    RosterShiftResponse,
)


VALID_JENIS_SHIFT = {"PAGI", "SORE", "MALAM", "ON_CALL", "CUSTOM"}
VALID_STATUS_ROSTER = {"AKTIF", "BATAL", "DIUBAH"}


class RosterShiftService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = RosterShiftRepository(db)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[RosterShiftResponse]:
        items = self.repo.get_all_with_relations(skip=skip, limit=limit)
        return [self._to_response(item) for item in items]

    def count_all(self) -> int:
        return self.repo.count()

    def get_by_id(self, roster_id: int) -> RosterShiftResponse:
        item = self.repo.get_by_id_with_relations(roster_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Roster shift {roster_id} tidak ditemukan")
        return self._to_response(item)

    def create(self, payload: RosterShiftCreate) -> RosterShiftResponse:
        data = payload.model_dump()
        self._validate_payload(data)

        item = RosterShift(**data)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return self._to_response(item)

    def update(self, roster_id: int, payload: RosterShiftUpdate) -> RosterShiftResponse:
        item = self.repo.get_by_id_with_relations(roster_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Roster shift {roster_id} tidak ditemukan")

        data = payload.model_dump(exclude_unset=True)

        merged = {
            "jam_mulai": data.get("jam_mulai", item.jam_mulai),
            "jam_selesai": data.get("jam_selesai", item.jam_selesai),
            "jenis_shift": data.get("jenis_shift", item.jenis_shift),
            "status_roster": data.get("status_roster", item.status_roster),
            "nomor_sesi": data.get("nomor_sesi", item.nomor_sesi),
            "grace_telat_override_menit": data.get("grace_telat_override_menit", item.grace_telat_override_menit),
            "toleransi_pulang_cepat_override_menit": data.get("toleransi_pulang_cepat_override_menit", item.toleransi_pulang_cepat_override_menit),
        }
        self._validate_payload(merged)

        for key, value in data.items():
            setattr(item, key, value)

        self.db.commit()
        self.db.refresh(item)
        return self._to_response(item)

    def delete(self, roster_id: int) -> None:
        item = self.repo.get_by_id(roster_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Roster shift {roster_id} tidak ditemukan")

        self.db.delete(item)
        self.db.commit()

    def _validate_payload(self, data: dict) -> None:
        jam_mulai = data.get("jam_mulai")
        jam_selesai = data.get("jam_selesai")
        if jam_mulai and jam_selesai and jam_selesai <= jam_mulai:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="jam_selesai harus lebih besar dari jam_mulai")

        jenis_shift = data.get("jenis_shift")
        if jenis_shift and jenis_shift not in VALID_JENIS_SHIFT:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"jenis_shift tidak valid. Gunakan salah satu: {', '.join(sorted(VALID_JENIS_SHIFT))}")

        status_roster = data.get("status_roster")
        if status_roster and status_roster not in VALID_STATUS_ROSTER:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"status_roster tidak valid. Gunakan salah satu: {', '.join(sorted(VALID_STATUS_ROSTER))}")

        nomor_sesi = data.get("nomor_sesi")
        if nomor_sesi is not None and nomor_sesi <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="nomor_sesi harus lebih besar dari 0")

        for field_name in ["grace_telat_override_menit", "toleransi_pulang_cepat_override_menit"]:
            value = data.get(field_name)
            if value is not None and value < 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{field_name} tidak boleh negatif")

    @staticmethod
    def _to_response(item: RosterShift) -> RosterShiftResponse:
        data = RosterShiftResponse.model_validate(item).model_dump()
        data["pegawai_nama"] = item.pegawai.nama if item.pegawai else None
        data["shift_kelompok_nama"] = item.shift_kelompok.nama if item.shift_kelompok else None
        data["unit_nama"] = item.unit.nama_unit if item.unit else None
        data["upload_batch_file_name"] = item.upload_batch.file_name if item.upload_batch else None
        return RosterShiftResponse(**data)
