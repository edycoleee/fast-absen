"""
Dependencies untuk FastAPI
Common dependencies seperti authentication, authorization, pagination, dll
"""
from typing import Optional
from fastapi import Header, HTTPException, status, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from config.database import get_db
from utils.auth import decode_access_token
from models.user import User
from models.role import Role

# Security scheme
security = HTTPBearer()


async def get_request_id(
    x_request_id: Optional[str] = Header(None)
) -> Optional[str]:
    """
    Get request ID from header
    
    Args:
        x_request_id: Request ID from header
    
    Returns:
        Request ID or None
    """
    return x_request_id


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token
    
    Args:
        credentials: HTTP Bearer token credentials
        db: Database session
    
    Returns:
        Current user object
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: int = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user
    
    Args:
        current_user: Current user from token
    
    Returns:
        Active user object
    """
    return current_user


class RoleChecker:
    """
    Dependency untuk check user role
    """
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles
    
    def __call__(self, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        """
        Check if user has required role
        
        Args:
            current_user: Current authenticated user
            db: Database session
        
        Returns:
            User object if authorized
        
        Raises:
            HTTPException: If user doesn't have required role
        """
        # Get user roles
        user_roles = [role.name for role in current_user.roles]
        
        # Check if user has any of the allowed roles
        if not any(role in user_roles for role in self.allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(self.allowed_roles)}"
            )
        
        return current_user


# Pre-defined role checkers
require_admin = RoleChecker(["admin"])
require_user = RoleChecker(["user", "admin"])


class CommonQueryParams:
    """
    Common query parameters untuk pagination dan search
    """
    def __init__(
        self,
        page: int = Query(1, ge=1, description="Page number"),
        limit: int = Query(10, ge=1, le=100, description="Items per page"),
        search: Optional[str] = Query(None, description="Search query"),
        sort_by: Optional[str] = Query(None, description="Sort by field"),
        sort_order: str = Query("asc", regex="^(asc|desc)$", description="Sort order")
    ):
        self.page = page
        self.limit = limit
        self.search = search
        self.sort_by = sort_by
        self.sort_order = sort_order
    
    @property
    def offset(self) -> int:
        """Calculate offset from page and limit"""
        return (self.page - 1) * self.limit
async def get_current_user():
    """
    Get current authenticated user
    Placeholder - implement actual authentication logic
    
    Returns:
        Current user object
    
    Raises:
        HTTPException: If user is not authenticated
    """
    # TODO: Implement actual authentication
    # For now, this is just a placeholder
    pass


async def require_admin(current_user = Depends(get_current_user)):
    """
    Require admin role
    
    Args:
        current_user: Current authenticated user
    
    Raises:
        HTTPException: If user is not admin
    """
    # TODO: Implement actual role check
    # if not current_user or current_user.role != "admin":
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Insufficient permissions"
    #     )
    pass


async def check_permission(permission: str):
    """
    Check if user has specific permission
    
    Args:
        permission: Permission name
    
    Returns:
        Dependency function
    """
    async def permission_checker(current_user = Depends(get_current_user)):
        # TODO: Implement permission check
        # if not has_permission(current_user, permission):
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail=f"Permission '{permission}' required"
        #     )
        pass
    
    return permission_checker
