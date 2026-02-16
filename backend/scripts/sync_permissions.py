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


# Role configurations
ADMIN_ROLE_NAMES = {"super-admin", "super_admin", "superadmin"}

# Permissions for each role
USER_PERMISSIONS = {
    "user.login",
    "absensi.read",
    "absensi.create",
    "absensi.update",
}

ADMIN_PERMISSIONS = {
    "user.login",
    "users.read", "users.create", "users.update", "users.delete",
    "pegawai.read", "pegawai.create", "pegawai.update", "pegawai.delete",
    "absensi.read", "absensi.create", "absensi.update", "absensi.delete",
    "user_sessions.read",
}


def sync_permissions(db: Session) -> None:
    """Sync permissions from registry to database and assign to roles"""
    existing = {perm.name: perm for perm in db.query(Permission).all()}

    created = 0
    updated = 0
    for name, description in PERMISSIONS.items():
        if name in existing:
            if description and existing[name].description != description:
                existing[name].description = description
                updated += 1
            continue

        db.add(Permission(name=name, description=description))
        created += 1

    if created or updated:
        db.commit()
        print(f"✅ Permissions: {created} created, {updated} updated")

    # Get all permissions
    permissions = db.query(Permission).filter(Permission.name.in_(PERMISSIONS.keys())).all()
    perm_map = {p.name: p for p in permissions}
    
    # Assign to super-admin (all permissions)
    super_admin_roles = db.query(Role).filter(Role.name.in_(ADMIN_ROLE_NAMES)).all()
    for role in super_admin_roles:
        role_permission_names = {perm.name for perm in role.permissions}
        missing = [perm for perm in permissions if perm.name not in role_permission_names]
        if missing:
            role.permissions.extend(missing)
            print(f"✅ Assigned {len(missing)} permissions to role '{role.name}'")
    
    # Assign to admin role
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if admin_role:
        admin_perms = [perm_map[name] for name in ADMIN_PERMISSIONS if name in perm_map]
        role_permission_names = {perm.name for perm in admin_role.permissions}
        missing = [perm for perm in admin_perms if perm.name not in role_permission_names]
        if missing:
            admin_role.permissions.extend(missing)
            print(f"✅ Assigned {len(missing)} permissions to role 'admin'")
    
    # Assign to user role
    user_role = db.query(Role).filter(Role.name == "user").first()
    if user_role:
        user_perms = [perm_map[name] for name in USER_PERMISSIONS if name in perm_map]
        role_permission_names = {perm.name for perm in user_role.permissions}
        missing = [perm for perm in user_perms if perm.name not in role_permission_names]
        if missing:
            user_role.permissions.extend(missing)
            print(f"✅ Assigned {len(missing)} permissions to role 'user'")
    
    db.commit()

    # Check for orphaned permissions
    extras = [name for name in existing.keys() if name not in PERMISSIONS]
    if extras:
        print(f"⚠️  Warning: {len(extras)} permissions not in registry:", ", ".join(sorted(extras)))


if __name__ == "__main__":
    session = SessionLocal()
    try:
        sync_permissions(session)
        print("✅ Permissions sync completed successfully.")
    except Exception as exc:
        print(f"❌ Sync failed: {exc}")
        session.rollback()
        sys.exit(1)
    finally:
        session.close()
