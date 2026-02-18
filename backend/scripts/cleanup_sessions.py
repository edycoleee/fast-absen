#!/usr/bin/env python3
"""
CLI Script: Manual Session Cleanup
Manually cleanup expired/inactive user sessions

Usage:
    python scripts/cleanup_sessions.py [OPTIONS]

Options:
    --hours HOURS       Session expiry threshold in hours (default: from settings)
    --dry-run          Show what would be cleaned up without actually doing it
    --force            Skip confirmation prompt
    --inactive MINUTES  Also show sessions inactive for X minutes (default: 30)
    --help, -h         Show this help message

Examples:
    # Cleanup sessions using default settings (24 hours)
    python scripts/cleanup_sessions.py

    # Cleanup sessions idle for more than 48 hours
    python scripts/cleanup_sessions.py --hours 48

    # Dry run to see what would be cleaned up
    python scripts/cleanup_sessions.py --dry-run

    # Force cleanup without confirmation
    python scripts/cleanup_sessions.py --force
"""
import sys
import os
import argparse
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config.database import SessionLocal
from config.settings import settings
from repositories.user_session_repository import UserSessionRepository
from sqlalchemy import and_
from models.user_session import UserSession


def get_expired_sessions(db, expiry_hours: int):
    """Get list of sessions that will be cleaned up"""
    expiry_time = datetime.now() - timedelta(hours=expiry_hours)
    
    sessions = db.query(UserSession).filter(
        and_(
            UserSession.logout_at.is_(None),
            UserSession.last_activity < expiry_time
        )
    ).all()
    
    return sessions


def get_inactive_sessions(db, inactive_minutes: int):
    """Get list of sessions that are currently inactive (but not expired)"""
    inactive_time = datetime.now() - timedelta(minutes=inactive_minutes)
    
    sessions = db.query(UserSession).filter(
        and_(
            UserSession.logout_at.is_(None),
            UserSession.last_activity >= inactive_time
        )
    ).order_by(UserSession.last_activity.desc()).all()
    
    return sessions


def format_timestamp(dt):
    """Format datetime for display"""
    if not dt:
        return "N/A"
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def format_duration(start, end=None):
    """Format duration between two timestamps"""
    if not start:
        return "N/A"
    
    # Make end timezone-aware if start is timezone-aware
    if end is None:
        from datetime import timezone
        end = datetime.now(timezone.utc) if start.tzinfo else datetime.now()
    
    # Convert both to naive datetimes for comparison
    if start.tzinfo:
        start = start.replace(tzinfo=None)
    if end.tzinfo:
        end = end.replace(tzinfo=None)
    
    delta = end - start
    
    hours = delta.total_seconds() / 3600
    if hours < 1:
        minutes = delta.total_seconds() / 60
        return f"{minutes:.0f} minutes"
    elif hours < 24:
        return f"{hours:.1f} hours"
    else:
        days = hours / 24
        return f"{days:.1f} days"


def print_session_info(session, index=None):
    """Print detailed session information"""
    prefix = f"  [{index}] " if index is not None else "  "
    
    print(f"{prefix}Session ID: {session.session_id}")
    print(f"      Pegawai: {session.id_pegawai}")
    print(f"      Device: {session.device_type} | {session.browser}")
    print(f"      IP: {session.ip_address}")
    print(f"      Login At: {format_timestamp(session.login_at)}")
    print(f"      Last Activity: {format_timestamp(session.last_activity)}")
    print(f"      Idle Duration: {format_duration(session.last_activity)}")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Manual cleanup of expired user sessions",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        '--hours',
        type=int,
        default=None,
        help=f'Session expiry threshold in hours (default: {settings.SESSION_EXPIRY_HOURS} from settings)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be cleaned up without actually doing it'
    )
    
    parser.add_argument(
        '--force',
        action='store_true',
        help='Skip confirmation prompt'
    )
    
    parser.add_argument(
        '--inactive',
        type=int,
        default=30,
        help='Also show sessions inactive for X minutes (default: 30)'
    )
    
    args = parser.parse_args()
    
    # Get expiry hours from args or settings
    expiry_hours = args.hours if args.hours is not None else settings.SESSION_EXPIRY_HOURS
    
    print("=" * 70)
    print("SESSION CLEANUP UTILITY")
    print("=" * 70)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Expiry Threshold: {expiry_hours} hours")
    print(f"Inactive Threshold: {args.inactive} minutes (for info only)")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE CLEANUP'}")
    print("=" * 70)
    print()
    
    # Initialize database
    db = SessionLocal()
    
    try:
        # Get expired sessions
        print("[1/3] Fetching expired sessions...")
        expired_sessions = get_expired_sessions(db, expiry_hours)
        
        print(f"Found {len(expired_sessions)} expired sessions (idle > {expiry_hours}h):")
        print()
        
        if expired_sessions:
            for i, session in enumerate(expired_sessions, 1):
                print_session_info(session, i)
        else:
            print("  No expired sessions found.")
            print()
        
        # Get inactive sessions (for information only)
        print(f"[2/3] Fetching inactive sessions (not expired yet)...")
        inactive_sessions = get_inactive_sessions(db, args.inactive)
        
        print(f"Found {len(inactive_sessions)} inactive sessions (idle <= {args.inactive}m, not expired):")
        print()
        
        if inactive_sessions:
            for session in inactive_sessions[:5]:  # Show only first 5
                # Calculate idle minutes with timezone handling
                last_activity = session.last_activity
                if last_activity.tzinfo:
                    last_activity = last_activity.replace(tzinfo=None)
                idle_minutes = (datetime.now() - last_activity).total_seconds() / 60
                print(f"  - {session.id_pegawai}: idle for {idle_minutes:.0f} minutes")
            
            if len(inactive_sessions) > 5:
                print(f"  ... and {len(inactive_sessions) - 5} more")
            print()
        else:
            print("  No inactive sessions found.")
            print()
        
        # Cleanup expired sessions
        if expired_sessions:
            print("[3/3] Cleanup expired sessions...")
            
            if args.dry_run:
                print(f"DRY RUN: Would cleanup {len(expired_sessions)} sessions")
                print("(No actual changes made)")
            else:
                # Confirm before cleanup
                if not args.force:
                    print(f"About to cleanup {len(expired_sessions)} expired sessions.")
                    response = input("Continue? [y/N]: ")
                    
                    if response.lower() not in ['y', 'yes']:
                        print("Cleanup cancelled.")
                        return
                
                # Perform cleanup
                repo = UserSessionRepository(db)
                count = repo.cleanup_expired_sessions(expiry_hours=expiry_hours)
                
                print(f"✅ Successfully cleaned up {count} expired sessions")
        else:
            print("[3/3] No cleanup needed - all sessions are active or recent")
        
        print()
        print("=" * 70)
        print("SUMMARY")
        print("=" * 70)
        print(f"Total Expired Sessions: {len(expired_sessions)}")
        print(f"Total Inactive Sessions: {len(inactive_sessions)}")
        print(f"Action: {'DRY RUN - No changes made' if args.dry_run else f'Cleaned up {len(expired_sessions)} sessions'}")
        print("=" * 70)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        db.close()


if __name__ == "__main__":
    main()
