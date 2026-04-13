"""
Authentication Utilities
JWT token and password hashing with Access & Refresh tokens
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from config.settings import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a plain password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token
    
    Args:
        data: Dictionary containing user data (user_id, username, roles)
        expires_delta: Token expiration time delta
    
    Returns:
        Encoded JWT token string
    
    Payload includes:
        - sub: user_id (subject)
        - username: username
        - roles: list of role names
        - iat: issued at timestamp
        - exp: expiration timestamp
        - iss: issuer (auth-server)
        - aud: audience (internal-apps)
    """
    to_encode = data.copy()
    # Use timezone-aware UTC datetime
    now = datetime.now(timezone.utc)
    
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Build JWT payload according to best practices
    payload = {
        "sub": str(data.get("user_id")),  # Subject (user identifier)
        "username": data.get("username"),
        "roles": data.get("roles", []),
        # SSO global identity claims — dipakai oleh semua aplikasi konsumen
        "nik": data.get("nik"),               # NIK global — kunci identitas lintas aplikasi
        "id_pegawai": data.get("id_pegawai"), # ID internal pegawai
        "unit_id": data.get("unit_id"),       # Unit kerja utama
        "full_name": data.get("full_name"),   # Nama lengkap
        "session_id": data.get("session_id"),
        "iat": int(now.timestamp()),  # Issued at
        "exp": int(expire.timestamp()),  # Expiration
        "iss": settings.JWT_ISSUER,  # Issuer
        "aud": settings.JWT_AUDIENCE  # Audience
    }
    
    encoded_jwt = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt


def create_refresh_token(user_id: int) -> str:
    """
    Create a JWT refresh token
    
    Args:
        user_id: User ID
    
    Returns:
        Encoded JWT refresh token string
    
    Payload includes:
        - sub: user_id (subject)
        - type: "refresh" (token type)
        - iat: issued at timestamp
        - exp: expiration timestamp (14 days)
    """
    # Use timezone-aware UTC datetime
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "sub": str(user_id),  # Subject (user identifier)
        "type": "refresh",  # Token type
        "iat": int(now.timestamp()),  # Issued at
        "exp": int(expire.timestamp())  # Expiration
    }
    
    encoded_jwt = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT access token
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM],
            audience=settings.JWT_AUDIENCE,
            issuer=settings.JWT_ISSUER
        )

        if "user_id" not in payload and payload.get("sub") is not None:
            try:
                payload["user_id"] = int(payload["sub"])
            except (TypeError, ValueError):
                payload["user_id"] = payload["sub"]

        return payload
    except JWTError:
        return None


def decode_refresh_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT refresh token
    
    Args:
        token: JWT refresh token string
    
    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        
        # Verify it's a refresh token
        if payload.get("type") != "refresh":
            return None
            
        return payload
    except JWTError:
        return None
