"""
User Session Model
Login tracking untuk Web & Mobile
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator, String as SQLString
from models.base import Base


class IPAddress(TypeDecorator):
    """
    Custom SQLAlchemy type for IP addresses
    Uses INET for PostgreSQL, String for other databases (like SQLite)
    """
    impl = SQLString
    cache_ok = True
    
    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(INET())
        else:
            return dialect.type_descriptor(SQLString(45))  # Max length for IPv6


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    id_pegawai = Column(String(20), ForeignKey("pegawai.id_pegawai"), nullable=False, index=True)
    
    # Session Management
    session_id = Column(String(255), unique=True, index=True)
    
    # Device & Browser Info
    device_type = Column(String(20), nullable=True)  # web, mobile, tablet
    user_agent = Column(Text, nullable=True)
    browser = Column(String(100), nullable=True)
    os = Column(String(100), nullable=True)
    device_model = Column(String(250), nullable=True)
    
    # Network Info
    ip_address = Column(IPAddress, nullable=False)
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    
    # Mobile-specific (optional, NULL for web)
    uid = Column(String(50), nullable=True)
    player_id = Column(String(50), nullable=True)
    
    # Session Lifecycle
    login_at = Column(DateTime(timezone=True), server_default=func.now())
    logout_at = Column(DateTime(timezone=True), nullable=True)
    last_activity = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Security
    login_status = Column(String(20), default='success')  # success, failed, blocked
    failed_reason = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Constraints
    __table_args__ = (
        CheckConstraint("device_type IN ('web', 'mobile', 'tablet')", name='check_device_type'),
        CheckConstraint("login_status IN ('success', 'failed', 'blocked')", name='check_login_status'),
    )
    
    # Relationships
    pegawai = relationship("Pegawai", back_populates="user_sessions")
