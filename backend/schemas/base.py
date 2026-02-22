"""
Base Schema Classes untuk Pydantic
Provide common configuration untuk semua schemas
"""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class BaseSchema(BaseModel):
    """
    Base schema configuration
    """
    model_config = ConfigDict(
        from_attributes=True,  # Allow ORM mode (from_orm)
        populate_by_name=True,  # Allow field population by name
        use_enum_values=True,  # Use enum values instead of enum objects
        validate_assignment=True,  # Validate on assignment
        str_strip_whitespace=True,  # Strip whitespace from strings
    )


class TimestampSchema(BaseSchema):
    """
    Schema dengan timestamp fields
    """
    created_at: datetime
    updated_at: datetime


class BaseResponseSchema(TimestampSchema):
    """
    Base response schema dengan id dan timestamps
    """
    id: int


class PaginationParams(BaseSchema):
    """
    Query parameters untuk pagination
    """
    page: int = 1
    limit: int = 10
    
    @property
    def offset(self) -> int:
        """Calculate offset from page and limit"""
        return (self.page - 1) * self.limit
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "page": 1,
                "limit": 10
            }
        }
    )


class SearchParams(BaseSchema):
    """
    Query parameters untuk search
    """
    search: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = "asc"  # asc or desc
