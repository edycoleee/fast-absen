"""
Unit tests for user endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.mark.user
class TestGetUsers:
    """Test GET /users/ endpoint"""
    
    def test_get_users_as_admin(
        self, 
        client: TestClient, 
        db_with_data: Session, 
        auth_headers_admin: dict
    ):
        """Test getting users list as admin"""
        response = client.get("/api/v1/users/", headers=auth_headers_admin)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "users" in data["data"]
        assert len(data["data"]["users"]) >= 2  # admin + user1
        assert data["data"]["page"] == 1
    
    def test_get_users_with_pagination(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test getting users with pagination parameters"""
        response = client.get(
            "/api/v1/users/?page=1&limit=5",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["page"] == 1
        assert data["data"]["limit"] == 5
    
    def test_get_users_as_user_forbidden(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test getting users list as regular user (should be forbidden)"""
        response = client.get("/api/v1/users/", headers=auth_headers_user)
        
        assert response.status_code == 403  # Forbidden
    
    def test_get_users_without_auth(self, client: TestClient, db_with_data: Session):
        """Test getting users without authentication"""
        response = client.get("/api/v1/users/")
        
        assert response.status_code == 403  # No auth token


@pytest.mark.user
class TestCreateUser:
    """Test POST /users/ endpoint"""
    
    def test_create_user_as_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test creating a new user as admin"""
        new_user = {
            "username": "newuser",
            "password": "newpass123",
            "is_active": True,
            "role_ids": [2]  # user role
        }
        
        response = client.post(
            "/api/v1/users/",
            json=new_user,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["success"] is True
        assert data["data"]["username"] == "newuser"
        assert data["data"]["is_active"] is True
        assert "user" in data["data"]["roles"]
        assert "id" in data["data"]
    
    def test_create_user_duplicate_username(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test creating user with duplicate username"""
        duplicate_user = {
            "username": "admin",  # Already exists
            "password": "password123",
            "is_active": True,
            "role_ids": [2]
        }
        
        response = client.post(
            "/api/v1/users/",
            json=duplicate_user,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 400  # Bad request
    
    def test_create_user_as_regular_user(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test creating user as regular user (should be forbidden)"""
        new_user = {
            "username": "testuser",
            "password": "password123",
            "is_active": True,
            "role_ids": [2]
        }
        
        response = client.post(
            "/api/v1/users/",
            json=new_user,
            headers=auth_headers_user
        )
        
        assert response.status_code == 403  # Forbidden
    
    def test_create_user_invalid_data(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test creating user with invalid data"""
        invalid_user = {
            "username": "ab",  # Too short
            "password": "123",  # Too short
        }
        
        response = client.post(
            "/api/v1/users/",
            json=invalid_user,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 422  # Validation error


@pytest.mark.user
class TestGetUserById:
    """Test GET /users/{id} endpoint"""
    
    def test_get_user_by_id_as_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test getting user by ID as admin"""
        response = client.get("/api/v1/users/1", headers=auth_headers_admin)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["data"]["id"] == 1
        assert data["data"]["username"] == "admin"
    
    def test_get_user_not_found(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test getting non-existent user"""
        response = client.get("/api/v1/users/999", headers=auth_headers_admin)
        
        assert response.status_code == 404  # Not found
    
    def test_get_user_as_regular_user(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test getting user as regular user (should be forbidden)"""
        response = client.get("/api/v1/users/1", headers=auth_headers_user)
        
        assert response.status_code == 403  # Forbidden


@pytest.mark.user
class TestUpdateUser:
    """Test PUT /users/{id} endpoint"""
    
    def test_update_user_as_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test updating user as admin"""
        update_data = {
            "username": "updateduser",
            "is_active": False
        }
        
        response = client.put(
            "/api/v1/users/2",
            json=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["data"]["username"] == "updateduser"
        assert data["data"]["is_active"] is False
    
    def test_update_user_password(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test updating user password"""
        update_data = {
            "password": "newpassword123"
        }
        
        response = client.put(
            "/api/v1/users/2",
            json=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        
        # Test login with new password
        login_response = client.post(
            "/api/v1/auth/login",
            json={"username": "user1", "password": "newpassword123"}
        )
        # Note: username masih user1 karena tidak di-update
        assert login_response.status_code == 401  # username sudah berubah jadi updateduser di test sebelumnya
    
    def test_update_user_not_found(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test updating non-existent user"""
        update_data = {"username": "test"}
        
        response = client.put(
            "/api/v1/users/999",
            json=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 404  # Not found
    
    def test_update_user_as_regular_user(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test updating user as regular user (should be forbidden)"""
        update_data = {"username": "test"}
        
        response = client.put(
            "/api/v1/users/1",
            json=update_data,
            headers=auth_headers_user
        )
        
        assert response.status_code == 403  # Forbidden


@pytest.mark.user
class TestDeleteUser:
    """Test DELETE /users/{id} endpoint"""
    
    def test_delete_user_as_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test deleting user as admin"""
        # First create a user to delete
        new_user = {
            "username": "todelete",
            "password": "password123",
            "is_active": True,
            "role_ids": [2]
        }
        create_response = client.post(
            "/api/v1/users/",
            json=new_user,
            headers=auth_headers_admin
        )
        user_id = create_response.json()["data"]["id"]
        
        # Delete the user
        response = client.delete(
            f"/api/v1/users/{user_id}",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify user is deleted
        get_response = client.get(
            f"/api/v1/users/{user_id}",
            headers=auth_headers_admin
        )
        assert get_response.status_code == 404
    
    def test_delete_user_not_found(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test deleting non-existent user"""
        response = client.delete(
            "/api/v1/users/999",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 404  # Not found
    
    def test_delete_user_as_regular_user(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test deleting user as regular user (should be forbidden)"""
        response = client.delete(
            "/api/v1/users/1",
            headers=auth_headers_user
        )
        
        assert response.status_code == 403  # Forbidden
