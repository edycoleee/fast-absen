"""
Bootstrap initial super-admin user from env settings.
"""
from datetime import datetime, date
from typing import Optional
from sqlalchemy.orm import Session

from config.settings import settings
from config.database import SessionLocal
from models.user import User
from models.role import Role
from models.permission import Permission
from models.pegawai import Pegawai
from utils.auth import get_password_hash
from utils.logger import logger
from utils.permission_registry import PERMISSIONS


SUPER_ADMIN_NAMES = {"super-admin", "super_admin", "superadmin"}


def _parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None

    for fmt in ("%Y-%m-%d", "%Y%m%d"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue

    return None


def _normalize_password(value: str) -> str:
    password_bytes = value.encode("utf-8")
    if len(password_bytes) <= 72:
        return value
    return password_bytes[:72].decode("utf-8", errors="ignore")


def _ensure_permissions(db: Session) -> list[Permission]:
    existing = {perm.name: perm for perm in db.query(Permission).all()}

    created = False
    for name, description in PERMISSIONS.items():
        if name in existing:
            if description and existing[name].description != description:
                existing[name].description = description
                created = True
            continue

        db.add(Permission(name=name, description=description))
        created = True

    if created:
        db.commit()

    return db.query(Permission).filter(Permission.name.in_(PERMISSIONS.keys())).all()


def bootstrap_super_admin() -> None:
    if not settings.ADMIN_USERNAME or not settings.ADMIN_PASSWORD:
        logger.info("Bootstrap admin skipped: ADMIN_USERNAME/ADMIN_PASSWORD not set")
        return

    session = SessionLocal()
    try:
        permissions = _ensure_permissions(session)

        role = session.query(Role).filter(Role.name.in_(SUPER_ADMIN_NAMES)).first()
        if not role:
            role = Role(name="super-admin", description="Full system access")
            session.add(role)
            session.commit()
            session.refresh(role)

        role_permission_names = {perm.name for perm in role.permissions}
        missing_permissions = [perm for perm in permissions if perm.name not in role_permission_names]
        if missing_permissions:
            role.permissions.extend(missing_permissions)
            session.commit()

        pegawai_id = settings.ADMIN_ID_PEGAWAI
        if pegawai_id:
            pegawai = session.query(Pegawai).filter(Pegawai.id_pegawai == pegawai_id).first()
            if not pegawai:
                pegawai = Pegawai(
                    id_pegawai=pegawai_id,
                    nip=settings.ADMIN_NIP,
                    nama=settings.ADMIN_NAMA,
                    jenis_kelamin=settings.ADMIN_JENIS_KELAMIN,
                    tempat_lahir=settings.ADMIN_TEMPAT_LAHIR,
                    tanggal_lahir=_parse_date(settings.ADMIN_TANGGAL_LAHIR),
                    alamat=settings.ADMIN_ALAMAT,
                    status=settings.ADMIN_STATUS
                )
                session.add(pegawai)
                session.commit()
            else:
                if settings.ADMIN_NIP:
                    pegawai.nip = settings.ADMIN_NIP
                if settings.ADMIN_NAMA:
                    pegawai.nama = settings.ADMIN_NAMA
                if settings.ADMIN_JENIS_KELAMIN:
                    pegawai.jenis_kelamin = settings.ADMIN_JENIS_KELAMIN
                if settings.ADMIN_TEMPAT_LAHIR:
                    pegawai.tempat_lahir = settings.ADMIN_TEMPAT_LAHIR
                if settings.ADMIN_TANGGAL_LAHIR:
                    pegawai.tanggal_lahir = _parse_date(settings.ADMIN_TANGGAL_LAHIR)
                if settings.ADMIN_ALAMAT:
                    pegawai.alamat = settings.ADMIN_ALAMAT
                if settings.ADMIN_STATUS:
                    pegawai.status = settings.ADMIN_STATUS
                session.commit()

        user = session.query(User).filter(User.username == settings.ADMIN_USERNAME).first()
        if not user:
            user = User(
                username=settings.ADMIN_USERNAME,
                password_hash=get_password_hash(_normalize_password(settings.ADMIN_PASSWORD)),
                id_pegawai=pegawai_id,
                is_active=True
            )
            session.add(user)
            session.commit()
            session.refresh(user)
        elif settings.ADMIN_FORCE_UPDATE:
            user.password_hash = get_password_hash(_normalize_password(settings.ADMIN_PASSWORD))
            if pegawai_id:
                user.id_pegawai = pegawai_id
            session.commit()

        if role not in user.roles:
            user.roles.append(role)
            session.commit()

        logger.info("Bootstrap admin completed for user %s", settings.ADMIN_USERNAME)
    except Exception as exc:
        session.rollback()
        logger.error("Bootstrap admin failed: %s", exc)
        raise
    finally:
        session.close()
