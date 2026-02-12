"""
Auth Endpoints
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.auth import LoginRequest, TokenResponse
from services.auth_service import AuthService
from utils.response import success_response

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=dict, status_code=status.HTTP_200_OK)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login endpoint - authenticate user and return JWT token
    
    - **username**: Username (min 3 characters)
    - **password**: Password (min 6 characters)
    
    Returns JWT access token and user information
    """
    auth_service = AuthService(db)
    token_data = auth_service.login(login_data)
    
    return success_response(
        data=token_data.model_dump(),
        message="Login successful"
    )
