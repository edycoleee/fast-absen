"""
User Schemas
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user schema"""
    username: str = Field(..., min_length=3, max_length=100)
    id_pegawai: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    """User create schema"""
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")
    role_ids: list[int] = Field(default_factory=list, description="List of role IDs")


class UserUpdate(BaseModel):
    """User update schema"""
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    password: Optional[str] = Field(None, min_length=6)
    id_pegawai: Optional[str] = None
    is_active: Optional[bool] = None
    role_ids: Optional[list[int]] = None


class UserResponse(UserBase):
    """User response schema"""
    id: int
    created_at: datetime
    roles: list[str] = []
    
    model_config = ConfigDict(from_attributes=True)


class UserDetail(UserResponse):
    """User detail response with relations"""
    pegawai_nama: Optional[str] = None
