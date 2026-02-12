"""
Standard response utilities untuk FastAPI

Best Practice:
- Single resource: data sebagai object
- Multiple resources: data sebagai object dengan property 'items'
- Paginated: menggunakan dedicated paginated_response()

Ini memastikan 'data' SELALU berupa object (konsisten).
"""
from typing import Any, Optional, Dict, List, Union
from pydantic import BaseModel


class StandardResponse(BaseModel):
    """Standard response model"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


class PaginationMeta(BaseModel):
    """Pagination metadata"""
    page: int
    limit: int
    total: int
    total_pages: int


class PaginatedResponse(BaseModel):
    """Paginated response model"""
    success: bool
    message: str
    data: Dict[str, Any]  # Always object dengan 'items' property
    meta: PaginationMeta


def success_response(
    message: str = "Success",
    data: Any = None,
    status_code: int = 200
) -> Dict[str, Any]:
    """
    Create standard success response
    
    Args:
        message: Success message
        data: Response data
        status_code: HTTP status code (not used, for compatibility)
    
    Returns:
        Dictionary with success response format
    
    Example:
        return success_response("Data retrieved", data=result)
    """
    return {
        "success": True,
        "message": message,
        "data": data if data is not None else {}
    }


def error_response(
    message: str = "Error",
    data: Any = None,
    status_code: int = 400
) -> Dict[str, Any]:
    """
    Create standard error response
    
    Args:
        message: Error message
        data: Additional error data
        status_code: HTTP status code (not used, for compatibility)
    
    Returns:
        Dictionary with error response format
    
    Example:
        return error_response("Validation failed", data={"field": "error"})
    """
    return {
        "success": False,
        "message": message,
        "data": data if data is not None else {}
    }


def list_response(
    message: str = "Success",
    items: list = None,
    total: int = None
) -> Dict[str, Any]:
    """
    Create list response (non-paginated collection)
    
    Args:
        message: Success message
        items: List of items
        total: Total items count (optional)
    
    Returns:
        Dictionary with list response format
    
    Example:
        return list_response(
            "Lokasi retrieved",
            items=lokasi_list,
            total=10
        )
    
    Response:
        {
            "success": true,
            "message": "Lokasi retrieved",
            "data": {
                "items": [...],
                "total": 10
            }
        }
    """
    response_data = {
        "items": items if items is not None else []
    }
    
    if total is not None:
        response_data["total"] = total
    
    return {
        "success": True,
        "message": message,
        "data": response_data
    }


def paginated_response(
    message: str = "Success",
    items: list = None,
    page: int = 1,
    limit: int = 10,
    total: int = 0
) -> Dict[str, Any]:
    """
    Create paginated response
    
    Args:
        message: Success message
        items: List of items
        page: Current page
        limit: Items per page
        total: Total items count
    
    Returns:
        Dictionary with paginated response format
    
    Example:
        return paginated_response(
            "Lokasi retrieved",
            items=lokasi_list,
            page=1,
            limit=10,
            total=50
        )
    
    Response:
        {
            "success": true,
            "message": "Lokasi retrieved",
            "data": {
                "items": [...],
                "page": 1,
                "limit": 10,
                "total": 50,
                "totalPages": 5
            }
        }
    """
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    
    return {
        "success": True,
        "message": message,
        "data": {
            "items": items if items is not None else [],
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": total_pages
        }
    }
