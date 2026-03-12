"""
Auth Endpoints
Login with JWT Access Token (localStorage) & Refresh Token (HTTP-only cookie) + Session Tracking
"""
import io
import os
from fastapi import APIRouter, Depends, status, Response, Cookie, HTTPException, Request, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from config.database import get_db
from config.settings import settings
from schemas.auth import LoginRequest, TokenResponse
from schemas.face import FaceLoginRequest
from services.auth_service import AuthService
from services.face_service import FaceService
from utils.response import success_response
from utils.auth import decode_refresh_token, create_access_token
from utils.dependencies import get_current_user
from repositories.user_repository import UserRepository
from repositories.pegawai_repository import PegawaiRepository
from models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/check-username/{username}", response_model=dict, status_code=status.HTTP_200_OK)
def check_username(
    username: str,
    db: Session = Depends(get_db),
):
    """
    Cek apakah username terdaftar dan aktif, serta sudah mendaftarkan wajah.
    Digunakan oleh frontend sebelum membuka popup kamera face login
    sehingga error bisa ditampilkan lebih awal tanpa harus membuka kamera.
    """
    user_repo = UserRepository(db)
    user = user_repo.get_by_username(username)

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Username tidak ditemukan atau akun tidak aktif.",
        )

    if not user.id_pegawai:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Akun user tidak terhubung ke data pegawai. Hubungi admin.",
        )

    return success_response(
        data={"username": user.username, "id_pegawai": user.id_pegawai},
        message="Username valid",
    )


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


@router.post("/login-face", response_model=dict, status_code=status.HTTP_200_OK)
def login_face(
    login_data: FaceLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Login menggunakan verifikasi wajah 1:1.

    Flow:
      1. Lookup user by username
      2. Ambil id_pegawai dari user
      3. Verifikasi foto dengan embedding tersimpan (cosine similarity)
      4. Jika verified → buat JWT tokens + session (sama dengan login biasa)

    **Penting**: User harus sudah mendaftarkan wajah terlebih dahulu via
    `POST /face/users/{id_pegawai}/register`.
    """
    auth_service = AuthService(db)
    face_service = FaceService(db)

    # 1. Cari user berdasarkan username
    user_repo = UserRepository(db)
    user = user_repo.get_by_username(login_data.username)

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username tidak ditemukan atau akun tidak aktif.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.id_pegawai:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Akun user tidak terhubung ke data pegawai. Hubungi admin.",
        )

    # 2. Verifikasi wajah (HTTPException jika gagal detect atau belum register)
    verified, similarity = face_service.verify_face_for_login(
        id_pegawai=user.id_pegawai,
        b64=login_data.image,
        threshold=login_data.threshold or 0.6,
    )

    if not verified:
        # Log failed login attempt
        try:
            auth_service.create_session(user, request, login_status="failed")
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                f"Verifikasi wajah gagal (similarity={similarity:.4f} "
                f"< threshold={login_data.threshold or 0.6}). "
                "Pastikan pencahayaan baik dan wajah terlihat jelas."
            ),
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Buat token & session (sama persis dengan login password)
    user_with_roles = user_repo.get_with_roles(user.id)
    auth_context = auth_service.build_auth_context(user_with_roles)
    session_id = auth_service.create_session(user, request, login_status="success")

    access_token = create_access_token(
        data={
            "user_id": user.id,
            "username": user.username,
            "roles": auth_context["roles"],
            "id_pegawai": user.id_pegawai,
            "session_id": session_id,
        }
    )
    from utils.auth import create_refresh_token
    refresh_token = create_refresh_token(user.id)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/v1/auth",
    )

    return success_response(
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "username": user.username,
            "roles": auth_context["roles"],
            "permissions": auth_context["permissions"],
            "menu_guard": auth_context["menu_guard"],
            "session_id": session_id,
            "face_similarity": round(similarity, 4),
        },
        message="Login wajah berhasil.",
    )


@router.get("/me", response_model=dict, status_code=status.HTTP_200_OK)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current authenticated user profile including linked pegawai data."""
    pegawai_data = None
    if current_user.id_pegawai:
        pegawai_repo = PegawaiRepository(db)
        pegawai = pegawai_repo.get(current_user.id_pegawai)
        if pegawai:
            pegawai_data = {
                "id_pegawai": pegawai.id_pegawai,
                "nip": pegawai.nip,
                "nama": pegawai.nama,
                "jenis_kelamin": pegawai.jenis_kelamin,
                "tempat_lahir": pegawai.tempat_lahir,
                "tanggal_lahir": str(pegawai.tanggal_lahir) if pegawai.tanggal_lahir else None,
                "alamat": pegawai.alamat,
                "status": pegawai.status,
                "nohp": pegawai.nohp,
                "foto": pegawai.foto,
            }

    return success_response(
        data={
            "id": current_user.id,
            "username": current_user.username,
            "id_pegawai": current_user.id_pegawai,
            "is_active": current_user.is_active,
            "roles": [r.name for r in current_user.roles],
            "created_at": str(current_user.created_at) if current_user.created_at else None,
            "pegawai": pegawai_data,
        },
        message="Profile retrieved successfully",
    )


@router.post("/me/photo", response_model=dict, status_code=status.HTTP_200_OK)
async def upload_profile_photo(
    foto: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload or replace the current user's profile photo.
    The user must have a linked pegawai record.
    """
    if not current_user.id_pegawai:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Akun ini tidak terhubung ke data pegawai. Hubungi admin.",
        )

    allowed_types = ["image/jpeg", "image/jpg", "image/png"]
    if foto.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File harus berformat JPG atau PNG.",
        )

    contents = await foto.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ukuran file maksimal 5 MB.",
        )

    try:
        from PIL import Image as PILImage
        img = PILImage.open(io.BytesIO(contents))
        if img.mode in ("RGBA", "LA", "P"):
            bg = PILImage.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            bg.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")

        max_size = (800, 800)
        if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
            img.thumbnail(max_size, PILImage.Resampling.LANCZOS)

        upload_dir = os.path.join(os.getcwd(), "uploads", "photos")
        os.makedirs(upload_dir, exist_ok=True)

        filename = f"{current_user.id_pegawai}.jpg"
        file_path = os.path.join(upload_dir, filename)
        img.save(file_path, "JPEG", optimize=True, quality=85)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gagal memproses gambar: {str(e)}",
        )

    pegawai_repo = PegawaiRepository(db)
    pegawai = pegawai_repo.get(current_user.id_pegawai)
    pegawai.foto = filename
    pegawai_repo.update(pegawai)

    return success_response(
        data={"foto": filename},
        message="Foto profil berhasil diperbarui.",
    )
