"""
Application Settings and Configuration
With environment-based configuration and security
"""
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # Environment
    ENVIRONMENT: str = "development"  # development, staging, production
    DEBUG: bool = True
    
    # Application
    APP_NAME: str = "RSUD Sulfat Attendance System"
    APP_VERSION: str = "2.0.0"
    APP_DESCRIPTION: str = "Sistem Attendance RSUD Sulfat - PostgreSQL"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True
    
    # Database
    POSTGRES_DB: str = "attendance_db"
    POSTGRES_USER: str = "sultan"
    POSTGRES_PASSWORD: str = "Sulfat123#!"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: str = "5432"
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3000,http://localhost:5173,http://localhost:8080,http://192.168.171.15:3000,http://192.168.171.20:3000"
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Initial admin bootstrap (optional)
    ADMIN_USERNAME: str | None = None
    ADMIN_PASSWORD: str | None = None
    ADMIN_ID_PEGAWAI: str | None = None
    ADMIN_NIP: str | None = None
    ADMIN_NAMA: str | None = None
    ADMIN_JENIS_KELAMIN: str | None = None
    ADMIN_TEMPAT_LAHIR: str | None = None
    ADMIN_TANGGAL_LAHIR: str | None = None
    ADMIN_ALAMAT: str | None = None
    ADMIN_STATUS: str | None = None
    ADMIN_FORCE_UPDATE: bool = False
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        elif isinstance(v, list):
            return v
        return v
    
    @property
    def DATABASE_URL(self) -> str:
        """Construct SQLAlchemy database URL"""
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def DATABASE_URL_SAFE(self) -> str:
        """Database URL without password (for logging)"""
        return f"postgresql://{self.POSTGRES_USER}:***@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def DB_CONFIG(self) -> dict:
        """Database configuration for psycopg2"""
        return {
            'dbname': self.POSTGRES_DB,
            'user': self.POSTGRES_USER,
            'password': self.POSTGRES_PASSWORD,
            'host': self.POSTGRES_HOST,
            'port': self.POSTGRES_PORT
        }
    
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"
    
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8"
    )


# Global settings instance
settings = Settings()
