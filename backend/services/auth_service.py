"""
Authentication Service
Business logic for authentication
"""
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from schemas.auth import LoginRequest, TokenResponse
from repositories.user_repository import UserRepository
from utils.auth import verify_password, create_access_token
from models.user import User


class AuthService:
    """Authentication service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
    
    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """
        Authenticate user by username and password
        
        Args:
            username: Username
            password: Plain password
        
        Returns:
            User object if authenticated, None otherwise
        """
        user = self.user_repo.get_by_username(username)
        
        if not user:
            return None
        
        if not verify_password(password, user.password_hash):
            return None
        
        if not user.is_active:
            return None
        
        return user
    
    def login(self, login_data: LoginRequest) -> TokenResponse:
        """
        Login user and return JWT token
        
        Args:
            login_data: Login credentials
        
        Returns:
            Token response with access token and user info
        
        Raises:
            HTTPException: If credentials are invalid
        """
        user = self.authenticate_user(login_data.username, login_data.password)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user with roles
        user_with_roles = self.user_repo.get_with_roles(user.id)
        
        # Extract role names
        role_names = [role.name for role in user_with_roles.roles]
        
        # Create access token
        access_token = create_access_token(
            data={
                "user_id": user.id,
                "username": user.username,
                "roles": role_names,
                "id_pegawai": user.id_pegawai
            }
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id,
            username=user.username,
            roles=role_names
        )
