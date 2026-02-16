"""
Auth Schemas
JWT Auth with Access Token (localStorage) & Refresh Token (HTTP-only cookie)
"""
from typing import Optional
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
    refresh_token: Optional[str] = None  # Only used internally, not sent in response


class TokenData(BaseModel):
    """Token payload data (from JWT)"""
    sub: str  # user_id as string
    username: str
    roles: list[str]


class RefreshTokenRequest(BaseModel):
    """Refresh token request (cookie will be used)"""
    pass
