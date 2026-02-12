"""
API v1 Main Router
Menggabungkan semua endpoint
"""
from fastapi import APIRouter
from api.v1.endpoints import halo, auth, users, roles, permissions, pegawai, absensi, login_absensi

api_router = APIRouter()

# Authentication
api_router.include_router(auth.router)

# Users Management (Admin)
api_router.include_router(users.router)

# Roles Management (Admin)
api_router.include_router(roles.router)

# Permissions Management (Admin)
api_router.include_router(permissions.router)

# Pegawai Management (Admin)
api_router.include_router(pegawai.router)

# Absensi (Admin + User Dashboard)
api_router.include_router(absensi.router)

# Login Absensi (Device Login Tracking)
api_router.include_router(login_absensi.router)

# Legacy/Example endpoint
api_router.include_router(
    halo.router,
    prefix="/halo",
    tags=["Halo"]
)
