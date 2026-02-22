"""
Pytest Configuration and Fixtures
"""
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from main import app
from models.base import Base
from models import Role, Permission, User, Pegawai
from config.database import get_db
from utils.auth import get_password_hash
from utils.permission_registry import PERMISSIONS

# Test database URL (SQLite in-memory untuk testing)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

# Create test engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Create test session
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """
    Create a fresh database for each test
    """
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    session = TestingSessionLocal()
    
    try:
        yield session
    finally:
        session.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    """
    Create a test client with database session override
    """
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def db_with_data(db: Session) -> Session:
    """
    Database with initial test data (roles, permissions, users)
    """
    # Create roles
    admin_role = Role(id=1, name="admin", description="Administrator role")
    user_role = Role(id=2, name="user", description="Regular user role")
    super_admin_role = Role(id=3, name="super-admin", description="Super Administrator role")
    db.add(admin_role)
    db.add(user_role)
    db.add(super_admin_role)
    
    # Create permissions
    permissions = [
        Permission(id=index, name=name, description=description)
        for index, (name, description) in enumerate(PERMISSIONS.items(), start=1)
    ]
    for perm in permissions:
        db.add(perm)
    
    db.commit()
    
    # Assign all permissions to admin and super-admin
    db.execute(
        text("INSERT INTO role_permissions (role_id, permission_id) SELECT 1, id FROM permissions")
    )
    db.execute(
        text("INSERT INTO role_permissions (role_id, permission_id) SELECT 3, id FROM permissions")
    )
    
    # Assign user permissions needed for check-in/check-out flow
    db.execute(
        text(
            """
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT 2, id FROM permissions
            WHERE name IN (
                'user.login',
                'absensi.create',
                'absensi.read',
                'absensi.update',
                'user_sessions.create'
            )
            """
        )
    )
    
    db.commit()

    # Create pegawai records (required by auth session tracking)
    admin_pegawai = Pegawai(
        id_pegawai="PGW001",
        nip="19800101000001",
        nama="Admin Test"
    )
    user_pegawai = Pegawai(
        id_pegawai="PGW002",
        nip="19800101000002",
        nama="User Test"
    )
    db.add(admin_pegawai)
    db.add(user_pegawai)
    db.commit()
    
    # Create admin user
    admin_user = User(
        id=1,
        id_pegawai="PGW001",
        username="admin",
        password_hash=get_password_hash("admin123"),
        is_active=True
    )
    db.add(admin_user)
    db.commit()
    
    # Assign admin + super-admin role
    db.execute(text("INSERT INTO user_roles (user_id, role_id) VALUES (1, 1)"))
    db.execute(text("INSERT INTO user_roles (user_id, role_id) VALUES (1, 3)"))
    db.commit()
    
    # Create regular user
    regular_user = User(
        id=2,
        id_pegawai="PGW002",
        username="user1",
        password_hash=get_password_hash("user123"),
        is_active=True
    )
    db.add(regular_user)
    db.commit()
    
    # Assign user role
    db.execute(text("INSERT INTO user_roles (user_id, role_id) VALUES (2, 2)"))
    db.commit()
    
    return db


@pytest.fixture(scope="function")
def admin_token(client: TestClient, db_with_data: Session) -> str:
    """
    Get admin JWT token for testing protected endpoints
    """
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    return data["data"]["access_token"]


@pytest.fixture(scope="function")
def user_token(client: TestClient, db_with_data: Session) -> str:
    """
    Get regular user JWT token for testing protected endpoints
    """
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "user1", "password": "user123"}
    )
    assert response.status_code == 200
    data = response.json()
    return data["data"]["access_token"]


@pytest.fixture(scope="function")
def auth_headers_admin(admin_token: str) -> dict:
    """
    Authorization headers with admin token
    """
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="function")
def auth_headers_user(user_token: str) -> dict:
    """
    Authorization headers with user token
    """
    return {"Authorization": f"Bearer {user_token}"}
