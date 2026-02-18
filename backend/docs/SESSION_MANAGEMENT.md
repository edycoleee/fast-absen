# Session Management & Auto-Cleanup System

## Overview

Sistem session management yang comprehensive dengan auto-cleanup otomatis, monitoring real-time, dan status visualization.

## Features

### 1. ⏱️ **Session Timeout Configuration**
- Configurable timeout via environment variables
- Separate settings untuk "active" threshold dan "expiry" threshold
- Auto-cleanup scheduler yang berjalan di background

### 2. 🔄 **Background Auto-Cleanup**
- Scheduler otomatis cleanup expired sessions
- Berjalan periodic sesuai konfigurasi (default: setiap 1 jam)
- Non-blocking background task menggunakan APScheduler

### 3. 📊 **UI Status Visualization**
- Real-time status indicator (Active/Idle/Logged Out)
- Color-coded badges dengan emoji
- Menampilkan berapa menit inactive
- Status di kedua tab Active dan History

### 4. 🛠️ **CLI Manual Cleanup**
- Script manual untuk cleanup session
- Dry-run mode untuk preview
- Detailed reporting

## Configuration

### Environment Variables

Tambahkan di `.env`:

```bash
# Session Management Configuration
SESSION_ACTIVE_MINUTES=30          # Session dianggap "active" jika heartbeat < 30 menit
SESSION_EXPIRY_HOURS=24           # Auto-logout sessions idle > 24 jam
SESSION_CLEANUP_INTERVAL_MINUTES=60  # Run cleanup every 60 minutes (1 jam)
```

### Default Values

| Setting | Default | Description |
|---------|---------|-------------|
| `SESSION_ACTIVE_MINUTES` | 30 | Threshold untuk status "Active" vs "Idle" |
| `SESSION_EXPIRY_HOURS` | 24 | Sessions idle > ini akan di-logout otomatis |
| `SESSION_CLEANUP_INTERVAL_MINUTES` | 60 | Interval auto-cleanup scheduler |

## How It Works

### 1. Client Heartbeat System

**Frontend** ([useSessionHeartbeat.js](../frontend/src/domain/hooks/useSessionHeartbeat.js)):
```javascript
// Mengirim heartbeat setiap 5 menit
const { startHeartbeat } = useSessionHeartbeat(5);
```

**Backend** ([user_sessions.py](../backend/api/v1/endpoints/user_sessions.py)):
```python
# Update last_activity timestamp
@router.post("/heartbeat")
def session_heartbeat(session_id: str):
    session.last_activity = datetime.now()
```

### 2. Session Status Logic

Session status ditentukan berdasarkan `last_activity`:

```
ACTIVE       → last_activity < 30 menit yang lalu (masih heartbeat aktif)
IDLE         → last_activity >= 30 menit, tapi < 24 jam (tidak heartbeat tetapi belum expired)
LOGGED_OUT   → logout_at IS NOT NULL (user sudah logout atau auto-logout)
```

### 3. Auto-Cleanup Timeline

```
T+0 min:   User login → session created
T+5 min:   Heartbeat sent → last_activity updated
T+10 min:  Heartbeat sent → last_activity updated
T+15 min:  User close browser → heartbeat STOP
T+30 min:  Status = IDLE (>30 menit tidak heartbeat)
T+24 hour: Auto-cleanup → logout_at = NOW, status = LOGGED_OUT
```

### 4. Background Scheduler

**Startup** ([main.py](../backend/main.py)):
```python
# Auto-start on application startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()  # Start background cleanup
    yield
    stop_scheduler()   # Graceful shutdown
```

**Scheduler** ([scheduler.py](../backend/utils/scheduler.py)):
```python
# Runs every SESSION_CLEANUP_INTERVAL_MINUTES
def cleanup_expired_sessions():
    repo.cleanup_expired_sessions(expiry_hours=settings.SESSION_EXPIRY_HOURS)
```

## UI Components

### Session Monitor Page

**Status Badge:**
```jsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full">
  <span>🟢</span> Active <span>(5m)</span>
</span>
```

**Status Colors:**
- 🟢 **Active** - Green badge (heartbeat dalam 30 menit terakhir)
- 🟡 **Idle** - Yellow badge (30+ menit tidak heartbeat, belum expired)
- ⚪ **Logged Out** - Gray badge (sudah logout atau auto-cleanup)

### Columns

**Active Sessions Tab:**
```
| Pengguna | Status | Perangkat | Browser | IP | Login | Last Activity | Durasi | Aksi |
```

**History Tab:**
```
| Pengguna | Status | Perangkat | IP | Login | Logout | Durasi | Status Login |
```

## Manual Cleanup Script

### Usage

```bash
# Basic cleanup (uses default 24 hours)
python scripts/cleanup_sessions.py

# Cleanup sessions idle > 48 hours
python scripts/cleanup_sessions.py --hours 48

# Dry-run (preview without actual cleanup)
python scripts/cleanup_sessions.py --dry-run

# Force cleanup without confirmation
python scripts/cleanup_sessions.py --force

# Show help
python scripts/cleanup_sessions.py --help
```

### Output Example

```
======================================================================
SESSION CLEANUP UTILITY
======================================================================
Timestamp: 2026-02-18 10:30:00
Expiry Threshold: 24 hours
Inactive Threshold: 30 minutes (for info only)
Mode: LIVE CLEANUP
======================================================================

[1/3] Fetching expired sessions...
Found 5 expired sessions (idle > 24h):

  [1] Session ID: abc123
      Pegawai: P001
      Device: desktop | Chrome
      IP: 192.168.1.10
      Login At: 2026-02-17 08:00:00
      Last Activity: 2026-02-17 09:15:00
      Idle Duration: 25.3 hours

...

[2/3] Fetching inactive sessions (not expired yet)...
Found 3 inactive sessions (idle <= 30m, not expired):
  - P002: idle for 15 minutes
  - P003: idle for 22 minutes
  - P004: idle for 28 minutes

[3/3] Cleanup expired sessions...
✅ Successfully cleaned up 5 expired sessions

======================================================================
SUMMARY
======================================================================
Total Expired Sessions: 5
Total Inactive Sessions: 3
Action: Cleaned up 5 sessions
======================================================================
```

## API Endpoints

### Get Active Sessions
```http
GET /api/v1/user-sessions/active?inactivity_minutes=30
```
Returns sessions dengan `logout_at = NULL` dan `last_activity` dalam X menit terakhir.

### Heartbeat
```http
POST /api/v1/user-sessions/heartbeat
Body: { "session_id": "xxx" }
```
Update `last_activity` timestamp untuk session.

### Cleanup Expired
```http
POST /api/v1/user-sessions/cleanup-expired?expiry_hours=24
```
Manual trigger cleanup (Admin only).

## Database Schema

```sql
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    session_id UUID UNIQUE NOT NULL,
    id_pegawai VARCHAR(50) REFERENCES pegawai(id_pegawai),
    login_at TIMESTAMPTZ DEFAULT NOW(),
    logout_at TIMESTAMPTZ,                    -- NULL = masih login
    last_activity TIMESTAMPTZ DEFAULT NOW(),  -- Update by heartbeat
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address INET,
    login_status VARCHAR(20)
);
```

## Monitoring & Logs

### Application Logs

```
[Scheduler] Started - Session cleanup will run every 60 minutes
[Scheduler] Sessions idle > 24 hours will be auto-logged out
[Session Cleanup] Cleaned up 3 expired sessions (idle > 24h)
[Heartbeat] Session activity updated at 10:30:45
```

### Console Logs (Frontend)

```
[Heartbeat] Started with 5 minute interval
[Heartbeat] Session activity updated at 10:30:45
[Heartbeat] Session invalid, stopping heartbeat
```

## Testing

### Test Auto-Cleanup

1. **Change expiry to 1 minute** (for testing):
```bash
# .env
SESSION_EXPIRY_HOURS=0.0167  # 1 minute = 1/60 hour
SESSION_CLEANUP_INTERVAL_MINUTES=1  # Run every 1 minute
```

2. **Restart backend**
3. **Login dan close browser**
4. **Wait 2 minutes**
5. **Check logs**: Should see cleanup message

### Test Status Display

1. **Login user A** → Status: 🟢 Active (0m)
2. **Wait 15 minutes** → Status: 🟢 Active (15m)
3. **Wait 35 minutes** → Status: 🟡 Idle (35m)
4. **Wait 24 hours** → Status: ⚪ Logged Out

## Troubleshooting

### Sessions not being cleaned up

1. Check scheduler is running:
```python
# Backend logs should show:
[Scheduler] Started - Session cleanup will run every X minutes
```

2. Check environment variables:
```bash
echo $SESSION_EXPIRY_HOURS
echo $SESSION_CLEANUP_INTERVAL_MINUTES
```

3. Manual trigger:
```bash
python scripts/cleanup_sessions.py --force
```

### Heartbeat not working

1. Check client console:
```
[Heartbeat] Started with 5 minute interval
```

2. Check network tab for `/heartbeat` calls every 5 minutes

3. Check session_id in localStorage:
```javascript
localStorage.getItem('session_id')
```

### Status not updating

1. Refresh page to re-calculate status
2. Check `last_activity` timestamp in database
3. Verify `SESSION_ACTIVE_MINUTES` matches frontend threshold

## Best Practices

1. **Production Settings:**
   - `SESSION_ACTIVE_MINUTES`: 30 (reasonable timeout)
   - `SESSION_EXPIRY_HOURS`: 24 (1 day)
   - `SESSION_CLEANUP_INTERVAL_MINUTES`: 60 (1 hour)

2. **Development Settings:**
   - `SESSION_ACTIVE_MINUTES`: 5 (quick testing)
   - `SESSION_EXPIRY_HOURS`: 1 (1 hour)
   - `SESSION_CLEANUP_INTERVAL_MINUTES`: 10 (10 minutes)

3. **Monitoring:**
   - Check cleanup logs daily
   - Monitor active session count
   - Review idle sessions regularly

4. **Maintenance:**
   - Run manual cleanup during off-hours
   - Review expiry settings quarterly
   - Monitor database session table size

## Dependencies

### Backend
```
APScheduler==3.10.4  # Background task scheduler
```

### Frontend
- useSessionHeartbeat hook
- SessionMonitorPage component

## Migration Guide

Jika sudah ada database dengan sessions lama:

```bash
# Run manual cleanup untuk existing sessions
python scripts/cleanup_sessions.py --hours 24 --force

# Check hasilnya
python scripts/cleanup_sessions.py --dry-run
```

## Future Enhancements

- [ ] Email notification untuk admin saat banyak sessions expired
- [ ] Dashboard metrics untuk session analytics
- [ ] Configurable heartbeat interval di frontend
- [ ] Session persistence across server restarts
- [ ] Redis cache untuk active sessions

## References

- [APScheduler Documentation](https://apscheduler.readthedocs.io/)
- [Session Management Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
