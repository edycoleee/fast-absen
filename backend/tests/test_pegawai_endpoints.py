"""
Unit tests for pegawai endpoints
"""
import pytest
import io
from PIL import Image
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def _make_test_jpeg() -> io.BytesIO:
    buffer = io.BytesIO()
    image = Image.new("RGB", (10, 10), color=(255, 0, 0))
    image.save(buffer, format="JPEG")
    buffer.seek(0)
    return buffer


@pytest.mark.pegawai
class TestGetPegawai:
    """Test GET /pegawai/ endpoint"""
    
    def test_get_pegawai_as_admin(
        self, 
        client: TestClient, 
        db_with_data: Session, 
        auth_headers_admin: dict
    ):
        """Test getting pegawai list as admin"""
        response = client.get("/api/v1/pegawai/", headers=auth_headers_admin)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "items" in data["data"]
        assert "total" in data["data"]
        assert data["data"]["skip"] == 0
    
    def test_get_pegawai_with_pagination(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test getting pegawai with pagination parameters"""
        response = client.get(
            "/api/v1/pegawai/?skip=0&limit=5",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["skip"] == 0
        assert data["data"]["limit"] == 5
    
    def test_get_pegawai_as_user_forbidden(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test getting pegawai list as regular user (should be forbidden)"""
        response = client.get("/api/v1/pegawai/", headers=auth_headers_user)
        
        assert response.status_code == 403  # Forbidden
    
    def test_get_pegawai_without_auth(self, client: TestClient, db_with_data: Session):
        """Test getting pegawai without authentication"""
        response = client.get("/api/v1/pegawai/")
        
        assert response.status_code == 403  # No auth token


@pytest.mark.pegawai
class TestCreatePegawai:
    """Test POST /pegawai/ endpoint"""
    
    def test_create_pegawai_as_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test creating a new pegawai as admin"""
        new_pegawai = {
            "id_pegawai": "P001",
            "nip": "123456789",
            "nama": "John Doe",
            "jenis_kelamin": "L",
            "tempat_lahir": "Jakarta",
            "tanggal_lahir": "1990-01-01",
            "alamat": "Jl. Test No. 123",
            "status": "Aktif"
        }
        
        response = client.post(
            "/api/v1/pegawai/",
            data=new_pegawai,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["success"] is True
        assert data["data"]["id_pegawai"] == "P001"
        assert data["data"]["nama"] == "John Doe"
        assert data["data"]["nip"] == "123456789"
    
    def test_create_pegawai_with_photo(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test creating pegawai with photo upload"""
        fake_image = _make_test_jpeg()
        
        new_pegawai = {
            "id_pegawai": "P002",
            "nama": "Jane Doe",
            "jenis_kelamin": "P"
        }
        
        files = {
            "foto": ("test.jpg", fake_image, "image/jpeg")
        }
        
        response = client.post(
            "/api/v1/pegawai/",
            data=new_pegawai,
            files=files,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["success"] is True
        assert data["data"]["id_pegawai"] == "P002"
        assert data["data"]["foto"] is not None
    
    def test_create_pegawai_duplicate_id(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test creating pegawai with duplicate ID"""
        # Create first pegawai
        pegawai1 = {
            "id_pegawai": "P003",
            "nama": "Test User"
        }
        client.post("/api/v1/pegawai/", data=pegawai1, headers=auth_headers_admin)
        
        # Try to create duplicate
        pegawai2 = {
            "id_pegawai": "P003",
            "nama": "Another User"
        }
        
        response = client.post(
            "/api/v1/pegawai/",
            data=pegawai2,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 400
        error_text = (response.json().get("detail") or response.json().get("message") or "").lower()
        assert "already exists" in error_text
    
    def test_create_pegawai_duplicate_nip(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test creating pegawai with duplicate NIP"""
        # Create first pegawai
        pegawai1 = {
            "id_pegawai": "P004",
            "nip": "999888777",
            "nama": "Test User"
        }
        client.post("/api/v1/pegawai/", data=pegawai1, headers=auth_headers_admin)
        
        # Try to create with duplicate NIP
        pegawai2 = {
            "id_pegawai": "P005",
            "nip": "999888777",
            "nama": "Another User"
        }
        
        response = client.post(
            "/api/v1/pegawai/",
            data=pegawai2,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 400
        error_text = (response.json().get("detail") or response.json().get("message") or "").lower()
        assert "nip" in error_text
    
    def test_create_pegawai_as_user_forbidden(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test creating pegawai as regular user (should be forbidden)"""
        new_pegawai = {
            "id_pegawai": "P006",
            "nama": "Test User"
        }
        
        response = client.post(
            "/api/v1/pegawai/",
            data=new_pegawai,
            headers=auth_headers_user
        )
        
        assert response.status_code == 403


@pytest.mark.pegawai
class TestGetPegawaiById:
    """Test GET /pegawai/{pegawai_id} endpoint"""
    
    def test_get_pegawai_by_id_as_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test getting pegawai by ID as admin"""
        # Create a pegawai first
        new_pegawai = {
            "id_pegawai": "P007",
            "nama": "Test Employee"
        }
        create_response = client.post(
            "/api/v1/pegawai/",
            data=new_pegawai,
            headers=auth_headers_admin
        )
        pegawai_id = create_response.json()["data"]["id_pegawai"]
        
        # Get specific pegawai
        response = client.get(f"/api/v1/pegawai/{pegawai_id}", headers=auth_headers_admin)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["data"]["id_pegawai"] == pegawai_id
    
    def test_get_pegawai_not_found(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test getting non-existent pegawai"""
        response = client.get("/api/v1/pegawai/NOTEXIST", headers=auth_headers_admin)
        
        assert response.status_code == 404
    
    def test_get_pegawai_by_id_as_user_forbidden(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test getting pegawai by ID as regular user (should be forbidden)"""
        response = client.get("/api/v1/pegawai/P001", headers=auth_headers_user)
        
        assert response.status_code == 403


@pytest.mark.pegawai
class TestUpdatePegawai:
    """Test PUT /pegawai/{pegawai_id} endpoint"""
    
    def test_update_pegawai_as_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test updating pegawai as admin"""
        # Create a pegawai first
        new_pegawai = {
            "id_pegawai": "P008",
            "nama": "Original Name"
        }
        create_response = client.post(
            "/api/v1/pegawai/",
            data=new_pegawai,
            headers=auth_headers_admin
        )
        pegawai_id = create_response.json()["data"]["id_pegawai"]
        
        # Update the pegawai
        update_data = {
            "nama": "Updated Name",
            "status": "Aktif"
        }
        response = client.put(
            f"/api/v1/pegawai/{pegawai_id}",
            data=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["data"]["nama"] == "Updated Name"
        assert data["data"]["status"] == "Aktif"
    
    def test_update_pegawai_with_photo(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test updating pegawai with new photo"""
        # Create a pegawai first
        new_pegawai = {
            "id_pegawai": "P009",
            "nama": "Test Employee"
        }
        create_response = client.post(
            "/api/v1/pegawai/",
            data=new_pegawai,
            headers=auth_headers_admin
        )
        pegawai_id = create_response.json()["data"]["id_pegawai"]
        
        # Update with photo
        fake_image = _make_test_jpeg()
        update_data = {
            "nama": "Updated Name"
        }
        files = {
            "foto": ("updated.jpg", fake_image, "image/jpeg")
        }
        
        response = client.put(
            f"/api/v1/pegawai/{pegawai_id}",
            data=update_data,
            files=files,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["data"]["foto"] is not None
    
    def test_update_pegawai_not_found(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test updating non-existent pegawai"""
        update_data = {"nama": "New Name"}
        response = client.put(
            "/api/v1/pegawai/NOTEXIST",
            data=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 404
    
    def test_update_pegawai_as_user_forbidden(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test updating pegawai as regular user (should be forbidden)"""
        update_data = {"nama": "New Name"}
        response = client.put(
            "/api/v1/pegawai/P001",
            data=update_data,
            headers=auth_headers_user
        )
        
        assert response.status_code == 403


@pytest.mark.pegawai
class TestDeletePegawai:
    """Test DELETE /pegawai/{pegawai_id} endpoint"""
    
    def test_delete_pegawai_as_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test deleting pegawai as admin"""
        # Create a pegawai first
        new_pegawai = {
            "id_pegawai": "P010",
            "nama": "To Delete"
        }
        create_response = client.post(
            "/api/v1/pegawai/",
            data=new_pegawai,
            headers=auth_headers_admin
        )
        pegawai_id = create_response.json()["data"]["id_pegawai"]
        
        # Delete the pegawai
        response = client.delete(
            f"/api/v1/pegawai/{pegawai_id}",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "deleted" in data["message"].lower()
        
        # Verify pegawai is deleted
        get_response = client.get(f"/api/v1/pegawai/{pegawai_id}", headers=auth_headers_admin)
        assert get_response.status_code == 404
    
    def test_delete_pegawai_not_found(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test deleting non-existent pegawai"""
        response = client.delete("/api/v1/pegawai/NOTEXIST", headers=auth_headers_admin)
        
        assert response.status_code == 404
    
    def test_delete_pegawai_as_user_forbidden(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test deleting pegawai as regular user (should be forbidden)"""
        response = client.delete("/api/v1/pegawai/P001", headers=auth_headers_user)
        
        assert response.status_code == 403


@pytest.mark.pegawai
class TestSearchPegawai:
    """Test GET /pegawai/?search= endpoint"""
    
    def test_search_pegawai_by_name(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test searching pegawai by name"""
        # Create test pegawai
        pegawai1 = {
            "id_pegawai": "P011",
            "nama": "Ahmad Suryanto"
        }
        pegawai2 = {
            "id_pegawai": "P012",
            "nama": "Budi Santoso"
        }
        client.post("/api/v1/pegawai/", data=pegawai1, headers=auth_headers_admin)
        client.post("/api/v1/pegawai/", data=pegawai2, headers=auth_headers_admin)
        
        # Search by name
        response = client.get(
            "/api/v1/pegawai/?search=Ahmad",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert len(data["data"]["items"]) >= 1
        assert data["data"]["search"] == "Ahmad"
    
    def test_search_pegawai_by_nip(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test searching pegawai by NIP"""
        # Create test pegawai
        pegawai = {
            "id_pegawai": "P013",
            "nip": "111222333",
            "nama": "Test Employee"
        }
        client.post("/api/v1/pegawai/", data=pegawai, headers=auth_headers_admin)
        
        # Search by NIP
        response = client.get(
            "/api/v1/pegawai/?search=111222",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert len(data["data"]["items"]) >= 1
