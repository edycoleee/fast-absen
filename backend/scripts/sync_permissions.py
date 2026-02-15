"""
Sync permissions registry with database.

Usage:
  python scripts/sync_permissions.py
"""
import sys
from sqlalchemy.orm import Session
from config.database import SessionLocal
from models.permission import Permission
from models.role import Role
from utils.permission_registry import PERMISSIONS


ADMIN_ROLE_NAMES = {"super-admin", "super_admin", "superadmin"}


def sync_permissions(db: Session) -> None:
    existing = {perm.name: perm for perm in db.query(Permission).all()}

    created = 0
    for name, description in PERMISSIONS.items():
        if name in existing:
            if description and existing[name].description != description:
                existing[name].description = description
            continue

        db.add(Permission(name=name, description=description))
        created += 1

    if created:
        db.commit()

    permissions = db.query(Permission).filter(Permission.name.in_(PERMISSIONS.keys())).all()
    roles = db.query(Role).filter(Role.name.in_(ADMIN_ROLE_NAMES)).all()

    for role in roles:
        role_permission_names = {perm.name for perm in role.permissions}
        missing = [perm for perm in permissions if perm.name not in role_permission_names]
        if missing:
            role.permissions.extend(missing)

    if roles:
        db.commit()

    extras = [name for name in existing.keys() if name not in PERMISSIONS]
    if extras:
        print("Warning: permissions not in registry:", ", ".join(sorted(extras)))


if __name__ == "__main__":
    session = SessionLocal()
    try:
        sync_permissions(session)
        print("Permissions sync completed.")
    except Exception as exc:
        print(f"Sync failed: {exc}")
        session.rollback()
        sys.exit(1)
    finally:
        session.close()
