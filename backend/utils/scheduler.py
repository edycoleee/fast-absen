"""
Background Task Scheduler
Handles periodic tasks like session cleanup
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
from config.settings import settings
from config.database import SessionLocal
from repositories.user_session_repository import UserSessionRepository
from utils.logger import logger  # Use application logger

# Global scheduler instance
scheduler = BackgroundScheduler()


def cleanup_expired_sessions():
    """
    Background task to cleanup expired sessions
    Runs periodically based on SESSION_CLEANUP_INTERVAL_MINUTES
    """
    try:
        db = SessionLocal()
        repo = UserSessionRepository(db)
        
        # Get expiry hours from settings
        expiry_hours = settings.SESSION_EXPIRY_HOURS
        
        # Cleanup expired sessions
        count = repo.cleanup_expired_sessions(expiry_hours=expiry_hours)
        
        if count > 0:
            logger.info(f"[Session Cleanup] Cleaned up {count} expired sessions (idle > {expiry_hours}h)")
        else:
            logger.debug(f"[Session Cleanup] No expired sessions to cleanup (checked sessions idle > {expiry_hours}h)")
        
        db.close()
        
    except Exception as e:
        logger.error(f"[Session Cleanup] Error during cleanup: {str(e)}")
        if 'db' in locals():
            db.close()


def start_scheduler():
    """
    Start the background scheduler
    Called on application startup
    """
    try:
        # Get cleanup interval from settings
        interval_minutes = settings.SESSION_CLEANUP_INTERVAL_MINUTES
        
        # Add job to scheduler
        scheduler.add_job(
            func=cleanup_expired_sessions,
            trigger=IntervalTrigger(minutes=interval_minutes),
            id='cleanup_expired_sessions',
            name='Cleanup expired user sessions',
            replace_existing=True
        )
        
        # Start scheduler
        scheduler.start()
        
        logger.info(f"[Scheduler] Started - Session cleanup will run every {interval_minutes} minutes")
        logger.info(f"[Scheduler] Sessions idle > {settings.SESSION_EXPIRY_HOURS} hours will be auto-logged out")
        
    except Exception as e:
        logger.error(f"[Scheduler] Failed to start: {str(e)}")


def stop_scheduler():
    """
    Stop the background scheduler
    Called on application shutdown
    """
    try:
        if scheduler.running:
            scheduler.shutdown()
            logger.info("[Scheduler] Stopped")
    except Exception as e:
        logger.error(f"[Scheduler] Error during shutdown: {str(e)}")


def run_cleanup_now():
    """
    Manually trigger cleanup immediately
    Useful for testing or manual intervention
    """
    logger.info("[Scheduler] Manual cleanup triggered")
    cleanup_expired_sessions()
