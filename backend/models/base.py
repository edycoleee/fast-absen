"""
Base Model Classes untuk SQLAlchemy
Provide common fields dan methods untuk semua models
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, DateTime, Boolean
from sqlalchemy.ext.declarative import declared_attr
from config.database import Base


class TimestampMixin:
    """
    Mixin untuk add created_at dan updated_at timestamps
    """
    @declared_attr
    def created_at(cls):
        return Column(DateTime, default=datetime.now, nullable=False)
    
    @declared_attr
    def updated_at(cls):
        return Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)


class SoftDeleteMixin:
    """
    Mixin untuk soft delete functionality
    """
    @declared_attr
    def is_deleted(cls):
        return Column(Boolean, default=False, nullable=False)
    
    @declared_attr
    def deleted_at(cls):
        return Column(DateTime, nullable=True)
    
    def soft_delete(self):
        """Mark record as deleted"""
        self.is_deleted = True
        self.deleted_at = datetime.now(timezone.utc)
    
    def restore(self):
        """Restore soft-deleted record"""
        self.is_deleted = False
        self.deleted_at = None


class BaseModel(Base, TimestampMixin):
    """
    Base model dengan common fields
    Semua models sebaiknya inherit dari class ini
    
    Provides:
    - id (primary key)
    - created_at
    - updated_at
    - to_dict() method
    """
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    def to_dict(self):
        """
        Convert model instance to dictionary
        
        Returns:
            Dictionary representation of model
        """
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            # Convert datetime to ISO string
            if isinstance(value, datetime):
                value = value.isoformat()
            result[column.name] = value
        return result
    
    def update_from_dict(self, data: dict):
        """
        Update model fields from dictionary
        
        Args:
            data: Dictionary with field values
        """
        for key, value in data.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def __repr__(self):
        """String representation"""
        return f"<{self.__class__.__name__}(id={self.id})>"


class BaseModelWithSoftDelete(BaseModel, SoftDeleteMixin):
    """
    Base model dengan soft delete support
    """
    __abstract__ = True
