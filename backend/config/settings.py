"""
Application Settings and Configuration
With environment-based configuration and security
"""
import os
from typing import List
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import validator

load_dotenv()


class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")  # development, staging, production
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # Application
    APP_NAME: str = os.getenv("APP_NAME", "RSUD Sulfat Attendance System")
    APP_VERSION: str = os.getenv("APP_VERSION", "2.0.0")
    APP_DESCRIPTION: str = os.getenv("APP_DESCRIPTION", "Sistem Attendance RSUD Sulfat - PostgreSQL")
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    RELOAD: bool = os.getenv("RELOAD", "True").lower() == "true"
    
    # Database
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "attendance_db")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "sultan")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "Sulfat123#!")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    
    # API
    API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/api/v1")
    
    # CORS
    CORS_ORIGINS: List[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://localhost:8080"
    ).split(",")
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
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
    
    class Config:
        case_sensitive = True


# Global settings instance
settings = Settings()
