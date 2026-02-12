"""
Auth Schemas
"""
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Login request schema"""
    username: str = Field(..., min_length=3, max_length=100, description="Username")
    password: str = Field(..., min_length=6, description="Password")


class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    roles: list[str]


class TokenData(BaseModel):
    """Token payload data"""
    user_id: int
    username: str
    roles: list[str]
