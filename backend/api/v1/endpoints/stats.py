"""
Stats Endpoints
Dashboard summary counts
"""
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from collections import defaultdict

from config.database import get_db
from models.user import User
from models.pegawai import Pegawai
from models.role import Role
from models.absensi import Absensi
from models.unit import Unit
from models.roster_shift import RosterShift
from models.penilaian_shift_absensi import PenilaianShiftAbsensi
from models.user_role import user_roles
from utils.dependencies import get_current_user
from utils.permission_registry import PermissionKeys
from utils.response import success_response


router = APIRouter(prefix="/stats", tags=["Stats"])


def _current_permissions(current_user: User) -> set[str]:
    return {
        perm.name
        for role in current_user.roles
        for perm in role.permissions
    }


def _is_admin_user(current_user: User) -> bool:
    role_names = {role.name.lower() for role in current_user.roles if role.name}
    return "admin" in role_names or "super-admin" in role_names


def _resolve_effective_unit_scope(
    db: Session,
    current_user: User,
    requested_unit_id: int | None,
    force_my_unit_scope: bool,
) -> int | None:
    pegawai = None
    if current_user.id_pegawai:
        pegawai = (
            db.query(Pegawai)
            .filter(Pegawai.id_pegawai == current_user.id_pegawai)
            .first()
        )

    if force_my_unit_scope:
        if not pegawai or pegawai.kepala_id_unit is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Current user is not assigned as kepala unit"
            )
        return pegawai.kepala_id_unit

    if _is_admin_user(current_user):
        return requested_unit_id

    if not pegawai or pegawai.kepala_id_unit is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only kepala unit or admin can access unit-role KPI"
        )

    if requested_unit_id is not None and requested_unit_id != pegawai.kepala_id_unit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access KPI data for your own unit"
        )

    return pegawai.kepala_id_unit


def _build_unit_role_kpi_data(
    db: Session,
    current_user: User,
    start_date: date | None,
    end_date: date | None,
    requested_unit_id: int | None,
    force_my_unit_scope: bool,
) -> dict:
    effective_unit_id = _resolve_effective_unit_scope(
        db=db,
        current_user=current_user,
        requested_unit_id=requested_unit_id,
        force_my_unit_scope=force_my_unit_scope,
    )

    status_to_key = {
        "TERLAMBAT": "late",
        "PULANG_CEPAT": "early_leave",
        "MANGKIR": "mangkir",
        "TIDAK_ABSEN_PULANG": "missing_checkout",
    }

    role_rows = (
        db.query(
            Pegawai.id_pegawai.label("id_pegawai"),
            Role.name.label("role_name"),
        )
        .join(User, User.id_pegawai == Pegawai.id_pegawai, isouter=True)
        .join(user_roles, user_roles.c.user_id == User.id, isouter=True)
        .join(Role, Role.id == user_roles.c.role_id, isouter=True)
    )
    if effective_unit_id is not None:
        role_rows = role_rows.filter(Pegawai.id_unit == effective_unit_id)

    role_map: dict[str, list[str]] = defaultdict(list)
    for row in role_rows.all():
        if row.id_pegawai and row.role_name and row.role_name not in role_map[row.id_pegawai]:
            role_map[row.id_pegawai].append(row.role_name)

    pegawai_query = (
        db.query(
            Pegawai.id_pegawai.label("id_pegawai"),
            Pegawai.nama.label("nama_pegawai"),
            Pegawai.id_unit.label("id_unit"),
            Unit.nama_unit.label("nama_unit"),
        )
        .join(Unit, Unit.id_unit == Pegawai.id_unit, isouter=True)
    )
    if effective_unit_id is not None:
        pegawai_query = pegawai_query.filter(Pegawai.id_unit == effective_unit_id)

    pegawai_rows = pegawai_query.all()
    pegawai_by_id = {
        row.id_pegawai: {
            "id_pegawai": row.id_pegawai,
            "nama_pegawai": row.nama_pegawai,
            "id_unit": row.id_unit,
            "nama_unit": row.nama_unit,
            "roles": role_map.get(row.id_pegawai, []),
        }
        for row in pegawai_rows
        if row.id_pegawai
    }

    roster_pegawai_query = (
        db.query(RosterShift.id_pegawai)
        .join(Pegawai, Pegawai.id_pegawai == RosterShift.id_pegawai)
    )
    if start_date:
        roster_pegawai_query = roster_pegawai_query.filter(RosterShift.tanggal_shift >= start_date)
    if end_date:
        roster_pegawai_query = roster_pegawai_query.filter(RosterShift.tanggal_shift <= end_date)
    if effective_unit_id is not None:
        roster_pegawai_query = roster_pegawai_query.filter(Pegawai.id_unit == effective_unit_id)

    scheduled_employee_ids = {
        row[0]
        for row in roster_pegawai_query.distinct().all()
        if row[0]
    }

    latest_penilaian_rows = (
        db.query(
            PenilaianShiftAbsensi.id_pegawai.label("id_pegawai"),
            PenilaianShiftAbsensi.status_final.label("status_final"),
            PenilaianShiftAbsensi.is_manual_override.label("is_manual_override"),
            PenilaianShiftAbsensi.override_reason.label("override_reason"),
            PenilaianShiftAbsensi.approved_by_pegawai.label("approved_by_pegawai"),
            PenilaianShiftAbsensi.approved_at.label("approved_at"),
            PenilaianShiftAbsensi.evaluated_at.label("evaluated_at"),
            RosterShift.tanggal_shift.label("tanggal_shift"),
            RosterShift.id.label("roster_id"),
        )
        .join(RosterShift, RosterShift.id == PenilaianShiftAbsensi.roster_shift_id)
        .join(Pegawai, Pegawai.id_pegawai == PenilaianShiftAbsensi.id_pegawai)
    )
    if start_date:
        latest_penilaian_rows = latest_penilaian_rows.filter(RosterShift.tanggal_shift >= start_date)
    if end_date:
        latest_penilaian_rows = latest_penilaian_rows.filter(RosterShift.tanggal_shift <= end_date)
    if effective_unit_id is not None:
        latest_penilaian_rows = latest_penilaian_rows.filter(Pegawai.id_unit == effective_unit_id)

    latest_penilaian_rows = latest_penilaian_rows.order_by(
        PenilaianShiftAbsensi.id_pegawai.asc(),
        RosterShift.tanggal_shift.desc(),
        RosterShift.id.desc(),
    ).all()

    latest_eval_by_pegawai: dict[str, dict] = {}
    approver_ids = set()
    for row in latest_penilaian_rows:
        if row.id_pegawai in latest_eval_by_pegawai:
            continue
        latest_eval_by_pegawai[row.id_pegawai] = {
            "status_final": row.status_final,
            "is_manual_override": bool(row.is_manual_override),
            "override_reason": row.override_reason,
            "approved_by_pegawai": row.approved_by_pegawai,
            "approved_at": row.approved_at,
            "evaluated_at": row.evaluated_at,
        }
        if row.approved_by_pegawai:
            approver_ids.add(row.approved_by_pegawai)

    approver_name_map = {}
    if approver_ids:
        approver_rows = (
            db.query(Pegawai.id_pegawai, Pegawai.nama)
            .filter(Pegawai.id_pegawai.in_(approver_ids))
            .all()
        )
        approver_name_map = {
            row[0]: row[1]
            for row in approver_rows
            if row[0]
        }

    def build_detail_entry(pegawai_id: str, pegawai_data: dict | None, eval_meta: dict | None) -> dict:
        base = {
            "id_pegawai": pegawai_id,
            "nama_pegawai": (pegawai_data or {}).get("nama_pegawai"),
            "id_unit": (pegawai_data or {}).get("id_unit"),
            "nama_unit": (pegawai_data or {}).get("nama_unit"),
            "roles": (pegawai_data or {}).get("roles", []),
            "latest_status": (eval_meta or {}).get("status_final"),
            "last_evaluated_at": (
                (eval_meta or {}).get("evaluated_at").isoformat()
                if (eval_meta or {}).get("evaluated_at")
                else None
            ),
            "is_manual_override": bool((eval_meta or {}).get("is_manual_override", False)),
            "override_reason": (eval_meta or {}).get("override_reason"),
            "approved_by_pegawai": (eval_meta or {}).get("approved_by_pegawai"),
            "approved_by_nama": approver_name_map.get((eval_meta or {}).get("approved_by_pegawai")),
            "approved_at": (
                (eval_meta or {}).get("approved_at").isoformat()
                if (eval_meta or {}).get("approved_at")
                else None
            ),
        }
        return base

    detail_karyawan = {
        "late": [],
        "early_leave": [],
        "mangkir": [],
        "missing_checkout": [],
        "tidak_terjadwal": [],
        "scheduled_unassessed": [],
    }

    for pegawai_id, pegawai_data in pegawai_by_id.items():
        eval_meta = latest_eval_by_pegawai.get(pegawai_id)
        if pegawai_id not in scheduled_employee_ids:
            detail_karyawan["tidak_terjadwal"].append(build_detail_entry(pegawai_id, pegawai_data, eval_meta))
            continue

        status_final = (eval_meta or {}).get("status_final")
        target_key = status_to_key.get(status_final)
        if target_key:
            detail_karyawan[target_key].append(build_detail_entry(pegawai_id, pegawai_data, eval_meta))
        else:
            detail_karyawan["scheduled_unassessed"].append(build_detail_entry(pegawai_id, pegawai_data, eval_meta))

    scheduled_but_untracked = scheduled_employee_ids - set(pegawai_by_id.keys())
    for pegawai_id in scheduled_but_untracked:
        eval_meta = latest_eval_by_pegawai.get(pegawai_id)
        status_final = (eval_meta or {}).get("status_final")
        target_key = status_to_key.get(status_final)
        if target_key:
            detail_karyawan[target_key].append(build_detail_entry(pegawai_id, None, eval_meta))
        else:
            detail_karyawan["scheduled_unassessed"].append(build_detail_entry(pegawai_id, None, eval_meta))

    by_unit_employee_map: dict[tuple[int | None, str | None], dict] = {}
    for pegawai_data in pegawai_by_id.values():
        key = (pegawai_data["id_unit"], pegawai_data["nama_unit"])
        if key not in by_unit_employee_map:
            by_unit_employee_map[key] = {
                "id_unit": pegawai_data["id_unit"],
                "nama_unit": pegawai_data["nama_unit"],
                "total_karyawan_unit": 0,
                "terjadwal_total": 0,
                "tidak_terjadwal_total": 0,
                "late": 0,
                "early_leave": 0,
                "mangkir": 0,
                "missing_checkout": 0,
                "scheduled_unassessed_total": 0,
            }

        unit_bucket = by_unit_employee_map[key]
        unit_bucket["total_karyawan_unit"] += 1

        if pegawai_data["id_pegawai"] not in scheduled_employee_ids:
            unit_bucket["tidak_terjadwal_total"] += 1
            continue

        unit_bucket["terjadwal_total"] += 1
        status_key = status_to_key.get((latest_eval_by_pegawai.get(pegawai_data["id_pegawai"]) or {}).get("status_final"))
        if status_key:
            unit_bucket[status_key] += 1
        else:
            unit_bucket["scheduled_unassessed_total"] += 1

    by_unit_employee = sorted(
        by_unit_employee_map.values(),
        key=lambda item: ((item["id_unit"] if item["id_unit"] is not None else 10**12), item["nama_unit"] or "")
    )

    total_karyawan_unit = len(pegawai_by_id)
    terjadwal_total = len(scheduled_employee_ids)
    tidak_terjadwal_total = len(detail_karyawan["tidak_terjadwal"])
    late_total = len(detail_karyawan["late"])
    early_leave_total = len(detail_karyawan["early_leave"])
    mangkir_total = len(detail_karyawan["mangkir"])
    missing_checkout_total = len(detail_karyawan["missing_checkout"])
    scheduled_unassessed_total = len(detail_karyawan["scheduled_unassessed"])
    pelanggaran_total = late_total + early_leave_total + mangkir_total + missing_checkout_total
    non_pelanggaran_terjadwal_total = max(terjadwal_total - pelanggaran_total - scheduled_unassessed_total, 0)

    late_expr = case((PenilaianShiftAbsensi.status_final == "TERLAMBAT", 1), else_=0)
    early_leave_expr = case((PenilaianShiftAbsensi.status_final == "PULANG_CEPAT", 1), else_=0)
    mangkir_expr = case((PenilaianShiftAbsensi.status_final == "MANGKIR", 1), else_=0)
    missing_checkout_expr = case((PenilaianShiftAbsensi.status_final == "TIDAK_ABSEN_PULANG", 1), else_=0)

    base_query = (
        db.query(PenilaianShiftAbsensi)
        .join(RosterShift, RosterShift.id == PenilaianShiftAbsensi.roster_shift_id)
        .join(Pegawai, Pegawai.id_pegawai == PenilaianShiftAbsensi.id_pegawai)
    )

    if start_date:
        base_query = base_query.filter(RosterShift.tanggal_shift >= start_date)
    if end_date:
        base_query = base_query.filter(RosterShift.tanggal_shift <= end_date)
    if effective_unit_id is not None:
        base_query = base_query.filter(Pegawai.id_unit == effective_unit_id)

    totals = base_query.with_entities(
        func.count(PenilaianShiftAbsensi.id),
        func.sum(late_expr),
        func.sum(early_leave_expr),
        func.sum(mangkir_expr),
        func.sum(missing_checkout_expr),
    ).first()

    by_unit_rows = (
        base_query
        .join(Unit, Unit.id_unit == Pegawai.id_unit, isouter=True)
        .with_entities(
            Pegawai.id_unit.label("id_unit"),
            Unit.nama_unit.label("nama_unit"),
            func.count(PenilaianShiftAbsensi.id).label("total"),
            func.sum(late_expr).label("late"),
            func.sum(early_leave_expr).label("early_leave"),
            func.sum(mangkir_expr).label("mangkir"),
            func.sum(missing_checkout_expr).label("missing_checkout"),
        )
        .group_by(Pegawai.id_unit, Unit.nama_unit)
        .all()
    )

    by_role_rows = (
        base_query
        .join(User, User.id_pegawai == Pegawai.id_pegawai, isouter=True)
        .join(user_roles, user_roles.c.user_id == User.id, isouter=True)
        .join(Role, Role.id == user_roles.c.role_id, isouter=True)
        .with_entities(
            Role.id.label("role_id"),
            Role.name.label("role_name"),
            func.count(PenilaianShiftAbsensi.id).label("total"),
            func.sum(late_expr).label("late"),
            func.sum(early_leave_expr).label("early_leave"),
            func.sum(mangkir_expr).label("mangkir"),
            func.sum(missing_checkout_expr).label("missing_checkout"),
        )
        .group_by(Role.id, Role.name)
        .all()
    )

    by_unit = [
        {
            "id_unit": row.id_unit,
            "nama_unit": row.nama_unit,
            "total": int(row.total or 0),
            "late": int(row.late or 0),
            "early_leave": int(row.early_leave or 0),
            "mangkir": int(row.mangkir or 0),
            "missing_checkout": int(row.missing_checkout or 0),
        }
        for row in by_unit_rows
    ]

    by_role = [
        {
            "role_id": row.role_id,
            "role_name": row.role_name,
            "total": int(row.total or 0),
            "late": int(row.late or 0),
            "early_leave": int(row.early_leave or 0),
            "mangkir": int(row.mangkir or 0),
            "missing_checkout": int(row.missing_checkout or 0),
        }
        for row in by_role_rows
    ]

    manual_override_entries = [
        item
        for group in detail_karyawan.values()
        for item in group
        if item.get("is_manual_override")
    ]
    approved_entries = [
        item
        for group in detail_karyawan.values()
        for item in group
        if item.get("approved_at")
    ]

    as_of = datetime.now(timezone.utc)
    last_evaluated_at_dt = base_query.with_entities(func.max(PenilaianShiftAbsensi.evaluated_at)).scalar()
    if last_evaluated_at_dt and last_evaluated_at_dt.tzinfo is None:
        last_evaluated_at_dt = last_evaluated_at_dt.replace(tzinfo=timezone.utc)
    data_freshness_minutes = (
        int(max((as_of - last_evaluated_at_dt).total_seconds(), 0) // 60)
        if last_evaluated_at_dt
        else None
    )

    return {
        "summary": {
            "total_karyawan_unit": total_karyawan_unit,
            "terjadwal_total": terjadwal_total,
            "tidak_terjadwal_total": tidak_terjadwal_total,
            "late": late_total,
            "early_leave": early_leave_total,
            "mangkir": mangkir_total,
            "missing_checkout": missing_checkout_total,
            "scheduled_unassessed_total": scheduled_unassessed_total,
            "pelanggaran_total": pelanggaran_total,
            "non_pelanggaran_terjadwal_total": non_pelanggaran_terjadwal_total,
            "formula_check": {
                "terjadwal_equals_status_plus_unassessed": (
                    terjadwal_total
                    == (late_total + early_leave_total + mangkir_total + missing_checkout_total + scheduled_unassessed_total + non_pelanggaran_terjadwal_total)
                )
            },
        },
        "shift_summary": {
            "total": int((totals[0] if totals else 0) or 0),
            "late": int((totals[1] if totals else 0) or 0),
            "early_leave": int((totals[2] if totals else 0) or 0),
            "mangkir": int((totals[3] if totals else 0) or 0),
            "missing_checkout": int((totals[4] if totals else 0) or 0),
        },
        "filters": {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "id_unit": effective_unit_id,
        },
        "watermark": {
            "as_of": as_of.isoformat(),
            "last_evaluated_at": last_evaluated_at_dt.isoformat() if last_evaluated_at_dt else None,
            "data_freshness_minutes": data_freshness_minutes,
        },
        "audit": {
            "manual_override_total": len(manual_override_entries),
            "approved_total": len(approved_entries),
            "manual_override_details": manual_override_entries,
            "approved_details": approved_entries,
        },
        "detail_karyawan": detail_karyawan,
        "by_unit_employee": by_unit_employee,
        "by_unit": by_unit,
        "by_role": by_role,
    }


@router.get("/", response_model=dict)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    permissions = _current_permissions(current_user)

    allowed = {
        PermissionKeys.USERS_READ,
        PermissionKeys.PEGAWAI_READ,
        PermissionKeys.ROLES_READ,
        PermissionKeys.ABSENSI_READ
    }

    if not permissions.intersection(allowed):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for stats"
        )

    today = date.today()

    users_total = None
    if PermissionKeys.USERS_READ in permissions:
        users_total = db.query(func.count(User.id)).scalar() or 0

    pegawai_total = None
    if PermissionKeys.PEGAWAI_READ in permissions:
        pegawai_total = db.query(func.count(Pegawai.id_pegawai)).scalar() or 0

    roles_total = None
    if PermissionKeys.ROLES_READ in permissions:
        roles_total = db.query(func.count(Role.id)).scalar() or 0

    absensi_today = None
    if PermissionKeys.ABSENSI_READ in permissions:
        absensi_today = (
            db.query(func.count(Absensi.id))
            .filter(func.date(Absensi.tanggal) == today)
            .scalar()
            or 0
        )

    return success_response(
        message="Stats retrieved successfully",
        data={
            "users_total": users_total,
            "pegawai_total": pegawai_total,
            "roles_total": roles_total,
            "absensi_today": absensi_today,
            "as_of": today.isoformat()
        }
    )


@router.get("/kpi/unit-role", response_model=dict)
def get_unit_role_kpi(
    start_date: date | None = None,
    end_date: date | None = None,
    id_unit: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    permissions = _current_permissions(current_user)
    if PermissionKeys.PENILAIAN_SHIFT_ABSENSI_READ not in permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for unit-role KPI"
        )

    data = _build_unit_role_kpi_data(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
        requested_unit_id=id_unit,
        force_my_unit_scope=False,
    )

    return success_response(
        message="KPI unit-role retrieved successfully",
        data=data,
    )


@router.get("/kpi/unit-role/my-unit", response_model=dict)
def get_my_unit_role_kpi(
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    permissions = _current_permissions(current_user)
    if PermissionKeys.PENILAIAN_SHIFT_ABSENSI_READ not in permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for unit-role KPI"
        )

    data = _build_unit_role_kpi_data(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
        requested_unit_id=None,
        force_my_unit_scope=True,
    )

    return success_response(
        message="KPI my-unit retrieved successfully",
        data=data,
    )
