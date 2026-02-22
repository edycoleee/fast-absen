"""
Unit tests for authentication endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import text

from models.role import Role
from models.user import User
from models.pegawai import Pegawai
from models.permission import Permission
from models.unit import Unit
from utils.auth import get_password_hash


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
        assert "permissions" in data["data"]
        assert "menu_guard" in data["data"]
        assert data["data"]["menu_guard"]["menus"]["kpi_unit_role"]["endpoint"] == "/api/v1/stats/kpi/unit-role"
        assert data["data"]["menu_guard"]["menus"]["kpi_unit_role"]["allow_optional_unit_filter"] is True
    
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
        assert "permissions" in data["data"]
        assert data["data"]["menu_guard"]["menus"]["dashboard"]["visible"] is True

    def test_login_success_ka_unit_menu_guard_contract(self, client: TestClient, db_with_data: Session):
        db_with_data.add(Unit(id_unit=88, nama_unit="Unit Ka Test"))
        db_with_data.add(
            Pegawai(
                id_pegawai="PGW880",
                nip="19800101880000",
                nama="Ka Unit Test",
                id_unit=88,
                kepala_id_unit=88,
            )
        )
        ka_role = Role(name="ka-unit", description="Kepala Unit")
        db_with_data.add(ka_role)
        db_with_data.commit()

        needed_permissions = (
            db_with_data.query(Permission)
            .filter(Permission.name.in_([
                "user.login",
                "penilaian_shift_absensi.read",
                "absensi.read",
            ]))
            .all()
        )
        for perm in needed_permissions:
            db_with_data.execute(
                text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :permission_id)"),
                {"role_id": ka_role.id, "permission_id": perm.id},
            )

        db_with_data.add(
            User(
                id=88,
                id_pegawai="PGW880",
                username="kaunit",
                password_hash=get_password_hash("kaunit123"),
                is_active=True,
            )
        )
        db_with_data.commit()
        db_with_data.execute(
            text("INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, :role_id)"),
            {"user_id": 88, "role_id": ka_role.id},
        )
        db_with_data.commit()

        response = client.post(
            "/api/v1/auth/login",
            json={"username": "kaunit", "password": "kaunit123"}
        )

        assert response.status_code == 200
        data = response.json()
        menu_guard = data["data"]["menu_guard"]
        assert menu_guard["is_kepala_unit"] is True
        assert menu_guard["is_admin"] is False
        assert menu_guard["kepala_unit_scope_id"] == 88
        assert menu_guard["menus"]["kpi_unit_role"]["endpoint"] == "/api/v1/stats/kpi/unit-role/my-unit"
        assert menu_guard["menus"]["kpi_unit_role"]["force_my_unit_scope"] is True
        assert menu_guard["menus"]["kpi_unit_role"]["allow_optional_unit_filter"] is False
    
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
