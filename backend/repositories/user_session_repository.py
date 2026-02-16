"""
User Session Repository
Database operations for UserSession model
"""
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from models.user_session import UserSession
from repositories.base import BaseRepository


class UserSessionRepository(BaseRepository[UserSession]):
    """User session repository for login tracking"""
    
    def __init__(self, db: Session):
        super().__init__(UserSession, db)
    
    def create_session(self, session_data: dict) -> UserSession:
        """Create new user session"""
        session = UserSession(**session_data)
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session
    
    def get_by_session_id(self, session_id: str) -> Optional[UserSession]:
        """Get session by session_id"""
        return self.db.query(UserSession).filter(
            UserSession.session_id == session_id
        ).first()
    
    def get_active_sessions(self, id_pegawai: str) -> List[UserSession]:
        """Get all active sessions for a pegawai (logout_at is NULL)"""
        return self.db.query(UserSession).filter(
            and_(
                UserSession.id_pegawai == id_pegawai,
                UserSession.logout_at.is_(None),
                UserSession.login_status == 'success'
            )
        ).order_by(UserSession.login_at.desc()).all()
    
    def get_all_active_sessions(self, skip: int = 0, limit: int = 100, inactivity_minutes: Optional[int] = None) -> List[UserSession]:
        """Get all active sessions across all users
        
        Args:
            skip: Pagination offset
            limit: Pagination limit
            inactivity_minutes: Only show sessions active within this many minutes (default: no filter)
        """
        filters = [
            UserSession.logout_at.is_(None),
            UserSession.login_status == 'success'
        ]
        
        # Filter by inactivity timeout
        if inactivity_minutes:
            cutoff_time = datetime.now() - timedelta(minutes=inactivity_minutes)
            filters.append(UserSession.last_activity >= cutoff_time)
        
        return self.db.query(UserSession).filter(
            and_(*filters)
        ).order_by(UserSession.last_activity.desc()).offset(skip).limit(limit).all()
    
    def get_session_history(
        self, 
        id_pegawai: str, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[UserSession]:
        """Get session history for a pegawai"""
        return self.db.query(UserSession).filter(
            UserSession.id_pegawai == id_pegawai
        ).order_by(UserSession.login_at.desc()).offset(skip).limit(limit).all()
    
    def update_last_activity(self, session_id: str) -> Optional[UserSession]:
        """Update last activity timestamp"""
        session = self.get_by_session_id(session_id)
        if session and session.logout_at is None:
            session.last_activity = datetime.now()
            self.db.commit()
            self.db.refresh(session)
        return session
    
    def logout_session(self, session_id: str) -> Optional[UserSession]:
        """Mark session as logged out"""
        session = self.get_by_session_id(session_id)
        if session:
            session.logout_at = datetime.now()
            self.db.commit()
            self.db.refresh(session)
        return session
    
    def logout_all_user_sessions(self, id_pegawai: str) -> int:
        """Logout all active sessions for a user (force logout)"""
        count = self.db.query(UserSession).filter(
            and_(
                UserSession.id_pegawai == id_pegawai,
                UserSession.logout_at.is_(None)
            )
        ).update({"logout_at": datetime.now()})
        self.db.commit()
        return count
    
    def cleanup_expired_sessions(self, expiry_hours: int = 24) -> int:
        """Auto-logout sessions that have been idle for too long"""
        expiry_time = datetime.now() - timedelta(hours=expiry_hours)
        count = self.db.query(UserSession).filter(
            and_(
                UserSession.logout_at.is_(None),
                UserSession.last_activity < expiry_time
            )
        ).update({"logout_at": datetime.now()})
        self.db.commit()
        return count
    
    def get_failed_login_attempts(
        self, 
        id_pegawai: Optional[str] = None,
        ip_address: Optional[str] = None,
        hours: int = 24
    ) -> List[UserSession]:
        """Get failed login attempts within time window"""
        since = datetime.now() - timedelta(hours=hours)
        
        filters = [
            UserSession.login_status.in_(['failed', 'blocked']),
            UserSession.login_at >= since
        ]
        
        if id_pegawai:
            filters.append(UserSession.id_pegawai == id_pegawai)
        if ip_address:
            filters.append(UserSession.ip_address == ip_address)
        
        return self.db.query(UserSession).filter(and_(*filters)).order_by(
            UserSession.login_at.desc()
        ).all()
    
    def count_active_sessions(self) -> int:
        """Count total active sessions"""
        return self.db.query(func.count(UserSession.id)).filter(
            and_(
                UserSession.logout_at.is_(None),
                UserSession.login_status == 'success'
            )
        ).scalar()
    
    def get_sessions_by_ip(self, ip_address: str, skip: int = 0, limit: int = 50) -> List[UserSession]:
        """Get all sessions from specific IP address"""
        return self.db.query(UserSession).filter(
            UserSession.ip_address == ip_address
        ).order_by(UserSession.login_at.desc()).offset(skip).limit(limit).all()
    
    def get_sessions_with_pegawai(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[UserSession]:
        """Get sessions with pegawai information"""
        return self.db.query(UserSession).options(
            joinedload(UserSession.pegawai)
        ).order_by(UserSession.login_at.desc()).offset(skip).limit(limit).all()
