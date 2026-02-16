"""
User Session Schemas
Login tracking schemas dengan validation
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime


class UserSessionBase(BaseModel):
    """Base user session schema"""
    id_pegawai: str
    ip_address: str = Field(..., description="IP address dari client")


class UserSessionCreate(UserSessionBase):
    """Create new session (for internal use)"""
    session_id: str = Field(..., description="UUID session identifier")
    device_type: Optional[str] = Field(None, description="web, mobile, atau tablet")
    user_agent: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    device_model: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    uid: Optional[str] = Field(None, description="Device UID untuk mobile")
    player_id: Optional[str] = Field(None, description="Push notification ID")
    login_status: str = Field(default='success', description="success, failed, atau blocked")
    failed_reason: Optional[str] = None
    
    @field_validator('device_type')
    @classmethod
    def validate_device_type(cls, v):
        if v and v not in ['web', 'mobile', 'tablet']:
            raise ValueError('device_type must be web, mobile, or tablet')
        return v
    
    @field_validator('login_status')
    @classmethod
    def validate_login_status(cls, v):
        if v not in ['success', 'failed', 'blocked']:
            raise ValueError('login_status must be success, failed, or blocked')
        return v


class UserSessionUpdate(BaseModel):
    """Update session (for logout or activity tracking)"""
    logout_at: Optional[datetime] = None
    last_activity: Optional[datetime] = None


class UserSessionResponse(BaseModel):
    """User session response schema"""
    id: int
    id_pegawai: str
    session_id: str
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    ip_address: str
    city: Optional[str] = None
    country: Optional[str] = None
    login_at: datetime
    logout_at: Optional[datetime] = None
    last_activity: datetime
    login_status: str
    
    model_config = ConfigDict(from_attributes=True)


class UserSessionDetail(UserSessionResponse):
    """Detailed session info with pegawai"""
    pegawai_nama: Optional[str] = None
    pegawai_nip: Optional[str] = None
    user_agent: Optional[str] = None
    device_model: Optional[str] = None


class ActiveSessionInfo(BaseModel):
    """Active session summary"""
    total_active: int
    sessions: list[UserSessionResponse]


class LoginAttemptLog(BaseModel):
    """Login attempt log (for failed logins)"""
    id_pegawai: str
    ip_address: str
    login_status: str
    failed_reason: Optional[str] = None
    user_agent: Optional[str] = None
