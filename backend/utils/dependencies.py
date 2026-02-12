"""
Dependencies untuk FastAPI
Common dependencies seperti authentication, authorization, pagination, dll
"""
from typing import Optional
from fastapi import Header, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session
from config.database import get_db


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


# Example: Authentication dependency (to be implemented)
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
