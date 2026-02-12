"""
Unit tests for role endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.mark.role
class TestGetRoles:
    """Test GET /roles/ endpoint"""
    
    def test_get_roles_as_admin(
        self, 
        client: TestClient, 
        db_with_data: Session, 
        auth_headers_admin: dict
    ):
        """Test getting roles list as admin"""
        response = client.get("/api/v1/roles/", headers=auth_headers_admin)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "roles" in data["data"]
        assert len(data["data"]["roles"]) >= 2  # admin + user
        assert data["data"]["page"] == 1
    
    def test_get_roles_with_pagination(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test getting roles with pagination parameters"""
        response = client.get(
            "/api/v1/roles/?page=1&limit=5",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["page"] == 1
        assert data["data"]["limit"] == 5
    
    def test_get_roles_as_user_forbidden(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test getting roles list as regular user (should be forbidden)"""
        response = client.get("/api/v1/roles/", headers=auth_headers_user)
        
        assert response.status_code == 403  # Forbidden
    
    def test_get_roles_without_auth(self, client: TestClient, db_with_data: Session):
        """Test getting roles without authentication"""
        response = client.get("/api/v1/roles/")
        
        assert response.status_code == 403  # No auth token


@pytest.mark.role
class TestCreateRole:
    """Test POST /roles/ endpoint"""
    
    def test_create_role_as_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test creating a new role as admin"""
        new_role = {
            "name": "manager",
            "description": "Manager role",
            "permission_ids": []
        }
        
        response = client.post(
            "/api/v1/roles/",
            json=new_role,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["success"] is True
        assert data["data"]["name"] == "manager"
        assert data["data"]["description"] == "Manager role"
        assert "id" in data["data"]
    
    def test_create_role_duplicate_name(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test creating role with duplicate name"""
        new_role = {
            "name": "admin",  # Already exists
            "description": "Duplicate admin"
        }
        
        response = client.post(
            "/api/v1/roles/",
            json=new_role,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()
    
    def test_create_role_invalid_permission(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test creating role with non-existent permission ID"""
        new_role = {
            "name": "testRole",
            "description": "Test Role",
            "permission_ids": [999]  # Non-existent permission
        }
        
        response = client.post(
            "/api/v1/roles/",
            json=new_role,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 404
        assert "permission" in response.json()["detail"].lower()
    
    def test_create_role_as_user_forbidden(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test creating role as regular user (should be forbidden)"""
        new_role = {
            "name": "newrole",
            "description": "New Role"
        }
        
        response = client.post(
            "/api/v1/roles/",
            json=new_role,
            headers=auth_headers_user
        )
        
        assert response.status_code == 403
    
    def test_create_role_without_auth(
        self,
        client: TestClient,
        db_with_data: Session
    ):
        """Test creating role without authentication"""
        new_role = {
            "name": "newrole",
            "description": "New Role"
        }
        
        response = client.post("/api/v1/roles/", json=new_role)
        
        assert response.status_code == 403


@pytest.mark.role
class TestGetRoleById:
    """Test GET /roles/{role_id} endpoint"""
    
    def test_get_role_by_id_as_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test getting role by ID as admin"""
        # Get role list first to get valid ID
        list_response = client.get("/api/v1/roles/", headers=auth_headers_admin)
        roles = list_response.json()["data"]["roles"]
        role_id = roles[0]["id"]
        
        # Get specific role
        response = client.get(f"/api/v1/roles/{role_id}", headers=auth_headers_admin)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["data"]["id"] == role_id
        assert "name" in data["data"]
    
    def test_get_role_not_found(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test getting non-existent role"""
        response = client.get("/api/v1/roles/999", headers=auth_headers_admin)
        
        assert response.status_code == 404
    
    def test_get_role_by_id_as_user_forbidden(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test getting role by ID as regular user (should be forbidden)"""
        response = client.get("/api/v1/roles/1", headers=auth_headers_user)
        
        assert response.status_code == 403


@pytest.mark.role
class TestUpdateRole:
    """Test PUT /roles/{role_id} endpoint"""
    
    def test_update_role_as_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test updating role as admin"""
        # Create a test role first
        new_role = {
            "name": "testrole",
            "description": "Test role"
        }
        create_response = client.post(
            "/api/v1/roles/",
            json=new_role,
            headers=auth_headers_admin
        )
        role_id = create_response.json()["data"]["id"]
        
        # Update the role
        update_data = {
            "description": "Updated description"
        }
        response = client.put(
            f"/api/v1/roles/{role_id}",
            json=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["data"]["description"] == "Updated description"
        assert data["data"]["name"] == "testrole"  # Name unchanged
    
    def test_update_role_name(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test updating role name"""
        # Create a test role
        new_role = {
            "name": "oldrole",
            "description": "Old role"
        }
        create_response = client.post(
            "/api/v1/roles/",
            json=new_role,
            headers=auth_headers_admin
        )
        role_id = create_response.json()["data"]["id"]
        
        # Update the role name
        update_data = {"name": "newrole"}
        response = client.put(
            f"/api/v1/roles/{role_id}",
            json=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        assert response.json()["data"]["name"] == "newrole"
    
    def test_update_role_duplicate_name(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test updating role with duplicate name"""
        # Create a test role
        new_role = {
            "name": "uniquerole",
            "description": "Unique role"
        }
        create_response = client.post(
            "/api/v1/roles/",
            json=new_role,
            headers=auth_headers_admin
        )
        role_id = create_response.json()["data"]["id"]
        
        # Try to update to existing name
        update_data = {"name": "admin"}  # Already exists
        response = client.put(
            f"/api/v1/roles/{role_id}",
            json=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()
    
    def test_update_role_not_found(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test updating non-existent role"""
        update_data = {"description": "New description"}
        response = client.put(
            "/api/v1/roles/999",
            json=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 404
    
    def test_update_role_as_user_forbidden(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test updating role as regular user (should be forbidden)"""
        update_data = {"description": "New description"}
        response = client.put(
            "/api/v1/roles/1",
            json=update_data,
            headers=auth_headers_user
        )
        
        assert response.status_code == 403


@pytest.mark.role
class TestDeleteRole:
    """Test DELETE /roles/{role_id} endpoint"""
    
    def test_delete_role_as_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test deleting role as admin"""
        # Create a test role
        new_role = {
            "name": "deleterole",
            "description": "Role to delete"
        }
        create_response = client.post(
            "/api/v1/roles/",
            json=new_role,
            headers=auth_headers_admin
        )
        role_id = create_response.json()["data"]["id"]
        
        # Delete the role
        response = client.delete(
            f"/api/v1/roles/{role_id}",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "deleted" in data["message"].lower()
        
        # Verify role is deleted
        get_response = client.get(f"/api/v1/roles/{role_id}", headers=auth_headers_admin)
        assert get_response.status_code == 404
    
    def test_delete_system_role_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test deleting system role 'admin' (should fail)"""
        # Get admin role ID
        list_response = client.get("/api/v1/roles/", headers=auth_headers_admin)
        roles = list_response.json()["data"]["roles"]
        admin_role = next(r for r in roles if r["name"] == "admin")
        
        # Try to delete admin role
        response = client.delete(
            f"/api/v1/roles/{admin_role['id']}",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 400
        assert "system role" in response.json()["detail"].lower()
    
    def test_delete_system_role_user(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test deleting system role 'user' (should fail)"""
        # Get user role ID
        list_response = client.get("/api/v1/roles/", headers=auth_headers_admin)
        roles = list_response.json()["data"]["roles"]
        user_role = next(r for r in roles if r["name"] == "user")
        
        # Try to delete user role
        response = client.delete(
            f"/api/v1/roles/{user_role['id']}",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 400
        assert "system role" in response.json()["detail"].lower()
    
    def test_delete_role_not_found(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test deleting non-existent role"""
        response = client.delete("/api/v1/roles/999", headers=auth_headers_admin)
        
        assert response.status_code == 404
    
    def test_delete_role_as_user_forbidden(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test deleting role as regular user (should be forbidden)"""
        response = client.delete("/api/v1/roles/1", headers=auth_headers_user)
        
        assert response.status_code == 403
