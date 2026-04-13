"""
SSO App-Client Endpoints
CRUD management untuk registry aplikasi yang menggunakan SSO ini sebagai identity provider.
Hanya superadmin/admin penuh yang dapat mengakses endpoint ini.
"""
import hashlib
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from config.database import get_db
from models.app_client import AppClient
from models.user import User
from utils.dependencies import require_admin
from utils.response import success_response

router = APIRouter(prefix="/sso", tags=["SSO – App Clients"])


# ─────────────────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────────────────

class AppClientCreate(BaseModel):
    client_id: str = Field(..., min_length=2, max_length=100,
                           description="Unique identifier, e.g. 'simrs-web'")
    client_name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    client_secret: Optional[str] = Field(
        None, description="Plain-text secret (stored as SHA-256 hash). Omit for public/trusted apps."
    )
    allowed_origins: Optional[str] = None
    allowed_scopes: Optional[str] = "identity:read"
    is_active: bool = True


class AppClientUpdate(BaseModel):
    client_name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    client_secret: Optional[str] = Field(
        None, description="Supply to rotate secret. Leave null to keep existing."
    )
    allowed_origins: Optional[str] = None
    allowed_scopes: Optional[str] = None
    is_active: Optional[bool] = None


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()


def _serialize(client: AppClient) -> dict:
    return {
        "id": client.id,
        "client_id": client.client_id,
        "client_name": client.client_name,
        "description": client.description,
        "allowed_origins": client.allowed_origins,
        "allowed_scopes": client.allowed_scopes,
        "has_secret": client.client_secret_hash is not None,
        "is_active": client.is_active,
        "created_at": client.created_at.isoformat() if client.created_at else None,
        "updated_at": client.updated_at.isoformat() if client.updated_at else None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/app-clients", response_model=dict)
def list_app_clients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """List semua app client yang terdaftar (admin only)."""
    query = db.query(AppClient)
    total = query.count()
    clients = query.order_by(AppClient.created_at.desc()).offset(skip).limit(limit).all()

    return success_response(
        message="App clients retrieved successfully",
        data={
            "items": [_serialize(c) for c in clients],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    )


@router.post("/app-clients", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_app_client(
    payload: AppClientCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Daftarkan aplikasi baru sebagai SSO consumer."""
    existing = db.query(AppClient).filter(AppClient.client_id == payload.client_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"client_id '{payload.client_id}' sudah terdaftar.",
        )

    secret_hash = _hash_secret(payload.client_secret) if payload.client_secret else None

    client = AppClient(
        client_id=payload.client_id,
        client_name=payload.client_name,
        description=payload.description,
        client_secret_hash=secret_hash,
        allowed_origins=payload.allowed_origins,
        allowed_scopes=payload.allowed_scopes or "identity:read",
        is_active=payload.is_active,
    )
    db.add(client)
    db.commit()
    db.refresh(client)

    return success_response(
        message="App client created successfully",
        data=_serialize(client),
    )


@router.get("/app-clients/{client_pk}", response_model=dict)
def get_app_client(
    client_pk: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Detail satu app client."""
    client = db.query(AppClient).filter(AppClient.id == client_pk).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App client tidak ditemukan.")

    return success_response(message="App client retrieved successfully", data=_serialize(client))


@router.put("/app-clients/{client_pk}", response_model=dict)
def update_app_client(
    client_pk: int,
    payload: AppClientUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Update data app client."""
    client = db.query(AppClient).filter(AppClient.id == client_pk).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App client tidak ditemukan.")

    if payload.client_name is not None:
        client.client_name = payload.client_name
    if payload.description is not None:
        client.description = payload.description
    if payload.client_secret is not None:
        client.client_secret_hash = _hash_secret(payload.client_secret)
    if payload.allowed_origins is not None:
        client.allowed_origins = payload.allowed_origins
    if payload.allowed_scopes is not None:
        client.allowed_scopes = payload.allowed_scopes
    if payload.is_active is not None:
        client.is_active = payload.is_active

    db.commit()
    db.refresh(client)

    return success_response(message="App client updated successfully", data=_serialize(client))


@router.patch("/app-clients/{client_pk}/disable", response_model=dict)
def disable_app_client(
    client_pk: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Nonaktifkan app client (soft disable)."""
    client = db.query(AppClient).filter(AppClient.id == client_pk).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App client tidak ditemukan.")

    client.is_active = False
    db.commit()
    db.refresh(client)

    return success_response(message="App client disabled", data=_serialize(client))


@router.patch("/app-clients/{client_pk}/enable", response_model=dict)
def enable_app_client(
    client_pk: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Aktifkan kembali app client."""
    client = db.query(AppClient).filter(AppClient.id == client_pk).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App client tidak ditemukan.")

    client.is_active = True
    db.commit()
    db.refresh(client)

    return success_response(message="App client enabled", data=_serialize(client))
