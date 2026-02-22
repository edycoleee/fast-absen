"""
User Repository
Database operations for User model
"""
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from models.user import User
from models.role import Role
from repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """User repository"""
    
    def __init__(self, db: Session):
        super().__init__(User, db)
    
    def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        return self.db.query(User).filter(User.username == username).first()
    
    def get_with_roles(self, user_id: int) -> Optional[User]:
        """Get user with roles eager loaded"""
        return (
            self.db.query(User)
            .options(
                joinedload(User.roles).joinedload(Role.permissions),
                joinedload(User.pegawai),
            )
            .filter(User.id == user_id)
            .first()
        )
    
    def get_all_with_roles(self, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all users with roles"""
        return (
            self.db.query(User)
            .options(joinedload(User.roles), joinedload(User.pegawai))
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def add_role(self, user: User, role: Role) -> User:
        """Add role to user"""
        if role not in user.roles:
            user.roles.append(role)
            self.db.commit()
            self.db.refresh(user)
        return user
    
    def remove_role(self, user: User, role: Role) -> User:
        """Remove role from user"""
        if role in user.roles:
            user.roles.remove(role)
            self.db.commit()
            self.db.refresh(user)
        return user
    
    def set_roles(self, user: User, roles: List[Role]) -> User:
        """Set user roles (replace all existing roles)"""
        user.roles = roles
        self.db.commit()
        self.db.refresh(user)
        return user
