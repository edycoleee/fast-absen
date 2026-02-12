"""
Permission Model
"""
from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from models.base import Base


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Relationships
    roles = relationship("Role", secondary="role_permissions", back_populates="permissions")
