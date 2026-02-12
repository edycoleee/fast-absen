"""
Permission Endpoints
Admin-only CRUD operations for permissions
"""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.permission import PermissionCreate, PermissionUpdate, PermissionResponse
from services.permission_service import PermissionService
from utils.response import success_response
from utils.dependencies import require_admin


router = APIRouter(prefix="/permissions", tags=["Permissions"])


@router.get("/", response_model=dict, dependencies=[Depends(require_admin)])
async def get_permissions(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get all permissions (Admin only)
    
    - **page**: Page number (default: 1)
    - **limit**: Items per page (default: 10)
    """
    service = PermissionService(db)
    
    skip = (page - 1) * limit
    permissions = service.get_all(skip=skip, limit=limit)
    
    return success_response(
        message="Permissions retrieved successfully",
        data={
            "permissions": [perm.model_dump() for perm in permissions],
            "page": page,
            "limit": limit
        }
    )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
async def create_permission(
    permission_data: PermissionCreate,
    db: Session = Depends(get_db)
):
    """
    Create new permission (Admin only)
    
    - **name**: Permission name (required)
    - **description**: Permission description (optional)
    """
    service = PermissionService(db)
    permission = service.create(permission_data)
    
    return success_response(
        message="Permission created successfully",
        data=permission.model_dump()
    )


@router.get("/{permission_id}", response_model=dict, dependencies=[Depends(require_admin)])
async def get_permission(
    permission_id: int,
    db: Session = Depends(get_db)
):
    """
    Get permission by ID (Admin only)
    
    - **permission_id**: Permission ID
    """
    service = PermissionService(db)
    permission = service.get_by_id(permission_id)
    
    return success_response(
        message="Permission retrieved successfully",
        data=permission.model_dump()
    )


@router.put("/{permission_id}", response_model=dict, dependencies=[Depends(require_admin)])
async def update_permission(
    permission_id: int,
    permission_data: PermissionUpdate,
    db: Session = Depends(get_db)
):
    """
    Update permission (Admin only)
    
    - **permission_id**: Permission ID
    - **name**: New permission name (optional)
    - **description**: New permission description (optional)
    """
    service = PermissionService(db)
    permission = service.update(permission_id, permission_data)
    
    return success_response(
        message="Permission updated successfully",
        data=permission.model_dump()
    )


@router.delete("/{permission_id}", response_model=dict, dependencies=[Depends(require_admin)])
async def delete_permission(
    permission_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete permission (Admin only)
    
    - **permission_id**: Permission ID
    
    Note: Cannot delete system permissions (user.login, absensi.*)
    """
    service = PermissionService(db)
    service.delete(permission_id)
    
    return success_response(
        message=f"Permission with id {permission_id} deleted successfully",
        data=None
    )
