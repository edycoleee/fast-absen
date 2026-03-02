"""
App Settings Endpoint
Konfigurasi sistem yang dapat diubah admin (face threshold, dll.)
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator

from config.database import get_db
from repositories.app_setting_repository import AppSettingRepository
from utils.dependencies import get_current_user, require_super_admin
from models.user import User

router = APIRouter(prefix="/app-settings", tags=["App Settings"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class AppSettingUpdate(BaseModel):
    value: str
    description: Optional[str] = None
    locked: Optional[bool] = None

    @field_validator("value")
    @classmethod
    def value_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("value tidak boleh kosong")
        return v.strip()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=dict)
def get_all_settings(db: Session = Depends(get_db)):
    """
    Ambil semua konfigurasi sistem.
    Endpoint ini bersifat publik agar frontend bisa membaca konfigurasi
    (seperti face_threshold) tanpa login.
    """
    repo = AppSettingRepository(db)
    settings = repo.get_all()
    return {
        "success": True,
        "message": "OK",
        "data": [
            {
                "key": s.key,
                "value": s.value,
                "description": s.description,
                "locked": s.locked,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            }
            for s in settings
        ],
    }


@router.get("/{key}", response_model=dict)
def get_setting(key: str, db: Session = Depends(get_db)):
    """Ambil satu konfigurasi berdasarkan key."""
    repo = AppSettingRepository(db)
    setting = repo.get(key)
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' tidak ditemukan")
    return {
        "success": True,
        "message": "OK",
        "data": {
            "key": setting.key,
            "value": setting.value,
            "description": setting.description,
            "locked": setting.locked,
            "updated_at": setting.updated_at.isoformat() if setting.updated_at else None,
        },
    }


@router.put("/{key}", response_model=dict, dependencies=[Depends(require_super_admin)])
def update_setting(
    key: str,
    body: AppSettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update atau buat konfigurasi sistem.
    Hanya super-admin yang dapat mengubah nilai dan status kunci.
    """
    repo = AppSettingRepository(db)
    setting = repo.upsert(
        key=key,
        value=body.value,
        description=body.description,
        locked=body.locked,
        updated_by=current_user.id,
    )
    return {
        "success": True,
        "message": f"Setting '{key}' berhasil diperbarui",
        "data": {
            "key": setting.key,
            "value": setting.value,
            "description": setting.description,
            "locked": setting.locked,
            "updated_at": setting.updated_at.isoformat() if setting.updated_at else None,
        },
    }


@router.delete("/{key}", response_model=dict, dependencies=[Depends(require_super_admin)])
def delete_setting(key: str, db: Session = Depends(get_db)):
    """Hapus konfigurasi. Hanya super-admin."""
    repo = AppSettingRepository(db)
    deleted = repo.delete(key)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' tidak ditemukan")
    return {"success": True, "message": f"Setting '{key}' berhasil dihapus", "data": {}}
