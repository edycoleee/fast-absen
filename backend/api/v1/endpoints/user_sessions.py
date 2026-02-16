"""
User Sessions Endpoints
Admin monitoring untuk login sessions & aktivitas user
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from config.database import get_db
from repositories.user_session_repository import UserSessionRepository
from utils.dependencies import require_permission, get_current_user
from utils.permission_registry import PermissionKeys
from utils.response import success_response
from models.user import User


router = APIRouter(prefix="/user-sessions", tags=["User Sessions"])


@router.get("/active", response_model=dict)
def get_all_active_sessions(
    skip: int = 0,
    limit: int = 100,
    inactivity_minutes: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.USER_SESSIONS_READ))
):
    """
    Get all active sessions across all users (Admin only)
    
    Returns sessions that:
    - logout_at is NULL
    - login_status is 'success'
    - last_activity within inactivity_minutes (default: 30 minutes)
    - Ordered by last_activity DESC
    
    Query params:
    - inactivity_minutes: Only show sessions active within X minutes (default: 30)
    
    Shows: username, device info, IP, login time, last activity
    """
    repo = UserSessionRepository(db)
    sessions = repo.get_all_active_sessions(skip=skip, limit=limit, inactivity_minutes=inactivity_minutes)
    
    # Enrich with pegawai/user info
    result = []
    for session in sessions:
        result.append({
            "id": session.id,
            "session_id": session.session_id,
            "id_pegawai": session.id_pegawai,
            "pegawai_nama": session.pegawai.nama if session.pegawai else None,
            "device_type": session.device_type,
            "browser": session.browser,
            "os": session.os,
            "ip_address": str(session.ip_address),
            "country": session.country,
            "city": session.city,
            "login_at": session.login_at.isoformat() if session.login_at else None,
            "last_activity": session.last_activity.isoformat() if session.last_activity else None,
            "login_status": session.login_status,
        })
    
    return success_response(
        message=f"Found {len(result)} active sessions",
        data={"items": result, "total": len(result)}
    )


@router.get("/history", response_model=dict)
def get_all_sessions_history(
    skip: int = 0,
    limit: int = 100,
    id_pegawai: Optional[str] = None,
    device_type: Optional[str] = None,
    login_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.USER_SESSIONS_READ))
):
    """
    Get sessions history with filters (Admin only)
    
    Filters:
    - id_pegawai: Filter by specific pegawai
    - device_type: web, mobile, tablet
    - login_status: success, failed, blocked
    """
    repo = UserSessionRepository(db)
    
    # Build query
    query = repo.db.query(repo.model)
    
    if id_pegawai:
        query = query.filter(repo.model.id_pegawai == id_pegawai)
    
    if device_type:
        query = query.filter(repo.model.device_type == device_type)
    
    if login_status:
        query = query.filter(repo.model.login_status == login_status)
    
    sessions = query.order_by(repo.model.login_at.desc()).offset(skip).limit(limit).all()
    
    # Enrich with pegawai info
    result = []
    for session in sessions:
        result.append({
            "id": session.id,
            "session_id": session.session_id,
            "id_pegawai": session.id_pegawai,
            "pegawai_nama": session.pegawai.nama if session.pegawai else None,
            "device_type": session.device_type,
            "browser": session.browser,
            "os": session.os,
            "ip_address": str(session.ip_address),
            "country": session.country,
            "city": session.city,
            "login_at": session.login_at.isoformat() if session.login_at else None,
            "logout_at": session.logout_at.isoformat() if session.logout_at else None,
            "last_activity": session.last_activity.isoformat() if session.last_activity else None,
            "login_status": session.login_status,
            "failed_reason": session.failed_reason,
        })
    
    return success_response(
        message=f"Found {len(result)} sessions",
        data={"items": result, "total": len(result)}
    )


@router.get("/statistics", response_model=dict)
def get_sessions_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.USER_SESSIONS_READ))
):
    """
    Get session statistics (Admin only)
    
    Returns:
    - Total active sessions
    - Total sessions today
    - Sessions by device type
    - Sessions by status
    """
    repo = UserSessionRepository(db)
    
    # Active sessions count
    active_count = repo.db.query(repo.model).filter(
        repo.model.logout_at.is_(None),
        repo.model.login_status == 'success'
    ).count()
    
    # Today's sessions
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = repo.db.query(repo.model).filter(
        repo.model.login_at >= today_start
    ).count()
    
    # By device type
    from sqlalchemy import func
    device_stats = repo.db.query(
        repo.model.device_type,
        func.count(repo.model.id).label('count')
    ).group_by(repo.model.device_type).all()
    
    # By status
    status_stats = repo.db.query(
        repo.model.login_status,
        func.count(repo.model.id).label('count')
    ).group_by(repo.model.login_status).all()
    
    return success_response(
        message="Session statistics retrieved",
        data={
            "active_sessions_count": active_count,
            "today_sessions_count": today_count,
            "sessions_by_device": {stat[0] or 'unknown': stat[1] for stat in device_stats},
            "sessions_by_status": {stat[0]: stat[1] for stat in status_stats},
        }
    )


@router.get("/{session_id}", response_model=dict)
def get_session_detail(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.USER_SESSIONS_READ))
):
    """Get session detail by session_id (Admin only)"""
    repo = UserSessionRepository(db)
    session = repo.get_by_session_id(session_id)
    
    if not session:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")
    
    return success_response(
        message="Session retrieved",
        data={
            "id": session.id,
            "session_id": session.session_id,
            "id_pegawai": session.id_pegawai,
            "pegawai_nama": session.pegawai.nama if session.pegawai else None,
            "device_type": session.device_type,
            "user_agent": session.user_agent,
            "browser": session.browser,
            "os": session.os,
            "device_model": session.device_model,
            "ip_address": str(session.ip_address),
            "country": session.country,
            "city": session.city,
            "uid": session.uid,
            "player_id": session.player_id,
            "login_at": session.login_at.isoformat() if session.login_at else None,
            "logout_at": session.logout_at.isoformat() if session.logout_at else None,
            "last_activity": session.last_activity.isoformat() if session.last_activity else None,
            "login_status": session.login_status,
            "failed_reason": session.failed_reason,
        }
    )


@router.post("/{session_id}/force-logout", response_model=dict)
def force_logout_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.USER_SESSIONS_UPDATE))
):
    """Force logout a session (Admin only)"""
    repo = UserSessionRepository(db)
    session = repo.logout_session(session_id)
    
    if not session:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")
    
    return success_response(
        message=f"Session {session_id} has been forcefully logged out",
        data={"session_id": session_id, "logout_at": session.logout_at.isoformat()}
    )


@router.post("/heartbeat", response_model=dict)
def session_heartbeat(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update last_activity for a session (heartbeat)
    
    This endpoint should be called periodically by frontend (e.g., every 5 minutes)
    to indicate user is still active. This prevents session from being marked as idle.
    
    Args:
        session_id: The session ID to update (from localStorage)
    
    Returns updated last_activity timestamp.
    """
    repo = UserSessionRepository(db)
    session = repo.get_by_session_id(session_id)
    
    # Verify session belongs to current user (security check)
    if not session:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.id_pegawai != current_user.id_pegawai:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not authorized to update this session")
    
    # Update last activity
    session = repo.update_last_activity(session_id)
    
    if not session:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found or already logged out")
    
    return success_response(
        message="Session activity updated",
        data={
            "session_id": session.session_id,
            "last_activity": session.last_activity.isoformat()
        }
    )


@router.post("/cleanup-expired", response_model=dict)
def cleanup_expired_sessions(
    expiry_hours: int = 24,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.USER_SESSIONS_UPDATE))
):
    """
    Cleanup (auto-logout) expired sessions (Admin only)
    
    Marks sessions as logged out if:
    - logout_at is NULL (still marked as active)
    - last_activity older than expiry_hours
    
    Args:
        expiry_hours: Sessions idle for this many hours will be logged out (default: 24)
    
    Returns count of sessions that were cleaned up.
    """
    repo = UserSessionRepository(db)
    count = repo.cleanup_expired_sessions(expiry_hours=expiry_hours)
    
    return success_response(
        message=f"Cleaned up {count} expired sessions",
        data={"cleaned_count": count, "expiry_hours": expiry_hours}
    )
