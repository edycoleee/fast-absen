"""
Exception handlers untuk FastAPI
With production-safe error messages
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from config.settings import settings
from utils.logger import logger
from utils.response import error_response


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Handle HTTP exceptions
    
    Args:
        request: FastAPI request
        exc: HTTP exception
    
    Returns:
        JSONResponse with error details
    """
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.warning(
        f"[{request_id}] HTTP Exception: {exc.status_code} - {exc.detail} "
        f"Path: {request.url.path}"
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(
            message=exc.detail,
            status_code=exc.status_code
        )
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle validation errors from Pydantic
    
    Args:
        request: FastAPI request
        exc: Validation error
    
    Returns:
        JSONResponse with validation error details
    """
    errors = exc.errors()
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.warning(
        f"[{request_id}] Validation Error: {request.url.path} "
        f"Errors: {errors}"
    )
    
    # Format validation errors
    formatted_errors = []
    for error in errors:
        formatted_errors.append({
            "field": " -> ".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response(
            message="Validation error",
            data={"errors": formatted_errors},
            status_code=422
        )
    )


async def general_exception_handler(request: Request, exc: Exception):
    """
    Handle all unhandled exceptions
    
    Args:
        request: FastAPI request
        exc: Exception
    
    Returns:
        JSONResponse with error details
    """
    request_id = getattr(request.state, "request_id", "unknown")
    
    logger.error(
        f"[{request_id}] Unhandled Exception: {request.url.path} "
        f"Error: {str(exc)}",
        exc_info=True
    )
    
    # In production, don't expose detailed error messages
    if settings.is_production:
        error_message = "Internal server error"
        error_data = {"request_id": request_id}
    else:
        # In development, show detailed error
        error_message = "Internal server error"
        error_data = {
            "error": str(exc),
            "type": type(exc).__name__,
            "request_id": request_id
        }
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response(
            message=error_message,
            data=error_data,
            status_code=500
        )
    )
