# Testing Guide

Panduan untuk menjalankan unit tests pada FastAPI Attendance System.

## 📦 Setup Testing Environment

### 1. Install Testing Dependencies

```bash
cd /home/sultan/fast-absen/backend
source venv/bin/activate
pip install -r requirements-test.txt
```

Dependencies yang diinstall:
- `pytest` - Testing framework
- `pytest-asyncio` - Async testing support
- `httpx` - HTTP client for TestClient
- `pytest-cov` - Coverage reporting
- `faker` - Generate fake data

### 2. Verify Installation

```bash
pytest --version
```

---

## 🧪 Running Tests

### Run All Tests

```bash
pytest
```

### Run with Verbose Output

```bash
pytest -v
```

### Run Specific Test File

```bash
# Test auth endpoints
pytest tests/test_auth_endpoints.py -v

# Test user endpoints
pytest tests/test_user_endpoints.py -v

# Test auth utilities
pytest tests/test_auth_utils.py -v

# Test repositories
pytest tests/test_user_repository.py -v

# Test evaluate engine (service)
pytest tests/test_penilaian_shift_absensi_service.py -v

# Test evaluate endpoint (auth + permission path)
pytest tests/test_penilaian_shift_absensi_endpoints.py -v
```

### Fast Path (Recommended for Daily Development)

Gunakan jalur cepat ini agar iterasi lebih singkat saat perubahan terkait auth/permission/evaluate:

```bash
# 1) Kompatibilitas auth + repository
pytest tests/test_auth_utils.py tests/test_user_repository.py -q

# 2) Evaluate engine rules (mangkir/telat/pulang cepat/lembur/override/recalculate)
pytest tests/test_penilaian_shift_absensi_service.py -q

# 3) Evaluate endpoint auth+permission (no token/user/admin)
pytest tests/test_penilaian_shift_absensi_endpoints.py -q
```

Jika ketiga command di atas hijau, baru lanjutkan full suite:

```bash
pytest -q
```

### Run Specific Test Class

```bash
pytest tests/test_user_endpoints.py::TestCreateUser -v
```

### Run Specific Test Function

```bash
pytest tests/test_auth_endpoints.py::TestAuthLogin::test_login_success_admin -v
```

### Run Tests by Marker

```bash
# Run only auth tests
pytest -m auth -v

# Run only user tests
pytest -m user -v

# Run only unit tests
pytest -m unit -v
```

---

## 📊 Coverage Reports

### Generate Coverage Report

```bash
# Run tests with coverage
pytest --cov=. --cov-report=html --cov-report=term-missing

# Open HTML report (will generate in htmlcov/ directory)
# Open htmlcov/index.html in browser
```

### Coverage for Specific Module

```bash
pytest --cov=services --cov-report=term-missing
pytest --cov=repositories --cov-report=term-missing
pytest --cov=utils --cov-report=term-missing
```

---

## 🏷️ Test Markers

Tests diorganisir dengan markers untuk filtering:

- `@pytest.mark.auth` - Authentication tests
- `@pytest.mark.user` - User management tests
- `@pytest.mark.unit` - Unit tests (isolated, no external dependencies)
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.slow` - Slow running tests

Catatan: test evaluate endpoint memakai marker `integration`.

### Run Tests Excluding Markers

```bash
# Skip slow tests
pytest -m "not slow"

# Run only unit tests
pytest -m "unit"
```

---

## 📁 Test Structure

```
tests/
├── conftest.py                 # Pytest fixtures and configuration
├── test_auth_utils.py          # Auth utility functions tests
├── test_auth_endpoints.py      # Auth API endpoints tests
├── test_user_endpoints.py      # User API endpoints tests
├── test_user_repository.py     # User repository tests
├── test_penilaian_shift_absensi_service.py   # Evaluate engine rules (service-level)
└── test_penilaian_shift_absensi_endpoints.py # Evaluate endpoint auth+permission
```

### Available Fixtures

Fixtures yang tersedia di `conftest.py`:

1. **`db`** - Fresh database session for each test
2. **`client`** - TestClient with database override
3. **`db_with_data`** - Database with initial test data (roles, permissions, users)
4. **`admin_token`** - JWT token for admin user
5. **`user_token`** - JWT token for regular user
6. **`auth_headers_admin`** - Authorization headers with admin token
7. **`auth_headers_user`** - Authorization headers with user token

### Test Data

Default test users created by `db_with_data` fixture:

**Admin User:**
```
Username: admin
Password: admin123
Role: admin
```

**Regular User:**
```
Username: user1
Password: user123
Role: user
```

---

## 📝 Writing New Tests

### Example: Test New Endpoint

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.mark.your_marker
class TestYourEndpoint:
    """Test description"""
    
    def test_your_test_name(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test documentation"""
        response = client.get(
            "/api/v1/your/endpoint",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
```

### Example: Test Repository

```python
import pytest
from sqlalchemy.orm import Session
from repositories.your_repository import YourRepository


@pytest.mark.unit
class TestYourRepository:
    """Test repository"""
    
    def test_get_by_id(self, db_with_data: Session):
        """Test get by ID"""
        repo = YourRepository(db_with_data)
        
        result = repo.get_by_id(1)
        
        assert result is not None
        assert result.id == 1
```

---

## 🎯 Test Coverage Goals

Target coverage:
- **Overall**: > 80%
- **Utils**: > 90%
- **Repositories**: > 85%
- **Services**: > 85%
- **Endpoints**: > 80%

---

## 🐛 Debugging Tests

### Run with Print Statements

```bash
pytest -s  # Show print output
```

### Run with PDB Debugger

```bash
pytest --pdb  # Drop into debugger on failure
```

### Show Locals on Failure

```bash
pytest -l  # Show local variables in tracebacks
```

---

## 📊 Current Test Results

### Test Summary (As of Setup)

| Module | Tests | Status |
|--------|-------|--------|
| Auth Utils | 9 tests | ✅ Ready |
| Auth Endpoints | 9 tests | ✅ Ready |
| User Endpoints | 18 tests | ✅ Ready |
| User Repository | 10 tests | ✅ Ready |
| Penilaian Shift Absensi Service | 6 tests | ✅ Ready |
| Penilaian Shift Absensi Endpoints | 3 tests | ✅ Ready |
| **Total Suite (current)** | **144 tests** | ✅ Passing |

### Evaluate Endpoint Rules (Single Source of Truth)

Untuk `POST /api/v1/penilaian-shift-absensi/evaluate`, minimal assertion yang wajib dijaga:

1. **Tanpa token** → HTTP `403`
2. **Token user biasa** (tanpa permission create) → HTTP `403`
3. **Token admin** → HTTP `200` + payload `success=true`
4. **Ringkasan evaluate lengkap** harus berisi field:
  - `created_count`
  - `updated_count`
  - `skipped_manual_override`
  - `skipped_existing`
  - `failed_count`

Aturan ini diimplementasikan pada file:
- `tests/test_penilaian_shift_absensi_endpoints.py`

---

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install -r requirements-test.txt
    
    - name: Run tests
      run: pytest --cov=. --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v2
```

---

## 💡 Best Practices

1. **Write tests first** (TDD approach)
2. **One assertion per test** when possible
3. **Use descriptive test names** that explain what is being tested
4. **Isolate tests** - each test should be independent
5. **Use fixtures** for common setup
6. **Test edge cases** and error conditions
7. **Keep tests fast** - use in-memory database for unit tests
8. **Update tests** when changing code

---

## 🔍 Common Issues

### Issue: Import errors

**Solution:**
```bash
# Make sure you're in the backend directory
cd /home/sultan/fast-absen/backend

# Activate virtual environment
source venv/bin/activate

# Install/reinstall dependencies
pip install -r requirements.txt
pip install -r requirements-test.txt
```

### Issue: Database errors

**Solution:**
Tests use SQLite in-memory database, which is created fresh for each test. No cleanup needed.

### Issue: Token/Auth errors

**Solution:**
Make sure you're using the correct fixtures:
- `auth_headers_admin` for admin endpoints
- `auth_headers_user` for user endpoints
- `db_with_data` for tests that need existing users

---

## 📚 Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [SQLAlchemy Testing](https://docs.sqlalchemy.org/en/20/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites)

---

## ✅ Next Steps

After setting up tests:
1. Run all tests to verify setup
2. Add tests for new features as you develop
3. Maintain test coverage above 80%
4. Run tests before committing code
5. Fix failing tests immediately
