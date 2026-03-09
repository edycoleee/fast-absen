"""
Roster Shift Endpoints
CRUD jadwal resmi hasil upload/import
"""
from datetime import date, timedelta
from io import BytesIO
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import openpyxl
from openpyxl.styles import (
    PatternFill, Font, Alignment, Border, Side,
)
from openpyxl.utils import get_column_letter
from config.database import get_db
from schemas.roster_shift import RosterShiftCreate, RosterShiftUpdate
from services.roster_shift_service import RosterShiftService
from utils.dependencies import require_permission
from utils.permission_registry import PermissionKeys
from utils.response import success_response


router = APIRouter(prefix="/roster-shift", tags=["Roster Shift"])


@router.get("/", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_SHIFT_READ))])
def get_roster_shifts(
    skip: int = 0,
    limit: int = 100,
    id_pegawai: str = None,
    tanggal_mulai: str = None,
    tanggal_selesai: str = None,
    status_roster: str = None,
    shift_kelompok_id: int = None,
    id_unit: int = None,
    db: Session = Depends(get_db),
):
    from datetime import date as date_type
    def parse_date(s):
        try: return date_type.fromisoformat(s)
        except: return None

    tgl_mulai = parse_date(tanggal_mulai) if tanggal_mulai else None
    tgl_selesai = parse_date(tanggal_selesai) if tanggal_selesai else None

    service = RosterShiftService(db)
    items = service.get_all(
        skip=skip, limit=limit,
        id_pegawai=id_pegawai or None,
        tanggal_mulai=tgl_mulai, tanggal_selesai=tgl_selesai,
        status_roster=status_roster or None,
        shift_kelompok_id=shift_kelompok_id, id_unit=id_unit,
    )
    total = service.count_all(
        id_pegawai=id_pegawai or None,
        tanggal_mulai=tgl_mulai, tanggal_selesai=tgl_selesai,
        status_roster=status_roster or None,
        shift_kelompok_id=shift_kelompok_id, id_unit=id_unit,
    )
    return success_response(
        message="Roster shift retrieved successfully",
        data={"items": [item.model_dump(mode='json') for item in items], "total": total, "skip": skip, "limit": limit},
    )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_SHIFT_CREATE))])
def create_roster_shift(payload: RosterShiftCreate, db: Session = Depends(get_db)):
    service = RosterShiftService(db)
    created = service.create(payload)
    return success_response(message="Roster shift created successfully", data=created.model_dump(mode='json'))


@router.post("/batch", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_SHIFT_CREATE))])
def batch_create_roster_shifts(payloads: List[RosterShiftCreate], db: Session = Depends(get_db)):
    """
    Batch create roster shifts dari Roster Adapter.
    Menerima list RosterShiftCreate, melakukan insert satu per satu,
    mengembalikan ringkasan berhasil/gagal per baris.
    """
    service = RosterShiftService(db)
    created = []
    errors = []
    for idx, payload in enumerate(payloads):
        try:
            item = service.create(payload)
            created.append(item.model_dump(mode='json'))
        except Exception as e:
            errors.append({"row": idx + 1, "id_pegawai": payload.id_pegawai,
                           "tanggal_shift": str(payload.tanggal_shift), "error": str(e)})
    return success_response(
        message=f"Batch selesai: {len(created)} berhasil, {len(errors)} gagal",
        data={
            "created": created,
            "errors": errors,
            "total_created": len(created),
            "total_errors": len(errors),
        }
    )


@router.get("/export/rekap", dependencies=[Depends(require_permission(PermissionKeys.ROSTER_SHIFT_READ))])
def export_roster_rekap_excel(
    tanggal_mulai: date = Query(..., description="Tanggal mulai (YYYY-MM-DD)"),
    tanggal_selesai: date = Query(..., description="Tanggal selesai (YYYY-MM-DD)"),
    id_unit: Optional[int] = Query(None, description="Filter unit (opsional)"),
    id_pegawai: Optional[str] = Query(None, description="Filter pegawai (opsional)"),
    status_roster: Optional[str] = Query(None, description="Filter status (opsional)"),
    db: Session = Depends(get_db),
):
    """
    Export laporan roster shift ke Excel.

    Format cross-tab: satu baris per pegawai, satu kolom per tanggal.
    Isi sel: nama shift kelompok + jam mulai–selesai.
    Warna: hijau=AKTIF, kuning=DIUBAH, merah=BATAL.
    """
    from models.roster_shift import RosterShift
    from models.pegawai import Pegawai
    from models.unit import Unit
    from models.kamus_pola_shift import KamusPolaShift
    from collections import defaultdict

    if (tanggal_selesai - tanggal_mulai).days > 61:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Rentang maksimal 62 hari per ekspor")

    total_days = (tanggal_selesai - tanggal_mulai).days + 1
    date_range = [tanggal_mulai + timedelta(days=i) for i in range(total_days)]

    # 1. Ambil semua roster dalam rentang
    q = (
        db.query(RosterShift)
        .join(Pegawai, Pegawai.id_pegawai == RosterShift.id_pegawai, isouter=True)
        .join(Unit, Unit.id_unit == RosterShift.id_unit, isouter=True)
        .filter(
            RosterShift.tanggal_shift >= tanggal_mulai,
            RosterShift.tanggal_shift <= tanggal_selesai,
        )
    )
    if id_unit:
        q = q.filter(RosterShift.id_unit == id_unit)
    if id_pegawai:
        q = q.filter(RosterShift.id_pegawai == id_pegawai)
    if status_roster:
        q = q.filter(RosterShift.status_roster == status_roster)

    roster_list = q.order_by(RosterShift.id_pegawai, RosterShift.tanggal_shift).all()

    # 2. Kumpulkan daftar pegawai unik (urut nama)
    pegawai_map: dict[str, dict] = {}  # id_pegawai → {nama, unit_nama}
    for r in roster_list:
        if r.id_pegawai not in pegawai_map:
            pegawai_obj = r.pegawai
            unit_obj = r.unit
            pegawai_map[r.id_pegawai] = {
                "nama": pegawai_obj.nama if pegawai_obj else r.id_pegawai,
                "unit_nama": unit_obj.nama_unit if unit_obj else "",
                "id_unit": r.id_unit or 0,
            }

    # Urutkan pegawai berdasarkan unit lalu nama
    sorted_pegawai = sorted(
        pegawai_map.items(),
        key=lambda x: (x[1]["id_unit"], x[1]["nama"])
    )

    # 3. Index roster: {id_pegawai: {tanggal: [RosterShift]}}
    roster_index: dict[str, dict] = defaultdict(lambda: defaultdict(list))
    for r in roster_list:
        roster_index[r.id_pegawai][r.tanggal_shift].append(r)

    # 4. Nama shift kelompok via relasi
    shift_nama_cache: dict[int, str] = {}
    for r in roster_list:
        if r.shift_kelompok_id and r.shift_kelompok_id not in shift_nama_cache:
            if r.shift_kelompok and hasattr(r.shift_kelompok, 'nama'):
                shift_nama_cache[r.shift_kelompok_id] = r.shift_kelompok.nama
            else:
                shift_nama_cache[r.shift_kelompok_id] = f"#{r.shift_kelompok_id}"

    # 5. Bangun Excel
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"Roster {tanggal_mulai.strftime('%d%b')}-{tanggal_selesai.strftime('%d%b%Y')}"

    thin = Side(border_style="thin", color="BBBBBB")
    border_all = Border(left=thin, right=thin, top=thin, bottom=thin)

    fill_dark = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    fill_aktif = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")   # hijau
    fill_diubah = PatternFill(start_color="FFEB9C", end_color="FFEB9C", fill_type="solid")  # kuning
    fill_batal = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")   # merah
    fill_empty = PatternFill(start_color="F3F3F3", end_color="F3F3F3", fill_type="solid")

    white_font = Font(color="FFFFFF", bold=True, size=9)
    bold_font = Font(bold=True, size=9)
    normal_font = Font(size=8)
    center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="center")

    # ---- Row 1: Judul ----
    judul_cols = 4 + total_days
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=judul_cols)
    judul_cell = ws.cell(row=1, column=1)
    unit_label = ""
    if id_unit and sorted_pegawai:
        unit_label = f" — {sorted_pegawai[0][1]['unit_nama']}"
    judul_cell.value = (
        f"LAPORAN ROSTER SHIFT PEGAWAI{unit_label}\n"
        f"Periode: {tanggal_mulai.strftime('%d %B %Y')} s/d {tanggal_selesai.strftime('%d %B %Y')}"
    )
    judul_cell.font = Font(bold=True, size=12, color="1F4E79")
    judul_cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[1].height = 40

    # ---- Row 2: Header kolom ----
    HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
    ws.cell(row=2, column=1, value="No").fill = fill_dark
    ws.cell(row=2, column=2, value="Nama Pegawai").fill = fill_dark
    ws.cell(row=2, column=3, value="Unit").fill = fill_dark
    ws.cell(row=2, column=4, value="ID Pegawai").fill = fill_dark
    for c in range(1, 5):
        cell = ws.cell(row=2, column=c)
        cell.font = white_font
        cell.alignment = center
        cell.border = border_all

    for i, d in enumerate(date_range):
        col = 5 + i
        hari = HARI[d.weekday()]
        cell = ws.cell(row=2, column=col)
        cell.value = f"{hari}\n{d.strftime('%d/%m')}"
        cell.fill = fill_dark
        cell.font = white_font
        cell.alignment = center
        cell.border = border_all

    ws.freeze_panes = "E3"

    # ---- Rows 3+: Data pegawai ----
    for row_no, (pid, pinfo) in enumerate(sorted_pegawai, start=1):
        row = row_no + 2
        ws.cell(row=row, column=1, value=row_no).font = normal_font
        ws.cell(row=row, column=1).alignment = center
        ws.cell(row=row, column=1).border = border_all
        ws.cell(row=row, column=2, value=pinfo["nama"]).font = bold_font
        ws.cell(row=row, column=2).alignment = left_align
        ws.cell(row=row, column=2).border = border_all
        ws.cell(row=row, column=3, value=pinfo["unit_nama"]).font = normal_font
        ws.cell(row=row, column=3).alignment = left_align
        ws.cell(row=row, column=3).border = border_all
        ws.cell(row=row, column=4, value=pid).font = normal_font
        ws.cell(row=row, column=4).alignment = center
        ws.cell(row=row, column=4).border = border_all

        for i, d in enumerate(date_range):
            col = 5 + i
            rosters = roster_index[pid].get(d, [])
            cell = ws.cell(row=row, column=col)
            cell.border = border_all
            cell.alignment = center
            cell.font = normal_font

            if not rosters:
                cell.fill = fill_empty
                cell.value = ""
            else:
                # Ambil roster pertama (atau aktif)
                r = next((x for x in rosters if x.status_roster == "AKTIF"), rosters[0])
                shift_nama = shift_nama_cache.get(r.shift_kelompok_id, "")

                jam_str = ""
                if r.jam_mulai and r.jam_selesai:
                    jm = r.jam_mulai.strftime("%H:%M") if hasattr(r.jam_mulai, "strftime") else str(r.jam_mulai)[11:16]
                    js = r.jam_selesai.strftime("%H:%M") if hasattr(r.jam_selesai, "strftime") else str(r.jam_selesai)[11:16]
                    jam_str = f"\n{jm}–{js}"

                cell.value = f"{shift_nama}{jam_str}"

                if r.status_roster == "AKTIF":
                    cell.fill = fill_aktif
                elif r.status_roster == "DIUBAH":
                    cell.fill = fill_diubah
                elif r.status_roster == "BATAL":
                    cell.fill = fill_batal

    # ---- Lebar kolom ----
    ws.column_dimensions["A"].width = 5
    ws.column_dimensions["B"].width = 28
    ws.column_dimensions["C"].width = 22
    ws.column_dimensions["D"].width = 16
    for i in range(total_days):
        col_letter = get_column_letter(5 + i)
        ws.column_dimensions[col_letter].width = 12

    ws.row_dimensions[2].height = 28

    # ---- Legend ----
    legend_row = len(sorted_pegawai) + 4
    legends = [
        ("Hijau", "AKTIF", fill_aktif),
        ("Kuning", "DIUBAH", fill_diubah),
        ("Merah", "BATAL", fill_batal),
        ("Abu", "Tidak Ada Roster", fill_empty),
    ]
    ws.cell(row=legend_row, column=1, value="Keterangan:").font = bold_font
    for li, (_, lbl, lfill) in enumerate(legends):
        lc = ws.cell(row=legend_row, column=2 + li)
        lc.value = lbl
        lc.fill = lfill
        lc.font = Font(size=8)
        lc.alignment = center
        lc.border = border_all

    # ---- Stream response ----
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)

    fname = f"roster_shift_{tanggal_mulai.strftime('%Y%m%d')}_{tanggal_selesai.strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={fname}"},
    )


@router.get("/{roster_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_SHIFT_READ))])
def get_roster_shift_by_id(roster_id: int, db: Session = Depends(get_db)):
    service = RosterShiftService(db)
    item = service.get_by_id(roster_id)
    return success_response(message="Roster shift retrieved successfully", data=item.model_dump(mode='json'))


@router.put("/{roster_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_SHIFT_UPDATE))])
def update_roster_shift(roster_id: int, payload: RosterShiftUpdate, db: Session = Depends(get_db)):
    service = RosterShiftService(db)
    updated = service.update(roster_id, payload)
    return success_response(message="Roster shift updated successfully", data=updated.model_dump(mode='json'))


@router.delete("/{roster_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_SHIFT_DELETE))])
def delete_roster_shift(roster_id: int, db: Session = Depends(get_db)):
    service = RosterShiftService(db)
    service.delete(roster_id)
    return success_response(message="Roster shift deleted successfully")
