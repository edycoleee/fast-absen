"""
Role Endpoints
Admin-only CRUD operations for roles
"""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.role import RoleCreate, RoleUpdate, RoleResponse
from services.role_service import RoleService
from utils.response import success_response
from utils.dependencies import require_super_admin


router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get("/", response_model=dict, dependencies=[Depends(require_super_admin)])
async def get_roles(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get all roles (Admin only)
    
    - **page**: Page number (default: 1)
    - **limit**: Items per page (default: 10)
    """
    service = RoleService(db)
    
    skip = (page - 1) * limit
    roles = service.get_all(skip=skip, limit=limit)
    
    return success_response(
        message="Roles retrieved successfully",
        data={
            "items": [role.model_dump() for role in roles],
            "page": page,
            "limit": limit
        }
    )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_super_admin)])
async def create_role(
    role_data: RoleCreate,
    db: Session = Depends(get_db)
):
    """
    Create new role (Admin only)
    
    - **name**: Role name (required)
    - **description**: Role description (optional)
    - **permission_ids**: List of permission IDs (optional)
    """
    service = RoleService(db)
    role = service.create(role_data)
    
    return success_response(
        message="Role created successfully",
        data=role.model_dump()
    )


@router.get("/{role_id}", response_model=dict, dependencies=[Depends(require_super_admin)])
async def get_role(
    role_id: int,
    db: Session = Depends(get_db)
):
    """
    Get role by ID (Admin only)
    
    - **role_id**: Role ID
    """
    service = RoleService(db)
    role = service.get_by_id(role_id)
    
    return success_response(
        message="Role retrieved successfully",
        data=role.model_dump()
    )


@router.put("/{role_id}", response_model=dict, dependencies=[Depends(require_super_admin)])
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    db: Session = Depends(get_db)
):
    """
    Update role (Admin only)
    
    - **role_id**: Role ID
    - **name**: New role name (optional)
    - **description**: New role description (optional)
    - **permission_ids**: New list of permission IDs (optional)
    """
    service = RoleService(db)
    role = service.update(role_id, role_data)
    
    return success_response(
        message="Role updated successfully",
        data=role.model_dump()
    )


@router.delete("/{role_id}", response_model=dict, dependencies=[Depends(require_super_admin)])
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete role (Admin only)
    
    - **role_id**: Role ID
    
    Note: Cannot delete system roles (admin, user)
    """
    service = RoleService(db)
    service.delete(role_id)
    
    return success_response(
        message=f"Role with id {role_id} deleted successfully",
        data=None
    )
