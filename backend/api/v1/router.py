"""
API v1 Main Router
Menggabungkan semua endpoint
"""
from fastapi import APIRouter
from api.v1.endpoints import halo, auth, users, roles, permissions, pegawai, absensi, login_absensi

api_router = APIRouter()

# Authentication
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

# Users Management (Admin)
api_router.include_router(
    users.router,
    prefix="/users",
    tags=["Users"]
)

# Roles Management (Admin)
api_router.include_router(
    roles.router,
    prefix="/roles",
    tags=["Roles"]
)

# Permissions Management (Admin)
api_router.include_router(
    permissions.router,
    prefix="/permissions",
    tags=["Permissions"]
)

# Pegawai Management (Admin)
api_router.include_router(
    pegawai.router,
    prefix="/pegawai",
    tags=["Pegawai"]
)

# Absensi (Admin + User Dashboard)
api_router.include_router(
    absensi.router,
    prefix="/absensi",
    tags=["Absensi"]
)

# Login Absensi (Device Login Tracking)
api_router.include_router(
    login_absensi.router,
    prefix="/login-absensi",
    tags=["Login Absensi"]
)

# Legacy/Example endpoint
api_router.include_router(
    halo.router,
    prefix="/halo",
    tags=["Halo"]
)
