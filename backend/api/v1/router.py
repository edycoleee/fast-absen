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
    face,
    kamus_kode_shift,
    kamus_pola_shift,
    app_settings,
)

api_router = APIRouter()

# Autentikasi
api_router.include_router(auth.router)

# User Management (Admin)
api_router.include_router(users.router)

# Role Management (Admin)
api_router.include_router(roles.router)

# Permission Management (Admin)
api_router.include_router(permissions.router)

# Unit Management (Admin)
api_router.include_router(unit.router)

# Pegawai Management (Admin)
api_router.include_router(pegawai.router)

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

# Face Recognition (User + Admin)
api_router.include_router(face.router)

# Kamus Kode Shift Master (Admin)
api_router.include_router(kamus_kode_shift.router)

# Kamus Pola Shift Master (Admin)
api_router.include_router(kamus_pola_shift.router)

# App Settings (Admin read/write, public read)
api_router.include_router(app_settings.router)

# Legacy/Example endpoint
api_router.include_router(halo.router)
