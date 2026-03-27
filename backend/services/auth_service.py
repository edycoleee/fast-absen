"""
Authentication Service
Business logic for authentication with JWT Access & Refresh tokens + Session tracking
"""
from typing import Optional
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Request
from schemas.auth import LoginRequest, TokenResponse
from schemas.user_session import UserSessionCreate
from repositories.user_repository import UserRepository
from repositories.user_session_repository import UserSessionRepository
from utils.auth import verify_password, create_access_token, create_refresh_token
from utils.device_detector import detect_device_info
from models.user import User


class AuthService:
    """Authentication service with session tracking"""
    
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.session_repo = UserSessionRepository(db)

    @staticmethod
    def get_user_permissions(user: User) -> list[str]:
        permissions = {
            perm.name
            for role in user.roles
            for perm in role.permissions
        }
        return sorted(permissions)

    @staticmethod
    def _is_admin_roles(role_names: list[str]) -> bool:
        role_set = {role.lower() for role in role_names}
        return "admin" in role_set or "super-admin" in role_set

    def build_menu_guard(self, user: User, role_names: list[str], permissions: list[str]) -> dict:
        permission_set = set(permissions)
        is_admin = self._is_admin_roles(role_names) or any(getattr(r, 'is_admin', False) for r in user.roles)
        kepala_unit_scope_id = None
        if user.pegawai and user.pegawai.kepala_id_unit is not None:
            kepala_unit_scope_id = user.pegawai.kepala_id_unit

        can_view_kpi = "penilaian_shift_absensi.read" in permission_set and (
            is_admin or kepala_unit_scope_id is not None
        )

        kpi_endpoint = None
        if can_view_kpi:
            kpi_endpoint = "/api/v1/stats/kpi/unit-role" if is_admin else "/api/v1/stats/kpi/unit-role/my-unit"

        return {
            "is_admin": is_admin,
            "is_kepala_unit": kepala_unit_scope_id is not None,
            "kepala_unit_scope_id": kepala_unit_scope_id,
            "menus": {
                "dashboard": {
                    "visible": is_admin or can_view_kpi or "absensi.read" in permission_set,
                },
                "kpi_unit_role": {
                    "visible": can_view_kpi,
                    "endpoint": kpi_endpoint,
                    "force_my_unit_scope": can_view_kpi and not is_admin,
                    "allow_optional_unit_filter": can_view_kpi and is_admin,
                },
                "monitoring_absensi": {
                    "visible": "absensi.read" in permission_set,
                },
                "approval": {
                    "visible": "approval_pengajuan_absensi.read" in permission_set,
                    "can_decide": "approval_pengajuan_absensi.update" in permission_set,
                },
                "user_sessions": {
                    "visible": "user_sessions.read" in permission_set,
                },
            },
        }

    def build_auth_context(self, user: User) -> dict:
        role_names = [role.name for role in user.roles]
        permissions = self.get_user_permissions(user)
        menu_guard = self.build_menu_guard(user=user, role_names=role_names, permissions=permissions)
        return {
            "roles": role_names,
            "permissions": permissions,
            "menu_guard": menu_guard,
        }
    
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
    
    def create_session(
        self, 
        user: User, 
        request: Request,
        login_status: str = 'success'
    ) -> str:
        """
        Create new user session with device tracking
        
        Args:
            user: Authenticated user
            request: FastAPI Request object
            login_status: 'success', 'failed', or 'blocked'
        
        Returns:
            Session ID (UUID)
        """
        # Detect device info from request
        device_info = detect_device_info(request)
        
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        # Create session data
        session_data = UserSessionCreate(
            id_pegawai=user.id_pegawai,
            session_id=session_id,
            device_type=device_info['device_type'],
            user_agent=device_info['user_agent'],
            browser=device_info['browser'],
            os=device_info['os'],
            device_model=device_info['device_model'],
            ip_address=device_info['ip_address'],
            country=device_info.get('country'),
            city=device_info.get('city'),
            login_status=login_status
        )
        
        # Save to database
        self.session_repo.create_session(session_data.model_dump())
        
        return session_id
    
    def login(self, login_data: LoginRequest, request: Request) -> TokenResponse:
        """
        Login user and return JWT tokens (access + refresh) with session tracking
        
        Args:
            login_data: Login credentials
            request: FastAPI Request object
        
        Returns:
            Token response with access token, refresh token, session info, and user info
        
        Raises:
            HTTPException: If credentials are invalid
        """
        user = self.authenticate_user(login_data.username, login_data.password)
        
        if not user:
            # Log failed login attempt if user exists
            temp_user = self.user_repo.get_by_username(login_data.username)
            if temp_user:
                try:
                    self.create_session(temp_user, request, login_status='failed')
                except:
                    pass  # Don't block login if session creation fails
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user with roles
        user_with_roles = self.user_repo.get_with_roles(user.id)
        auth_context = self.build_auth_context(user_with_roles)
        
        # Create session
        session_id = self.create_session(user, request, login_status='success')
        
        # Create access token (3 hours, for localStorage)
        access_token = create_access_token(
            data={
                "user_id": user.id,
                "username": user.username,
                "roles": auth_context["roles"],
                "id_pegawai": user.id_pegawai,
                "session_id": session_id  # Include session ID in token
            }
        )
        
        # Create refresh token (14 days, for HTTP-only cookie)
        refresh_token = create_refresh_token(user.id)
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id,
            username=user.username,
            roles=auth_context["roles"],
            permissions=auth_context["permissions"],
            menu_guard=auth_context["menu_guard"],
            session_id=session_id,  # Include session ID in response
            refresh_token=refresh_token
        )
    
    def logout(self, session_id: str) -> bool:
        """
        Logout user session
        
        Args:
            session_id: Session ID from JWT token
        
        Returns:
            True if logout successful
        """
        session = self.session_repo.logout_session(session_id)
        return session is not None
    
    def get_active_sessions(self, id_pegawai: str):
        """Get all active sessions for a user"""
        return self.session_repo.get_active_sessions(id_pegawai)
