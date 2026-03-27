"""
Role Schemas
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class RoleBase(BaseModel):
    """Base role schema"""
    name: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None
    is_admin: bool = False


class RoleCreate(RoleBase):
    """Role create schema"""
    permission_ids: list[int] = Field(default_factory=list, description="List of permission IDs")


class RoleUpdate(BaseModel):
    """Role update schema"""
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = None
    is_admin: Optional[bool] = None
    permission_ids: Optional[list[int]] = None


class RoleResponse(RoleBase):
    """Role response schema"""
    id: int
    permissions: list[str] = []
    
    model_config = ConfigDict(from_attributes=True)
