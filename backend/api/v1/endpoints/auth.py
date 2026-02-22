"""
Auth Endpoints
Login with JWT Access Token (localStorage) & Refresh Token (HTTP-only cookie) + Session Tracking
"""
from fastapi import APIRouter, Depends, status, Response, Cookie, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional
from config.database import get_db
from config.settings import settings
from schemas.auth import LoginRequest, TokenResponse
from services.auth_service import AuthService
from utils.response import success_response
from utils.auth import decode_refresh_token, create_access_token
from utils.dependencies import get_current_user
from repositories.user_repository import UserRepository
from models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=dict, status_code=status.HTTP_200_OK)
def login(
    login_data: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Login endpoint - authenticate user and return JWT tokens with session tracking
    
    - **username**: Username (min 3 characters)
    - **password**: Password (min 6 characters)
    
    Returns:
        - **Access Token** (3 hours): Disimpan di localStorage (React)
        - **Refresh Token** (14 days): Disimpan di HTTP-only Secure Cookie (aman dari XSS)
        - **Session ID**: Tracked in database for security monitoring
    
    Access Token Payload:
        - sub: user_id
        - username: username
        - roles: ["user", "admin"]
        - session_id: UUID for session tracking
        - iat: issued at timestamp
        - exp: expiration timestamp
        - iss: "auth-server"
        - aud: "internal-apps"
    
    Refresh Token Payload:
        - sub: user_id
        - type: "refresh"
        - iat: issued at timestamp
        - exp: expiration timestamp
    
    Session Tracking:
        - Device type, browser, OS detected from User-Agent
        - IP address logged
        - Login attempts tracked (success/failed)
    """
    auth_service = AuthService(db)
    token_data = auth_service.login(login_data, request)
    
    # Set refresh token as HTTP-only Secure cookie
    # - httponly=True: tidak bisa diakses JavaScript (aman dari XSS)
    # - secure=True: hanya dikirim via HTTPS (production)
    # - samesite="lax": proteksi CSRF
    # - max_age: 14 days in seconds
    response.set_cookie(
        key="refresh_token",
        value=token_data.refresh_token,
        httponly=True,
        secure=not settings.DEBUG,  # True in production, False in development
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # 14 days
        path="/api/v1/auth"  # Only send cookie to auth endpoints
    )
    
    # Return access token (will be stored in localStorage by React)
    # Don't send refresh_token in response body for security
    return success_response(
        data={
            "access_token": token_data.access_token,
            "token_type": token_data.token_type,
            "user_id": token_data.user_id,
            "username": token_data.username,
            "roles": token_data.roles,
            "permissions": token_data.permissions,
            "menu_guard": token_data.menu_guard,
            "session_id": token_data.session_id  # Include for heartbeat tracking
        },
        message="Login successful"
    )


@router.post("/refresh", response_model=dict, status_code=status.HTTP_200_OK)
def refresh_access_token(
    refresh_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token from HTTP-only cookie
    
    Frontend akan otomatis mengirim cookie, tidak perlu manual.
    
    Returns:
        - **New Access Token** (3 hours): Simpan di localStorage untuk replace yang lama
    
    Raises:
        - 401: Jika refresh token tidak ada, invalid, atau expired
    """
    # Check if refresh token exists in cookie
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Decode and verify refresh token
    payload = decode_refresh_token(refresh_token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user_id from token payload
    user_id = int(payload.get("sub"))
    
    # Get user from database
    user_repo = UserRepository(db)
    user_with_roles = user_repo.get_with_roles(user_id)
    
    if not user_with_roles or not user_with_roles.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    auth_service = AuthService(db)
    auth_context = auth_service.build_auth_context(user_with_roles)
    
    # Create new access token
    new_access_token = create_access_token(
        data={
            "user_id": user_with_roles.id,
            "username": user_with_roles.username,
            "roles": auth_context["roles"],
            "id_pegawai": user_with_roles.id_pegawai
        }
    )
    
    # Return new access token
    return success_response(
        data={
            "access_token": new_access_token,
            "token_type": "bearer",
            "user_id": user_with_roles.id,
            "username": user_with_roles.username,
            "roles": auth_context["roles"],
            "permissions": auth_context["permissions"],
            "menu_guard": auth_context["menu_guard"],
        },
        message="Access token refreshed successfully"
    )


@router.post("/logout", response_model=dict, status_code=status.HTTP_200_OK)
def logout(response: Response):
    """
    Logout endpoint - clear refresh token cookie
    
    Frontend juga harus:
    1. Hapus access token dari localStorage
    2. Redirect ke halaman login
    """
    # Clear refresh token cookie
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth"
    )
    
    return success_response(
        data=None,
        message="Logout successful"
    )
