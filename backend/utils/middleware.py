"""
Middleware untuk logging requests dan request tracking di FastAPI
"""
import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from utils.logger import logger


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware untuk add unique request ID untuk tracking
    """
    
    async def dispatch(self, request: Request, call_next):
        """
        Add request ID to each request
        
        Args:
            request: FastAPI request object
            call_next: Next middleware/route handler
        
        Returns:
            Response object with X-Request-ID header
        """
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        
        # Store in request state for access in route handlers
        request.state.request_id = request_id
        
        # Process request
        response = await call_next(request)
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware untuk log semua HTTP requests
    """
    
    async def dispatch(self, request: Request, call_next):
        """
        Log request dan response
        
        Args:
            request: FastAPI request object
            call_next: Next middleware/route handler
        
        Returns:
            Response object
        """
        # Start timer
        start_time = time.time()
        
        # Get request ID (set by RequestIDMiddleware)
        request_id = getattr(request.state, "request_id", "unknown")
        
        # Log request
        logger.info(
            f"[{request_id}] Request: {request.method} {request.url.path} "
            f"from {request.client.host if request.client else 'unknown'}"
        )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate process time
            process_time = time.time() - start_time
            
            # Log response
            logger.info(
                f"[{request_id}] Response: {request.method} {request.url.path} "
                f"Status: {response.status_code} "
                f"Time: {process_time:.3f}s"
            )
            
            # Add process time to response headers
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as e:
            # Log error
            process_time = time.time() - start_time
            logger.error(
                f"[{request_id}] Error: {request.method} {request.url.path} "
                f"Error: {str(e)} "
                f"Time: {process_time:.3f}s",
                exc_info=True
            )
            raise
