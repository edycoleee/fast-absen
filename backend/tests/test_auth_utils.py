"""
Unit tests for authentication utilities
"""
import pytest
from utils.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token
)
from datetime import timedelta


class TestPasswordHashing:
    """Test password hashing functions"""
    
    def test_hash_password(self):
        """Test password hashing"""
        password = "test123"
        hashed = get_password_hash(password)
        
        assert hashed is not None
        assert hashed != password
        assert len(hashed) > 20
    
    def test_verify_password_correct(self):
        """Test password verification with correct password"""
        password = "test123"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed) is True
    
    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password"""
        password = "test123"
        wrong_password = "wrong123"
        hashed = get_password_hash(password)
        
        assert verify_password(wrong_password, hashed) is False


class TestJWTToken:
    """Test JWT token functions"""
    
    def test_create_access_token(self):
        """Test JWT token creation"""
        data = {"user_id": 1, "username": "test", "roles": ["admin"]}
        token = create_access_token(data)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 20
    
    def test_create_access_token_with_expiration(self):
        """Test JWT token creation with custom expiration"""
        data = {"user_id": 1, "username": "test", "roles": ["admin"]}
        expires_delta = timedelta(minutes=60)
        token = create_access_token(data, expires_delta=expires_delta)
        
        assert token is not None
        assert isinstance(token, str)
    
    def test_decode_access_token_valid(self):
        """Test decoding valid JWT token"""
        data = {"user_id": 1, "username": "test", "roles": ["admin"]}
        token = create_access_token(data)
        
        decoded = decode_access_token(token)
        
        assert decoded is not None
        assert decoded["user_id"] == 1
        assert decoded["username"] == "test"
        assert decoded["roles"] == ["admin"]
    
    def test_decode_access_token_invalid(self):
        """Test decoding invalid JWT token"""
        invalid_token = "invalid.token.here"
        decoded = decode_access_token(invalid_token)
        
        assert decoded is None
    
    def test_decode_access_token_expired(self):
        """Test decoding expired JWT token"""
        data = {"user_id": 1, "username": "test", "roles": ["admin"]}
        # Create token with negative expiration (already expired)
        expires_delta = timedelta(minutes=-1)
        token = create_access_token(data, expires_delta=expires_delta)
        
        decoded = decode_access_token(token)
        
        assert decoded is None
