"""
Constants dan Enums untuk aplikasi
Centralized constants untuk maintainability
"""
from enum import Enum


class Environment(str, Enum):
    """Environment types"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class UserRole(str, Enum):
    """User roles"""
    ADMIN = "admin"
    USER = "user"
    MANAGER = "manager"
    SUPERVISOR = "supervisor"


class AttendanceStatus(str, Enum):
    """Status kehadiran"""
    HADIR = "Hadir"
    SAKIT = "Sakit"
    IZIN = "Izin"
    ALPHA = "Alpha"
    CUTI = "Cuti"


class Gender(str, Enum):
    """Jenis kelamin"""
    LAKI_LAKI = "Laki-laki"
    PEREMPUAN = "Perempuan"


class EmployeeStatus(str, Enum):
    """Status pegawai"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    RESIGNED = "resigned"


class HTTPStatus:
    """Common HTTP status codes"""
    OK = 200
    CREATED = 201
    NO_CONTENT = 204
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    UNPROCESSABLE_ENTITY = 422
    INTERNAL_SERVER_ERROR = 500


class ErrorMessages:
    """Common error messages"""
    NOT_FOUND = "{} not found"
    ALREADY_EXISTS = "{} already exists"
    INVALID_CREDENTIALS = "Invalid credentials"
    UNAUTHORIZED = "Authentication required"
    FORBIDDEN = "Insufficient permissions"
    VALIDATION_ERROR = "Validation error"
    INTERNAL_ERROR = "Internal server error"


class SuccessMessages:
    """Common success messages"""
    CREATED = "{} created successfully"
    UPDATED = "{} updated successfully"
    DELETED = "{} deleted successfully"
    RETRIEVED = "{} retrieved successfully"


# Pagination defaults
DEFAULT_PAGE = 1
DEFAULT_LIMIT = 10
MAX_LIMIT = 100

# Date/Time formats
DATE_FORMAT = "%Y-%m-%d"
DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"
TIME_FORMAT = "%H:%M:%S"

# Token expiration (minutes)
ACCESS_TOKEN_EXPIRE = 30
REFRESH_TOKEN_EXPIRE = 10080  # 7 days

# File upload
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"]
UPLOAD_DIR = "uploads"
