"""
User Service
Business logic for user management
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from schemas.user import UserCreate, UserUpdate, UserResponse, UserDetail
from repositories.user_repository import UserRepository
from repositories.role_repository import RoleRepository
from utils.auth import get_password_hash
from models.user import User


class UserService:
    """User service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[UserDetail]:
        """Get all users"""
        users = self.user_repo.get_all_with_roles(skip=skip, limit=limit)
        
        result = []
        for user in users:
            # Convert ORM model to dict, excluding roles to avoid validation error
            user_dict = {
                "id": user.id,
                "username": user.username,
                "id_pegawai": user.id_pegawai,
                "is_active": user.is_active,
                "created_at": user.created_at,
                "roles": [role.name for role in user.roles],
                "pegawai_nama": user.pegawai.nama if user.pegawai else None
            }
            result.append(UserDetail(**user_dict))
        
        return result
    
    def get_by_id(self, user_id: int) -> UserDetail:
        """Get user by ID"""
        user = self.user_repo.get_with_roles(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with id {user_id} not found"
            )
        
        # Convert ORM model to dict, excluding roles to avoid validation error
        user_dict = {
            "id": user.id,
            "username": user.username,
            "id_pegawai": user.id_pegawai,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "roles": [role.name for role in user.roles],
            "pegawai_nama": user.pegawai.nama if user.pegawai else None
        }
        
        return UserDetail(**user_dict)
    
    def create(self, user_data: UserCreate) -> UserResponse:
        """Create new user"""
        # Check if username exists
        existing_user = self.user_repo.get_by_username(user_data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # Hash password
        hashed_password = get_password_hash(user_data.password)
        
        # Create user
        user = User(
            username=user_data.username,
            password_hash=hashed_password,
            id_pegawai=user_data.id_pegawai,
            is_active=user_data.is_active
        )
        
        user = self.user_repo.create(user)
        
        # Assign roles
        if user_data.role_ids:
            roles = [self.role_repo.get_by_id(role_id) for role_id in user_data.role_ids]
            roles = [r for r in roles if r is not None]
            user = self.user_repo.set_roles(user, roles)
        
        user_dict = UserResponse.model_validate(user).model_dump()
        user_dict["roles"] = [role.name for role in user.roles]
        
        return UserResponse(**user_dict)
    
    def update(self, user_id: int, user_data: UserUpdate) -> UserResponse:
        """Update user"""
        user = self.user_repo.get_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with id {user_id} not found"
            )
        
        # Update fields
        update_data = user_data.model_dump(exclude_unset=True)
        
        # Handle password separately
        if "password" in update_data:
            update_data["password_hash"] = get_password_hash(update_data.pop("password"))
        
        # Handle roles separately
        role_ids = update_data.pop("role_ids", None)
        
        # Check username uniqueness if changed
        if "username" in update_data and update_data["username"] != user.username:
            existing = self.user_repo.get_by_username(update_data["username"])
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
        
        # Update user
        user = self.user_repo.update(user_id, update_data)
        
        # Update roles if provided
        if role_ids is not None:
            roles = [self.role_repo.get_by_id(role_id) for role_id in role_ids]
            roles = [r for r in roles if r is not None]
            user = self.user_repo.set_roles(user, roles)
        
        # Refresh to get updated roles
        user = self.user_repo.get_with_roles(user_id)
        
        user_dict = UserResponse.model_validate(user).model_dump()
        user_dict["roles"] = [role.name for role in user.roles]
        
        return UserResponse(**user_dict)
    
    def delete(self, user_id: int) -> None:
        """Delete user"""
        user = self.user_repo.get_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with id {user_id} not found"
            )
        
        self.user_repo.delete(user_id)
