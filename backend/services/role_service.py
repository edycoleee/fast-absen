"""
Role Service
Business logic for role management
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from schemas.role import RoleCreate, RoleUpdate, RoleResponse
from repositories.role_repository import RoleRepository
from repositories.permission_repository import PermissionRepository
from models.role import Role


class RoleService:
    """Role service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.role_repo = RoleRepository(db)
        self.permission_repo = PermissionRepository(db)
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[RoleResponse]:
        """Get all roles"""
        roles = self.role_repo.get_all_with_permissions(skip=skip, limit=limit)
        
        result = []
        for role in roles:
            role_dict = RoleResponse.model_validate(role).model_dump()
            role_dict["permissions"] = [perm.name for perm in role.permissions]
            result.append(RoleResponse(**role_dict))
        
        return result
    
    def get_by_id(self, role_id: int) -> RoleResponse:
        """Get role by ID"""
        role = self.role_repo.get_with_permissions(role_id)
        
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role with id {role_id} not found"
            )
        
        role_dict = RoleResponse.model_validate(role).model_dump()
        role_dict["permissions"] = [perm.name for perm in role.permissions]
        
        return RoleResponse(**role_dict)
    
    def create(self, role_data: RoleCreate) -> RoleResponse:
        """Create new role"""
        # Check if role already exists
        existing = self.role_repo.get_by_name(role_data.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role with name '{role_data.name}' already exists"
            )
        
        # Get permissions if provided
        permissions = []
        if role_data.permission_ids:
            for perm_id in role_data.permission_ids:
                permission = self.permission_repo.get(perm_id)
                if not permission:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Permission with id {perm_id} not found"
                    )
                permissions.append(permission)
        
        # Create role
        role = Role(
            name=role_data.name,
            description=role_data.description
        )
        
        # Add permissions
        role.permissions = permissions
        
        # Save to database
        created_role = self.role_repo.create(role)
        
        # Return response
        role_dict = RoleResponse.model_validate(created_role).model_dump()
        role_dict["permissions"] = [perm.name for perm in created_role.permissions]
        
        return RoleResponse(**role_dict)
    
    def update(self, role_id: int, role_data: RoleUpdate) -> RoleResponse:
        """Update role"""
        # Get existing role
        role = self.role_repo.get_with_permissions(role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role with id {role_id} not found"
            )
        
        # Update fields
        update_data = role_data.model_dump(exclude_unset=True)
        
        # Check if name is being updated and already exists
        if "name" in update_data and update_data["name"] != role.name:
            existing = self.role_repo.get_by_name(update_data["name"])
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Role with name '{update_data['name']}' already exists"
                )
        
        # Update permissions if provided
        if "permission_ids" in update_data:
            permissions = []
            for perm_id in update_data["permission_ids"]:
                permission = self.permission_repo.get(perm_id)
                if not permission:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Permission with id {perm_id} not found"
                    )
                permissions.append(permission)
            
            role.permissions = permissions
            del update_data["permission_ids"]
        
        # Update other fields
        for field, value in update_data.items():
            setattr(role, field, value)
        
        # Save to database
        updated_role = self.role_repo.update(role)
        
        # Return response
        role_dict = RoleResponse.model_validate(updated_role).model_dump()
        role_dict["permissions"] = [perm.name for perm in updated_role.permissions]
        
        return RoleResponse(**role_dict)
    
    def delete(self, role_id: int) -> None:
        """Delete role"""
        role = self.role_repo.get(role_id)
        
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role with id {role_id} not found"
            )
        
        # Check if role is system role (admin or user)
        if role.name in ["admin", "user"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete system role '{role.name}'"
            )
        
        self.role_repo.delete(role_id)
