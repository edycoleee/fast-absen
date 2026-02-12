"""
Unit tests for authentication endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.mark.auth
class TestAuthLogin:
    """Test authentication login endpoint"""
    
    def test_login_success_admin(self, client: TestClient, db_with_data: Session):
        """Test successful login with admin credentials"""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "data" in data
        assert "access_token" in data["data"]
        assert data["data"]["token_type"] == "bearer"
        assert data["data"]["username"] == "admin"
        assert "admin" in data["data"]["roles"]
    
    def test_login_success_user(self, client: TestClient, db_with_data: Session):
        """Test successful login with regular user credentials"""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "user1", "password": "user123"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["data"]["username"] == "user1"
        assert "user" in data["data"]["roles"]
    
    def test_login_invalid_username(self, client: TestClient, db_with_data: Session):
        """Test login with invalid username"""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "nonexistent", "password": "password"}
        )
        
        assert response.status_code == 401
        data = response.json()
        assert data["success"] is False
    
    def test_login_invalid_password(self, client: TestClient, db_with_data: Session):
        """Test login with invalid password"""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "wrongpassword"}
        )
        
        assert response.status_code == 401
        data = response.json()
        assert data["success"] is False
    
    def test_login_missing_username(self, client: TestClient, db_with_data: Session):
        """Test login with missing username"""
        response = client.post(
            "/api/v1/auth/login",
            json={"password": "admin123"}
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_login_missing_password(self, client: TestClient, db_with_data: Session):
        """Test login with missing password"""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin"}
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_login_short_username(self, client: TestClient, db_with_data: Session):
        """Test login with username too short"""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "ab", "password": "password"}
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_login_short_password(self, client: TestClient, db_with_data: Session):
        """Test login with password too short"""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "12345"}
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_login_empty_credentials(self, client: TestClient, db_with_data: Session):
        """Test login with empty credentials"""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "", "password": ""}
        )
        
        assert response.status_code == 422  # Validation error
