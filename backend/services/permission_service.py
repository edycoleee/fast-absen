"""
Permission Service
Business logic for permission management
"""
from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from schemas.permission import PermissionCreate, PermissionUpdate, PermissionResponse
from repositories.permission_repository import PermissionRepository
from models.permission import Permission


class PermissionService:
    """Permission service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.permission_repo = PermissionRepository(db)
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[PermissionResponse]:
        """Get all permissions"""
        permissions = self.permission_repo.get_all(skip=skip, limit=limit)
        return [PermissionResponse.model_validate(perm) for perm in permissions]
    
    def get_by_id(self, permission_id: int) -> PermissionResponse:
        """Get permission by ID"""
        permission = self.permission_repo.get(permission_id)
        
        if not permission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Permission with id {permission_id} not found"
            )
        
        return PermissionResponse.model_validate(permission)
    
    def create(self, permission_data: PermissionCreate) -> PermissionResponse:
        """Create new permission"""
        # Check if permission already exists
        existing = self.permission_repo.get_by_name(permission_data.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Permission with name '{permission_data.name}' already exists"
            )
        
        created_permission = self.permission_repo.create({
            "name": permission_data.name,
            "description": permission_data.description
        })
        
        return PermissionResponse.model_validate(created_permission)
    
    def update(self, permission_id: int, permission_data: PermissionUpdate) -> PermissionResponse:
        """Update permission"""
        # Get existing permission
        permission = self.permission_repo.get(permission_id)
        if not permission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Permission with id {permission_id} not found"
            )
        
        # Update fields
        update_data = permission_data.model_dump(exclude_unset=True)
        
        # Check if name is being updated and already exists
        if "name" in update_data and update_data["name"] != permission.name:
            existing = self.permission_repo.get_by_name(update_data["name"])
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Permission with name '{update_data['name']}' already exists"
                )
        
        # Update fields
        for field, value in update_data.items():
            setattr(permission, field, value)
        
        # Save to database
        updated_permission = self.permission_repo.update(permission_id, update_data)
        if updated_permission is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Permission with id {permission_id} not found"
            )
        
        return PermissionResponse.model_validate(updated_permission)
    
    def delete(self, permission_id: int) -> None:
        """Delete permission"""
        permission = self.permission_repo.get(permission_id)
        
        if not permission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Permission with id {permission_id} not found"
            )
        
        # Check if permission is system permission
        system_permissions = ["user.login", "absensi.create", "absensi.read", "absensi.update", "absensi.delete"]
        if permission.name in system_permissions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete system permission '{permission.name}'"
            )
        
        self.permission_repo.delete(permission_id)
