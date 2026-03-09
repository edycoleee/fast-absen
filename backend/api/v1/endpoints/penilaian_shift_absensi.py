"""
Penilaian Shift Absensi Endpoints
CRUD hasil compare roster vs absensi
"""
from datetime import date, timedelta
from io import BytesIO
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from config.database import get_db
from schemas.penilaian_shift_absensi import (
    PenilaianShiftAbsensiCreate,
    PenilaianShiftAbsensiUpdate,
    PenilaianShiftAbsensiEvaluateRequest,
)
from services.penilaian_shift_absensi_service import PenilaianShiftAbsensiService
from utils.dependencies import require_permission
from utils.permission_registry import PermissionKeys
from utils.response import success_response


router = APIRouter(prefix="/penilaian-shift-absensi", tags=["Penilaian Shift Absensi"])


@router.get("/", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PENILAIAN_SHIFT_ABSENSI_READ))])
def get_penilaian_shift_absensi(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    id_unit: Optional[int] = Query(None),
    id_pegawai: Optional[str] = Query(None),
    status_final: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    service = PenilaianShiftAbsensiService(db)
    items = service.get_all(
        skip=skip, limit=limit,
        start_date=start_date, end_date=end_date,
        id_unit=id_unit, id_pegawai=id_pegawai,
        status_final=status_final,
    )
    total = service.count_all(
        start_date=start_date, end_date=end_date,
        id_unit=id_unit, id_pegawai=id_pegawai,
        status_final=status_final,
    )
    return success_response(
        message="Penilaian shift absensi retrieved successfully",
        data={"items": [item.model_dump(mode='json') for item in items], "total": total, "skip": skip, "limit": limit},
    )


@router.get("/export/rekap", dependencies=[Depends(require_permission(PermissionKeys.PENILAIAN_SHIFT_ABSENSI_READ))])
def export_penilaian_rekap(
    start_date: date = Query(...),
    end_date: date = Query(...),
    id_unit: Optional[int] = Query(None),
    id_pegawai: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Export rekap penilaian shift ke Excel.
    Format cross-tab: satu baris per pegawai, kolom per tanggal.
    Isi setiap kolom: status_final + menit telat/pulang cepat/lembur.
    """
    from models.penilaian_shift_absensi import PenilaianShiftAbsensi
    from models.roster_shift import RosterShift
    from models.pegawai import Pegawai
    from models.unit import Unit
    from collections import defaultdict

    if (end_date - start_date).days > 61:
        raise HTTPException(status_code=400, detail="Rentang maksimal 62 hari per ekspor")

    total_days = (end_date - start_date).days + 1
    date_range = [start_date + timedelta(days=i) for i in range(total_days)]

    # --- Pegawai yang punya roster dalam rentang ---
    pegawai_q = (
        db.query(
            Pegawai.id_pegawai,
            Pegawai.nama,
            Pegawai.id_unit,
            Unit.nama_unit,
        )
        .join(Unit, Unit.id_unit == Pegawai.id_unit, isouter=True)
        .join(RosterShift, RosterShift.id_pegawai == Pegawai.id_pegawai)
        .filter(
            RosterShift.tanggal_shift >= start_date,
            RosterShift.tanggal_shift <= end_date,
            RosterShift.status_roster == 'AKTIF',
        )
        .distinct()
    )
    if id_unit is not None:
        pegawai_q = pegawai_q.filter(Pegawai.id_unit == id_unit)
    if id_pegawai:
        pegawai_q = pegawai_q.filter(Pegawai.id_pegawai == id_pegawai)

    pegawai_rows = pegawai_q.order_by(Pegawai.id_unit, Pegawai.nama).all()

    # --- Semua penilaian dalam rentang ---
    penilaian_q = (
        db.query(PenilaianShiftAbsensi)
        .join(RosterShift, RosterShift.id == PenilaianShiftAbsensi.roster_shift_id)
        .filter(
            RosterShift.tanggal_shift >= start_date,
            RosterShift.tanggal_shift <= end_date,
        )
    )
    if id_unit is not None:
        penilaian_q = penilaian_q.join(
            Pegawai, Pegawai.id_pegawai == PenilaianShiftAbsensi.id_pegawai, isouter=True
        ).filter(Pegawai.id_unit == id_unit)
    if id_pegawai:
        penilaian_q = penilaian_q.filter(PenilaianShiftAbsensi.id_pegawai == id_pegawai)

    # index: {id_pegawai: {tanggal: [PenilaianShiftAbsensi]}}
    penilaian_map: dict = defaultdict(lambda: defaultdict(list))
    for p in penilaian_q.all():
        rs = db.query(RosterShift).filter(RosterShift.id == p.roster_shift_id).first()
        if rs:
            penilaian_map[p.id_pegawai][rs.tanggal_shift].append(p)

    # --- Status label & warna ---
    STATUS_LABEL = {
        'TEPAT_WAKTU': ('✓', 'D9EAD3'),   # hijau muda
        'TERLAMBAT': ('TL', 'FFF2CC'),      # kuning
        'PULANG_CEPAT': ('PC', 'FCE4D6'),   # oranye muda
        'TIDAK_ABSEN_MASUK': ('TM', 'F4CCCC'),  # merah muda
        'TIDAK_ABSEN_PULANG': ('TP', 'FCE4D6'), # oranye
        'MANGKIR': ('M', 'F4CCCC'),         # merah muda
        'TIDAK_DIHITUNG': ('-', 'F3F3F3'),  # abu
    }

    # --- Bangun Excel ---
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"Penilaian {start_date.strftime('%d%b')}-{end_date.strftime('%d%b%Y')}"

    thin = Side(border_style="thin", color="CCCCCC")
    border_all = Border(left=thin, right=thin, top=thin, bottom=thin)
    header_fill_dark = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    white_bold = Font(color="FFFFFF", bold=True, size=9)
    normal_font = Font(size=9)
    bold_font = Font(bold=True, size=9)
    center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="center")

    # Row 1: Judul
    total_cols = 3 + total_days
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=total_cols)
    judul_cell = ws.cell(row=1, column=1)
    unit_label = ""
    if id_unit and pegawai_rows:
        unit_label = f" — {pegawai_rows[0].nama_unit}"
    elif id_pegawai and pegawai_rows:
        unit_label = f" — {pegawai_rows[0].nama}"
    judul_cell.value = (
        f"REKAP PENILAIAN SHIFT ABSENSI{unit_label}\n"
        f"Periode: {start_date.strftime('%d %B %Y')} s/d {end_date.strftime('%d %B %Y')}"
    )
    judul_cell.font = Font(bold=True, size=12, color="1F4E79")
    judul_cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[1].height = 40

    # Row 2: Header kolom
    for col, label in [(1, 'No'), (2, 'Nama Pegawai'), (3, 'Unit')]:
        c = ws.cell(row=2, column=col, value=label)
        c.fill = header_fill_dark
        c.font = white_bold
        c.alignment = center
        c.border = border_all

    for i, d in enumerate(date_range):
        col = 4 + i
        hari = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"][d.weekday()]
        c = ws.cell(row=2, column=col, value=f"{hari}\n{d.strftime('%d/%m')}")
        c.fill = header_fill_dark
        c.font = white_bold
        c.alignment = center
        c.border = border_all

    ws.row_dimensions[2].height = 30

    # Rows 3+: Data
    # Legend baris status: TL=Terlambat, PC=Pulang Cepat, M=Mangkir, dsb.
    # Isi cell: "TL\n+5m" (singkat), tooltip via comment
    row_num = 3
    for no, peg in enumerate(pegawai_rows, start=1):
        ws.cell(row=row_num, column=1, value=no).alignment = center
        ws.cell(row=row_num, column=1).border = border_all
        ws.cell(row=row_num, column=1).font = normal_font

        nc = ws.cell(row=row_num, column=2, value=peg.nama or peg.id_pegawai)
        nc.alignment = left_align
        nc.border = border_all
        nc.font = normal_font

        uc = ws.cell(row=row_num, column=3, value=peg.nama_unit or '-')
        uc.alignment = left_align
        uc.border = border_all
        uc.font = normal_font

        for i, d in enumerate(date_range):
            col = 4 + i
            items_hari = penilaian_map.get(peg.id_pegawai, {}).get(d, [])

            if not items_hari:
                val = ''
                fill_color = 'FFFFFF'
            else:
                # Ambil yang paling 'berat' (ada MANGKIR > TERLAMBAT > TEPAT_WAKTU)
                priority_order = [
                    'MANGKIR', 'TIDAK_ABSEN_MASUK', 'TIDAK_ABSEN_PULANG',
                    'TERLAMBAT', 'PULANG_CEPAT', 'TEPAT_WAKTU', 'TIDAK_DIHITUNG'
                ]
                best = sorted(
                    items_hari,
                    key=lambda x: priority_order.index(x.status_final)
                    if x.status_final in priority_order else 99
                )[0]

                label, fill_color = STATUS_LABEL.get(best.status_final, ('?', 'FFFFFF'))
                # Baris tambahan: menit telat/lembur
                detail_parts = []
                if best.menit_telat > 0:
                    detail_parts.append(f"TL:{best.menit_telat}m")
                if best.menit_lembur > 0:
                    detail_parts.append(f"L:{best.menit_lembur}m")
                detail = "\n" + " ".join(detail_parts) if detail_parts else ""

                # Jam masuk aktual singkat
                jam = ""
                if best.checkin_aktual:
                    jam = "\n" + best.checkin_aktual.astimezone().strftime("%H:%M")

                val = f"{label}{jam}{detail}"

            c = ws.cell(row=row_num, column=col, value=val)
            c.alignment = center
            c.border = border_all
            c.font = normal_font
            if fill_color != 'FFFFFF':
                c.fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")

        row_num += 1

    # Column widths
    ws.column_dimensions['A'].width = 4
    ws.column_dimensions['B'].width = 28
    ws.column_dimensions['C'].width = 20
    for i in range(total_days):
        ws.column_dimensions[get_column_letter(4 + i)].width = 8

    # Freeze panes
    ws.freeze_panes = ws.cell(row=3, column=4)

    # Legend di bawah
    legend_row = row_num + 2
    ws.cell(row=legend_row, column=1, value="Keterangan:").font = bold_font
    legends = [
        ('✓', 'D9EAD3', 'Tepat Waktu'),
        ('TL', 'FFF2CC', 'Terlambat (+TL:menit)'),
        ('PC', 'FCE4D6', 'Pulang Cepat'),
        ('M / TM / TP', 'F4CCCC', 'Mangkir / Tidak Absen Masuk/Pulang'),
        ('-', 'F3F3F3', 'Tidak Dihitung'),
        ('(kosong)', 'FFFFFF', 'Tidak ada roster untuk tanggal ini'),
    ]
    for j, (sym, color, desc) in enumerate(legends):
        r = legend_row + 1 + j
        sym_cell = ws.cell(row=r, column=1, value=sym)
        sym_cell.fill = PatternFill(start_color=color, end_color=color, fill_type="solid")
        sym_cell.font = normal_font
        ws.cell(row=r, column=2, value=desc).font = normal_font

    # Stream
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    unit_suffix = f"_unit{id_unit}" if id_unit else ""
    filename = f"rekap_penilaian_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}{unit_suffix}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(PermissionKeys.PENILAIAN_SHIFT_ABSENSI_CREATE))])
def create_penilaian_shift_absensi(payload: PenilaianShiftAbsensiCreate, db: Session = Depends(get_db)):
    service = PenilaianShiftAbsensiService(db)
    created = service.create(payload)
    return success_response(message="Penilaian shift absensi created successfully", data=created.model_dump(mode='json'))


@router.post("/evaluate", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PENILAIAN_SHIFT_ABSENSI_CREATE))])
def evaluate_penilaian_shift_absensi(payload: PenilaianShiftAbsensiEvaluateRequest, db: Session = Depends(get_db)):
    service = PenilaianShiftAbsensiService(db)
    result = service.evaluate_roster_vs_absensi(
        start_date=payload.start_date,
        end_date=payload.end_date,
        id_unit=payload.id_unit,
        id_pegawai=payload.id_pegawai,
        force_recalculate=payload.force_recalculate,
    )
    return success_response(message="Penilaian shift absensi evaluate berhasil dijalankan", data=result.model_dump(mode='json'))


@router.get("/{penilaian_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PENILAIAN_SHIFT_ABSENSI_READ))])
def get_penilaian_shift_absensi_by_id(penilaian_id: int, db: Session = Depends(get_db)):
    service = PenilaianShiftAbsensiService(db)
    item = service.get_by_id(penilaian_id)
    return success_response(message="Penilaian shift absensi retrieved successfully", data=item.model_dump(mode='json'))


@router.put("/{penilaian_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PENILAIAN_SHIFT_ABSENSI_UPDATE))])
def update_penilaian_shift_absensi(penilaian_id: int, payload: PenilaianShiftAbsensiUpdate, db: Session = Depends(get_db)):
    service = PenilaianShiftAbsensiService(db)
    updated = service.update(penilaian_id, payload)
    return success_response(message="Penilaian shift absensi updated successfully", data=updated.model_dump(mode='json'))


@router.delete("/{penilaian_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PENILAIAN_SHIFT_ABSENSI_DELETE))])
def delete_penilaian_shift_absensi(penilaian_id: int, db: Session = Depends(get_db)):
    service = PenilaianShiftAbsensiService(db)
    service.delete(penilaian_id)
    return success_response(message="Penilaian shift absensi deleted successfully")


