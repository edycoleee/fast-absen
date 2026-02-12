"""
Unit tests for user repository
"""
import pytest
from sqlalchemy.orm import Session
from models.user import User
from models.role import Role
from repositories.user_repository import UserRepository
from utils.auth import get_password_hash


@pytest.mark.unit
class TestUserRepository:
    """Test UserRepository methods"""
    
    def test_get_by_username(self, db_with_data: Session):
        """Test getting user by username"""
        repo = UserRepository(db_with_data)
        
        user = repo.get_by_username("admin")
        
        assert user is not None
        assert user.username == "admin"
        assert user.id == 1
    
    def test_get_by_username_not_found(self, db_with_data: Session):
        """Test getting non-existent user by username"""
        repo = UserRepository(db_with_data)
        
        user = repo.get_by_username("nonexistent")
        
        assert user is None
    
    def test_get_with_roles(self, db_with_data: Session):
        """Test getting user with roles loaded"""
        repo = UserRepository(db_with_data)
        
        user = repo.get_with_roles(1)
        
        assert user is not None
        assert len(user.roles) > 0
        assert user.roles[0].name == "admin"
    
    def test_get_all_with_roles(self, db_with_data: Session):
        """Test getting all users with roles"""
        repo = UserRepository(db_with_data)
        
        users = repo.get_all_with_roles(skip=0, limit=10)
        
        assert len(users) >= 2
        assert all(hasattr(user, 'roles') for user in users)
    
    def test_create_user(self, db_with_data: Session):
        """Test creating a new user"""
        repo = UserRepository(db_with_data)
        
        new_user = User(
            username="testuser",
            password_hash=get_password_hash("test123"),
            is_active=True
        )
        
        created = repo.create(new_user)
        
        assert created.id is not None
        assert created.username == "testuser"
        assert created.is_active is True
    
    def test_update_user(self, db_with_data: Session):
        """Test updating user"""
        repo = UserRepository(db_with_data)
        
        updated = repo.update(1, {"username": "updated_admin"})
        
        assert updated.username == "updated_admin"
    
    def test_delete_user(self, db_with_data: Session):
        """Test deleting user"""
        repo = UserRepository(db_with_data)
        
        # Create a user to delete
        user = User(
            username="todelete",
            password_hash=get_password_hash("test"),
            is_active=True
        )
        created = repo.create(user)
        user_id = created.id
        
        # Delete
        repo.delete(user_id)
        
        # Verify deleted
        deleted_user = repo.get_by_id(user_id)
        assert deleted_user is None
    
    def test_add_role_to_user(self, db_with_data: Session):
        """Test adding role to user"""
        repo = UserRepository(db_with_data)
        
        user = repo.get_by_id(1)
        role = db_with_data.query(Role).filter(Role.name == "user").first()
        
        updated_user = repo.add_role(user, role)
        
        assert len(updated_user.roles) >= 1
    
    def test_set_roles(self, db_with_data: Session):
        """Test setting user roles"""
        repo = UserRepository(db_with_data)
        
        user = repo.get_by_id(2)  # user1
        admin_role = db_with_data.query(Role).filter(Role.name == "admin").first()
        
        updated_user = repo.set_roles(user, [admin_role])
        
        # Refresh to get updated roles
        user_refreshed = repo.get_with_roles(2)
        assert len(user_refreshed.roles) == 1
        assert user_refreshed.roles[0].name == "admin"
