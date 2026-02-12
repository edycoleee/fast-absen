"""
Permission Schemas
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class PermissionBase(BaseModel):
    """Base permission schema"""
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None


class PermissionCreate(PermissionBase):
    """Permission create schema"""
    pass


class PermissionUpdate(BaseModel):
    """Permission update schema"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None


class PermissionResponse(PermissionBase):
    """Permission response schema"""
    id: int
    
    model_config = ConfigDict(from_attributes=True)
