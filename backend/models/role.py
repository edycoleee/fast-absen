"""
Role Model
"""
from sqlalchemy import Boolean, Column, Integer, String, Text
from sqlalchemy.orm import relationship
from models.base import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_admin = Column(Boolean, nullable=False, default=False, server_default='false')

    # Relationships
    permissions = relationship("Permission", secondary="role_permissions", back_populates="roles")
    users = relationship("User", secondary="user_roles", back_populates="roles")
