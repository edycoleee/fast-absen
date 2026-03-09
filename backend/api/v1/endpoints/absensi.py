"""
Absensi Endpoints
Check-in/Check-out system with Admin CRUD + User Dashboard
"""
from typing import List, Optional
from datetime import date, datetime, timedelta
from io import BytesIO
from fastapi import APIRouter, Depends, status, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
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
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.ABSENSI_READ))
):
    """Get absensi history for current user with optional date range filter"""
    service = AbsensiService(db)
    id_pegawai = current_user.id_pegawai
    absensi_list = service.get_user_history(id_pegawai, skip=skip, limit=limit, start_date=start_date, end_date=end_date)
    total = service.count_user_history(id_pegawai, start_date=start_date, end_date=end_date)
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


@router.get("/export/rekap")
def export_rekap_excel(
    start_date: date = Query(..., description="Tanggal mulai (YYYY-MM-DD)"),
    end_date: date = Query(..., description="Tanggal selesai (YYYY-MM-DD)"),
    id_unit: Optional[int] = Query(None, description="Filter unit (opsional)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.ABSENSI_READ)),
):
    """
    Export laporan rekap absensi ke Excel.

    Format: satu baris per pegawai, kolom pasangan Masuk/Keluar untuk setiap tanggal.
    Contoh header: No | Nama | Unit | 01/03 Masuk | 01/03 Keluar | 02/03 Masuk | ...
    """
    from models.absensi import Absensi
    from models.pegawai import Pegawai
    from models.unit import Unit
    from collections import defaultdict

    # --- Batas maksimal 31 hari untuk mencegah file terlalu besar ---
    if (end_date - start_date).days > 61:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Rentang maksimal 62 hari per ekspor")

    # --- 1. Ambil semua tanggal dalam rentang ---
    total_days = (end_date - start_date).days + 1
    date_range = [start_date + timedelta(days=i) for i in range(total_days)]

    # --- 2. Ambil semua pegawai dalam scope ---
    pegawai_q = (
        db.query(
            Pegawai.id_pegawai,
            Pegawai.nama,
            Pegawai.id_unit,
            Unit.nama_unit,
        )
        .join(Unit, Unit.id_unit == Pegawai.id_unit, isouter=True)
        .filter(Pegawai.status.notin_(["Tidak Aktif", "TIDAK AKTIF", "Non Aktif"]))
    )
    if id_unit is not None:
        pegawai_q = pegawai_q.filter(Pegawai.id_unit == id_unit)
    pegawai_rows = pegawai_q.order_by(Pegawai.id_unit, Pegawai.nama).all()

    # --- 3. Ambil semua absensi dalam rentang ---
    absensi_q = (
        db.query(Absensi)
        .filter(Absensi.tanggal >= start_date, Absensi.tanggal <= end_date)
    )
    if id_unit is not None:
        absensi_q = absensi_q.join(Pegawai, Pegawai.id_pegawai == Absensi.id_pegawai).filter(
            Pegawai.id_unit == id_unit
        )

    # index: {id_pegawai: {tanggal: Absensi}}
    absensi_map: dict[str, dict[date, "Absensi"]] = defaultdict(dict)
    for ab in absensi_q.all():
        absensi_map[ab.id_pegawai][ab.tanggal] = ab

    # --- 4. Bangun Excel ---
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"Rekap {start_date.strftime('%d%b')}-{end_date.strftime('%d%b%Y')}"

    # Style constants
    thin = Side(border_style="thin", color="BBBBBB")
    border_all = Border(left=thin, right=thin, top=thin, bottom=thin)

    header_fill_dark = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    header_fill_masuk = PatternFill(start_color="1A6B3C", end_color="1A6B3C", fill_type="solid")
    header_fill_keluar = PatternFill(start_color="7B3F00", end_color="7B3F00", fill_type="solid")
    white_font = Font(color="FFFFFF", bold=True, size=9)
    bold_font = Font(bold=True, size=9)
    normal_font = Font(size=9)
    center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left = Alignment(horizontal="left", vertical="center")

    # ---- Row 1: Judul ----
    judul_cols = 3 + total_days * 2
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=judul_cols)
    judul_cell = ws.cell(row=1, column=1)
    unit_label = ""
    if id_unit and pegawai_rows:
        unit_label = f" — {pegawai_rows[0].nama_unit}"
    judul_cell.value = (
        f"LAPORAN ABSENSI PEGAWAI{unit_label}\n"
        f"Periode: {start_date.strftime('%d %B %Y')} s/d {end_date.strftime('%d %B %Y')}"
    )
    judul_cell.font = Font(bold=True, size=12, color="1F4E79")
    judul_cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[1].height = 40

    # ---- Row 2: Sub-header tanggal (merged pair Masuk+Keluar) ----
    # Col 1 = No, Col 2 = Nama, Col 3 = Unit
    for col_idx in range(1, 4):
        c = ws.cell(row=2, column=col_idx)
        c.fill = header_fill_dark
        c.font = white_font
        c.alignment = center
        c.border = border_all
    ws.cell(row=2, column=1).value = "No"
    ws.cell(row=2, column=2).value = "Nama Pegawai"
    ws.cell(row=2, column=3).value = "Unit"
    ws.merge_cells(start_row=2, start_column=2, end_row=3, end_column=2)
    ws.merge_cells(start_row=2, start_column=3, end_row=3, end_column=3)
    ws.merge_cells(start_row=2, start_column=1, end_row=3, end_column=1)

    start_col = 4
    for i, d in enumerate(date_range):
        col_m = start_col + i * 2      # Masuk column
        col_k = start_col + i * 2 + 1  # Keluar column
        # Merge 2 cells for the date label
        ws.merge_cells(start_row=2, start_column=col_m, end_row=2, end_column=col_k)
        date_cell = ws.cell(row=2, column=col_m)
        hari = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"][d.weekday()]
        date_cell.value = f"{hari}\n{d.strftime('%d/%m')}"
        date_cell.fill = header_fill_dark
        date_cell.font = white_font
        date_cell.alignment = center
        date_cell.border = border_all
        ws.cell(row=2, column=col_k).border = border_all

    # ---- Row 3: Sub-header Masuk / Keluar per tanggal ----
    for i in range(total_days):
        col_m = start_col + i * 2
        col_k = start_col + i * 2 + 1
        cm = ws.cell(row=3, column=col_m, value="Masuk")
        cm.fill = header_fill_masuk
        cm.font = white_font
        cm.alignment = center
        cm.border = border_all

        ck = ws.cell(row=3, column=col_k, value="Keluar")
        ck.fill = header_fill_keluar
        ck.font = white_font
        ck.alignment = center
        ck.border = border_all

    ws.row_dimensions[2].height = 28
    ws.row_dimensions[3].height = 18

    # ---- Rows 4+: Data ----
    row_num = 4
    for no, peg in enumerate(pegawai_rows, start=1):
        ws.cell(row=row_num, column=1, value=no).font = normal_font
        ws.cell(row=row_num, column=1).alignment = center
        ws.cell(row=row_num, column=1).border = border_all

        nama_cell = ws.cell(row=row_num, column=2, value=peg.nama or peg.id_pegawai)
        nama_cell.font = normal_font
        nama_cell.alignment = left
        nama_cell.border = border_all

        unit_cell = ws.cell(row=row_num, column=3, value=peg.nama_unit or "-")
        unit_cell.font = normal_font
        unit_cell.alignment = left
        unit_cell.border = border_all

        for i, d in enumerate(date_range):
            col_m = start_col + i * 2
            col_k = start_col + i * 2 + 1

            ab = absensi_map.get(peg.id_pegawai, {}).get(d)

            if ab and ab.jam_masuk:
                jam_m = ab.jam_masuk.astimezone().strftime("%H:%M:%S")
            else:
                jam_m = ""
            if ab and ab.jam_keluar:
                jam_k = ab.jam_keluar.astimezone().strftime("%H:%M:%S")
            else:
                jam_k = ""

            cm = ws.cell(row=row_num, column=col_m, value=jam_m)
            cm.font = normal_font
            cm.alignment = center
            cm.border = border_all

            ck = ws.cell(row=row_num, column=col_k, value=jam_k)
            ck.font = normal_font
            ck.alignment = center
            ck.border = border_all

            # Highlight terlambat / alpha
            if ab:
                if ab.status in ("TERLAMBAT",):
                    cm.fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
                elif ab.status in ("ALPHA", "IZIN", "SAKIT", "CUTI"):
                    cm.fill = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")
                    ck.fill = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")

        row_num += 1

    # ---- Column widths ----
    ws.column_dimensions["A"].width = 5
    ws.column_dimensions["B"].width = 30
    ws.column_dimensions["C"].width = 22
    for i in range(total_days * 2):
        col_letter = get_column_letter(start_col + i)
        ws.column_dimensions[col_letter].width = 9

    # ---- Freeze panes: beku 3 baris header + 3 kolom kiri ----
    ws.freeze_panes = ws.cell(row=4, column=start_col)

    # ---- Keterangan warna di bawah ----
    ws.cell(row=row_num + 1, column=1, value="Keterangan:").font = bold_font
    ws.cell(row=row_num + 2, column=1, value="Kuning").fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
    ws.cell(row=row_num + 2, column=2, value="= Terlambat").font = normal_font
    ws.cell(row=row_num + 3, column=1, value="Oranye").fill = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")
    ws.cell(row=row_num + 3, column=2, value="= Alpha / Izin / Sakit / Cuti").font = normal_font

    # ---- Stream response ----
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    filename = f"rekap_absensi_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/", response_model=dict)
def get_all_absensi(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    id_pegawai: Optional[str] = None,
    id_unit: Optional[int] = None,
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
    - status: Filter by status (HADIR, IZIN, SAKIT, ALPHA, TERLAMBAT, CUTI)
    """
    from models.absensi import Absensi
    from models.pegawai import Pegawai
    from models.unit import Unit
    from models.penilaian_shift_absensi import PenilaianShiftAbsensi
    from models.roster_shift import RosterShift

    # Base query for IDs (stable pagination under joins).
    # Include tanggal + jam_masuk in SELECT so PostgreSQL allows ORDER BY on them
    # when DISTINCT is used (PG requires ORDER BY cols to appear in SELECT list).
    ids_query = (
        db.query(Absensi.id, Absensi.tanggal, Absensi.jam_masuk)
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
