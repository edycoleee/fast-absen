#!/usr/bin/env python3
"""
Reset password untuk user menggunakan backend password hasher
Requires: pip install passlib bcrypt (or use backend venv)
"""
import sys

# Use backend virtual environment
sys.path.insert(0, '/home/sultan/fast-absen/backend/.venv/lib/python3.11/site-packages')

try:
    from passlib.context import CryptContext
    
    # Same configuration as backend
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Password to hash
    password = "admin123"  # min 6 karakter (backend requirement)
    
    # Generate hash using passlib (same as backend)
    password_hash = pwd_context.hash(password)
    
    print(f"Password: {password}")
    print(f"Hash: {password_hash}")
    print()
    print("SQL to update:")
    print(f"UPDATE users SET password_hash = '{password_hash}' WHERE username = 'sultan';")
    
except ImportError as e:
    print("Error: passlib not found")
    print("Run script from backend directory with venv activated:")
    print("  cd /home/sultan/fast-absen/backend")
    print("  source .venv/bin/activate")
    print("  python3 ../database/generate_password_hash.py")
    sys.exit(1)
