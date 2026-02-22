"""
Roster Upload Batch Endpoints
CRUD tracking batch upload roster
"""
from io import BytesIO
from uuid import UUID
from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.roster_upload_batch import RosterUploadBatchCreate, RosterUploadBatchUpdate
from services.roster_upload_batch_service import RosterUploadBatchService
from utils.dependencies import require_permission
from utils.permission_registry import PermissionKeys
from utils.response import success_response


router = APIRouter(prefix="/roster-upload-batch", tags=["Roster Upload Batch"])


@router.get("/template/download", response_model=None, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_UPLOAD_BATCH_READ))])
def download_roster_template(db: Session = Depends(get_db)):
    service = RosterUploadBatchService(db)
    excel_bytes = service.build_template_excel()

    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=roster_template.xlsx"},
    )


@router.get("/", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_UPLOAD_BATCH_READ))])
def get_roster_upload_batches(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    service = RosterUploadBatchService(db)
    items = service.get_all(skip=skip, limit=limit)
    total = service.count_all()
    return success_response(
        message="Roster upload batch retrieved successfully",
        data={"items": [item.model_dump(mode='json') for item in items], "total": total, "skip": skip, "limit": limit},
    )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_UPLOAD_BATCH_CREATE))])
def create_roster_upload_batch(payload: RosterUploadBatchCreate, db: Session = Depends(get_db)):
    service = RosterUploadBatchService(db)
    created = service.create(payload)
    return success_response(message="Roster upload batch created successfully", data=created.model_dump(mode='json'))


@router.post("/import", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_UPLOAD_BATCH_CREATE))])
async def import_roster_excel(
    file: UploadFile = File(...),
    uploaded_by_pegawai: str | None = Form(None),
    db: Session = Depends(get_db),
):
    service = RosterUploadBatchService(db)
    file_content = await file.read()
    imported = service.import_from_excel(
        file_name=file.filename or "roster_upload.xlsx",
        file_content=file_content,
        uploaded_by_pegawai=uploaded_by_pegawai,
    )

    return success_response(
        message="Roster Excel imported successfully",
        data={
            "batch": imported["batch"].model_dump(mode="json"),
            "result": imported["result"],
        },
    )


@router.get("/{batch_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_UPLOAD_BATCH_READ))])
def get_roster_upload_batch_by_id(batch_id: UUID, db: Session = Depends(get_db)):
    service = RosterUploadBatchService(db)
    item = service.get_by_id(batch_id)
    return success_response(message="Roster upload batch retrieved successfully", data=item.model_dump(mode='json'))


@router.put("/{batch_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_UPLOAD_BATCH_UPDATE))])
def update_roster_upload_batch(batch_id: UUID, payload: RosterUploadBatchUpdate, db: Session = Depends(get_db)):
    service = RosterUploadBatchService(db)
    updated = service.update(batch_id, payload)
    return success_response(message="Roster upload batch updated successfully", data=updated.model_dump(mode='json'))


@router.delete("/{batch_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_UPLOAD_BATCH_DELETE))])
def delete_roster_upload_batch(batch_id: UUID, db: Session = Depends(get_db)):
    service = RosterUploadBatchService(db)
    service.delete(batch_id)
    return success_response(message="Roster upload batch deleted successfully")
