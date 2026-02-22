"""
Absensi Endpoints
Check-in/Check-out system with Admin CRUD + User Dashboard
"""
from typing import List, Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.absensi import (
    AbsensiCreate, AbsensiUpdate, AbsensiResponse, AbsensiDetail,
    AbsensiCheckOut, AbsensiSummary, AbsensiTodayResponse
)
from services.absensi_service import AbsensiService
from utils.dependencies import get_current_user, require_permission
from utils.permission_registry import PermissionKeys
from models.user import User
from utils.response import success_response


router = APIRouter(prefix="/absensi", tags=["Absensi"])


# ===== User Endpoints (Check-in/Check-out) =====
# NOTE: These must come BEFORE /{absensi_id} to avoid route conflicts

@router.post("/check-in", response_model=dict, status_code=status.HTTP_201_CREATED)
def check_in(
    absensi_data: AbsensiCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.ABSENSI_CREATE))
):
    """
    Check-in for current user
    
    Validations:
    - Cannot check-in twice on same day
    - Keterangan WAJIB untuk status: IZIN, SAKIT, TERLAMBAT, CUTI
    - Captures IP address automatically
    - Sets jam_masuk to current time
    """
    service = AbsensiService(db)
    
    # Get id_pegawai from current user token
    id_pegawai = current_user.id_pegawai
    
    new_absensi = service.check_in(id_pegawai, absensi_data, request)
    
    return success_response(
        message="Check-in berhasil!",
        data=new_absensi.model_dump()
    )


@router.post("/check-out", response_model=dict)
def check_out(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.ABSENSI_UPDATE))
):
    """
    Check-out for current user (today's absensi)
    
    Validations:
    - Must have checked-in today
    - Cannot check-out twice
    - Captures IP address automatically
    - Sets jam_keluar to current time
    """
    service = AbsensiService(db)
    
    # Get id_pegawai from current user token
    id_pegawai = current_user.id_pegawai
    
    updated_absensi = service.check_out(id_pegawai, request)
    
    return success_response(
        message="Check-out berhasil!",
        data=updated_absensi.model_dump()
    )


@router.get("/today", response_model=dict)
def get_today_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.ABSENSI_READ))
):
    """
    Get today's absensi status for current user
    
    Returns:
    - has_checked_in: boolean
    - absensi: today's absensi data if exists
    - can_check_out: boolean (true if checked-in but not checked-out)
    """
    service = AbsensiService(db)
    
    # Get id_pegawai from current user token
    id_pegawai = current_user.id_pegawai
    
    today_status = service.get_today_status(id_pegawai)
    
    return success_response(
        message="Today's status retrieved successfully",
        data=today_status.model_dump()
    )


@router.get("/history", response_model=dict)
def get_my_history(
    skip: int = 0,
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.ABSENSI_READ))
):
    """Get absensi history for current user (last 30 days by default)"""
    service = AbsensiService(db)
    
    # Get id_pegawai from current user token
    id_pegawai = current_user.id_pegawai
    
    absensi_list = service.get_user_history(id_pegawai, skip=skip, limit=limit)
    total = service.count_user_history(id_pegawai)
    
    return success_response(
        message="Your absensi history retrieved successfully",
        data={"items": [a.model_dump() for a in absensi_list], "total": total, "skip": skip, "limit": limit}
    )


@router.get("/summary", response_model=dict)
def get_my_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.ABSENSI_READ))
):
    """
    Get summary statistics for current user
    
    Returns count of each status:
    - total_hadir
    - total_izin
    - total_sakit
    - total_alpha
    - total_terlambat
    - total_cuti
    """
    service = AbsensiService(db)
    
    # Get id_pegawai from current user token
    id_pegawai = current_user.id_pegawai
    
    summary = service.get_user_summary(id_pegawai, start_date, end_date)
    
    return success_response(
        message="Your absensi summary retrieved successfully",
        data=summary.model_dump()
    )


@router.get("/statistics", response_model=dict)
def get_absensi_statistics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.ABSENSI_READ))
):
    """
    Get absensi statistics (Admin only)
    
    Returns:
    - Total absensi count
    - Today's absensi count
    - Breakdown by status
    - Recent 7 days trend
    """
    from models.absensi import Absensi
    from sqlalchemy import func
    
    # Base query
    query = db.query(Absensi)
    
    # Apply date filters if provided
    if start_date:
        query = query.filter(Absensi.tanggal >= start_date)
    if end_date:
        query = query.filter(Absensi.tanggal <= end_date)
    
    # Total count
    total_count = query.count()
    
    # Today's count
    today = date.today()
    today_count = db.query(Absensi).filter(
        func.date(Absensi.tanggal) == today
    ).count()
    
    # Breakdown by status
    status_stats = db.query(
        Absensi.status,
        func.count(Absensi.id).label('count')
    )
    if start_date:
        status_stats = status_stats.filter(Absensi.tanggal >= start_date)
    if end_date:
        status_stats = status_stats.filter(Absensi.tanggal <= end_date)
    
    status_stats = status_stats.group_by(Absensi.status).all()
    
    # Last 7 days trend
    seven_days_ago = today - timedelta(days=6)
    daily_stats = db.query(
        func.date(Absensi.tanggal).label('date'),
        func.count(Absensi.id).label('count')
    ).filter(
        Absensi.tanggal >= seven_days_ago
    ).group_by(func.date(Absensi.tanggal)).order_by(func.date(Absensi.tanggal)).all()
    
    # Count checked-in but not checked-out today
    pending_checkout = db.query(Absensi).filter(
        func.date(Absensi.tanggal) == today,
        Absensi.jam_keluar.is_(None)
    ).count()
    
    return success_response(
        message="Absensi statistics retrieved",
        data={
            "total_count": total_count,
            "today_count": today_count,
            "pending_checkout": pending_checkout,
            "by_status": {stat[0] or 'HADIR': stat[1] for stat in status_stats},
            "last_7_days": [
                {
                    "date": stat[0].isoformat() if stat[0] else None,
                    "count": stat[1]
                }
                for stat in daily_stats
            ]
        }
    )


# ===== Admin Endpoints =====

@router.get("/", response_model=dict)
def get_all_absensi(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    id_pegawai: Optional[str] = None,
    id_unit: Optional[int] = None,
    shift: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.ABSENSI_READ))
):
    """
    Get all absensi with filters (admin only)
    
    Filters:
    - start_date: Filter from date (YYYY-MM-DD)
    - end_date: Filter to date (YYYY-MM-DD)
    - id_pegawai: Filter by pegawai ID
    - id_unit: Filter by unit ID pegawai
    - shift: Filter by jenis shift roster (PAGI, SORE, MALAM, ON_CALL, CUSTOM)
    - status: Filter by status (HADIR, IZIN, SAKIT, ALPHA, TERLAMBAT, CUTI)
    """
    from models.absensi import Absensi
    from models.pegawai import Pegawai
    from models.unit import Unit
    from models.penilaian_shift_absensi import PenilaianShiftAbsensi
    from models.roster_shift import RosterShift

    # Base query for IDs (stable pagination under joins)
    ids_query = (
        db.query(Absensi.id)
        .join(Pegawai, Pegawai.id_pegawai == Absensi.id_pegawai)
    )

    if start_date:
        ids_query = ids_query.filter(Absensi.tanggal >= start_date)
    if end_date:
        ids_query = ids_query.filter(Absensi.tanggal <= end_date)
    if id_pegawai:
        ids_query = ids_query.filter(Absensi.id_pegawai == id_pegawai)
    if id_unit is not None:
        ids_query = ids_query.filter(Pegawai.id_unit == id_unit)
    if status:
        ids_query = ids_query.filter(Absensi.status == status.upper())

    if shift:
        ids_query = (
            ids_query
            .join(
                PenilaianShiftAbsensi,
                PenilaianShiftAbsensi.matched_absensi_id == Absensi.id,
            )
            .join(RosterShift, RosterShift.id == PenilaianShiftAbsensi.roster_shift_id)
            .filter(RosterShift.jenis_shift == shift.upper())
        )

    ids_query = ids_query.order_by(Absensi.tanggal.desc(), Absensi.jam_masuk.desc(), Absensi.id.desc())

    total = ids_query.distinct().count()

    paged_ids = [
        row[0]
        for row in ids_query.distinct().offset(skip).limit(limit).all()
    ]

    if not paged_ids:
        return success_response(
            message="Found 0 absensi records",
            data={"items": [], "total": 0, "skip": skip, "limit": limit}
        )

    details_rows = (
        db.query(
            Absensi,
            Pegawai.nama.label("pegawai_nama"),
            Pegawai.id_unit.label("id_unit"),
            Unit.nama_unit.label("nama_unit"),
            RosterShift.jenis_shift.label("jenis_shift"),
            PenilaianShiftAbsensi.status_final.label("status_final_shift"),
        )
        .join(Pegawai, Pegawai.id_pegawai == Absensi.id_pegawai)
        .join(Unit, Unit.id_unit == Pegawai.id_unit, isouter=True)
        .join(PenilaianShiftAbsensi, PenilaianShiftAbsensi.matched_absensi_id == Absensi.id, isouter=True)
        .join(RosterShift, RosterShift.id == PenilaianShiftAbsensi.roster_shift_id, isouter=True)
        .filter(Absensi.id.in_(paged_ids))
        .all()
    )

    first_row_by_absensi_id = {}
    for row in details_rows:
        absensi = row[0]
        if absensi.id not in first_row_by_absensi_id:
            first_row_by_absensi_id[absensi.id] = row

    # Convert to response format with additional monitoring metadata
    result = []
    for absensi_id in paged_ids:
        row = first_row_by_absensi_id.get(absensi_id)
        if not row:
            continue

        a = row[0]
        data = {
            "id": a.id,
            "id_pegawai": a.id_pegawai,
            "pegawai_nama": row.pegawai_nama,
            "tanggal": a.tanggal.isoformat() if a.tanggal else None,
            "jam_masuk": a.jam_masuk.isoformat() if a.jam_masuk else None,
            "jam_keluar": a.jam_keluar.isoformat() if a.jam_keluar else None,
            "status": a.status,
            "id_unit": row.id_unit,
            "nama_unit": row.nama_unit,
            "jenis_shift": row.jenis_shift,
            "status_final_shift": row.status_final_shift,
            "keterangan": a.keterangan,
            "ip_address": str(a.ip_address) if a.ip_address else None,
            "dokumen_pendukung": a.dokumen_pendukung,
        }
        result.append(data)
    
    return success_response(
        message=f"Found {total} absensi records",
        data={"items": result, "total": total, "skip": skip, "limit": limit}
    )


@router.get("/{absensi_id}", response_model=dict)
def get_absensi_by_id(
    absensi_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.ABSENSI_READ))
):
    """Get absensi by ID (admin only)"""
    service = AbsensiService(db)
    absensi = service.get_by_id_admin(absensi_id)
    
    return success_response(
        message="Absensi retrieved successfully",
        data=absensi.model_dump()
    )


@router.put("/{absensi_id}", response_model=dict)
def update_absensi(
    absensi_id: int,
    absensi_data: AbsensiUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.ABSENSI_UPDATE))
):
    """Update absensi (admin only)"""
    service = AbsensiService(db)
    updated_absensi = service.update_admin(absensi_id, absensi_data)
    
    return success_response(
        message="Absensi updated successfully",
        data=updated_absensi.model_dump()
    )


@router.delete("/{absensi_id}", response_model=dict, status_code=status.HTTP_200_OK)
def delete_absensi(
    absensi_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.ABSENSI_DELETE))
):
    """Delete absensi (admin only)"""
    service = AbsensiService(db)
    service.delete_admin(absensi_id)
    
    return success_response(
        message="Absensi deleted successfully"
    )
