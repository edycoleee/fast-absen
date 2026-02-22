"""
User Endpoints - Admin Only
"""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.user import UserCreate, UserUpdate, UserResponse, UserDetail
from services.user_service import UserService
from utils.response import success_response
from utils.dependencies import require_permission, CommonQueryParams
from utils.permission_registry import PermissionKeys

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.USERS_READ))])
def get_users(
    commons: CommonQueryParams = Depends(),
    db: Session = Depends(get_db)
):
    """
    Get all users (Admin only)
    
    Supports pagination with page and limit parameters
    """
    user_service = UserService(db)
    users = user_service.get_all(skip=commons.offset, limit=commons.limit)
    total = user_service.count_all()
    
    return success_response(
        data={"items": [user.model_dump() for user in users], "total": total, "skip": commons.offset, "limit": commons.limit},
        message="Users retrieved successfully"
    )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(PermissionKeys.USERS_CREATE))])
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Create new user (Admin only)
    
    - **username**: Unique username (min 3 characters)
    - **password**: Password (min 6 characters)
    - **id_pegawai**: Pegawai ID (optional)
    - **role_ids**: List of role IDs to assign
    - **is_active**: User status (default: true)
    """
    user_service = UserService(db)
    user = user_service.create(user_data)
    
    return success_response(
        data=user.model_dump(),
        message="User created successfully"
    )


@router.get("/{user_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.USERS_READ))])
def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get user by ID (Admin only)"""
    user_service = UserService(db)
    user = user_service.get_by_id(user_id)
    
    return success_response(
        data=user.model_dump(),
        message="User retrieved successfully"
    )


@router.put("/{user_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.USERS_UPDATE))])
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db)
):
    """
    Update user (Admin only)
    
    All fields are optional. Only provided fields will be updated.
    """
    user_service = UserService(db)
    user = user_service.update(user_id, user_data)
    
    return success_response(
        data=user.model_dump(),
        message="User updated successfully"
    )


@router.delete("/{user_id}", response_model=dict, status_code=status.HTTP_200_OK, dependencies=[Depends(require_permission(PermissionKeys.USERS_DELETE))])
def delete_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Delete user (Admin only)"""
    user_service = UserService(db)
    user_service.delete(user_id)
    
    return success_response(
        data=None,
        message=f"User with id {user_id} deleted successfully"
    )
