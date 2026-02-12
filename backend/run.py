"""
Run FastAPI application dengan Uvicorn
"""
import uvicorn
from config.settings import settings

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload saat development
        log_level="info"
    )
