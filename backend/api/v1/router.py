"""
API v1 Main Router
Menggabungkan semua endpoint
"""
from fastapi import APIRouter
from api.v1.endpoints import (
	halo,
	auth,
	users,
	roles,
	permissions,
	pegawai,
	absensi,
	user_sessions,
	stats,
	unit,
	shift_kelompok,
	shift_kelompok_aturan,
	pegawai_shift_kelompok,
	roster_upload_batch,
	roster_shift,
	penilaian_shift_absensi,
	approval_pengajuan_absensi_log,
	approval_pengajuan_absensi,
)

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

# Unit Management (Admin)
api_router.include_router(unit.router)

# Shift Kelompok Management (Admin)
api_router.include_router(shift_kelompok.router)

# Shift Kelompok Aturan Management (Admin)
api_router.include_router(shift_kelompok_aturan.router)

# Pegawai Shift Kelompok Management (Admin)
api_router.include_router(pegawai_shift_kelompok.router)

# Roster Upload Batch Management (Admin)
api_router.include_router(roster_upload_batch.router)

# Roster Shift Management (Admin)
api_router.include_router(roster_shift.router)

# Penilaian Shift Absensi Management (Admin)
api_router.include_router(penilaian_shift_absensi.router)

# Approval Pengajuan Absensi Log (Read-only)
api_router.include_router(approval_pengajuan_absensi_log.router)

# Absensi (Admin + User Dashboard)
api_router.include_router(absensi.router)

# Approval Pengajuan Absensi
api_router.include_router(approval_pengajuan_absensi.router)

# User Sessions Monitoring (Admin)
api_router.include_router(user_sessions.router)

# Dashboard stats
api_router.include_router(stats.router)

# Legacy/Example endpoint
api_router.include_router(halo.router)
