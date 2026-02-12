# Backend - FastAPI Application

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# atau
venv\Scripts\activate     # Windows

pip install -r requirements.txt
```

### 2. Setup Environment
Copy `.env` dan sesuaikan konfigurasi database:
```bash
# Sudah ada .env, tinggal sesuaikan POSTGRES_HOST jika perlu
```

### 3. Run Application
```bash
# Method 1: Langsung dengan uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Method 2: Dengan run.py
python run.py
```

### 4. Access API
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Root API**: http://localhost:8000/
- **Health Check**: http://localhost:8000/health

## 📁 Project Structure

```
backend/
├── api/
│   └── v1/
│       ├── endpoints/
│       │   └── halo.py          # Endpoint halo
│       └── router.py            # Main router v1
├── config/
│   ├── database.py              # Database connection
│   └── settings.py              # App configuration
├── schemas/
│   └── halo.py                  # Pydantic schemas
├── services/
│   └── halo_service.py          # Business logic
├── utils/
│   ├── exception_handlers.py   # Error handlers
│   ├── logger.py                # Logging config
│   ├── middleware.py            # Custom middleware
│   └── response.py              # Standard responses
├── logs/                        # Auto-generated logs
├── .env                         # Environment variables
├── main.py                      # FastAPI app
├── run.py                       # Run script
└── requirements.txt             # Dependencies
```

## 🎯 Clean Architecture

```
Controller (Router) → Service → Repository → Database
     ↓                  ↓           ↓
  halo.py       halo_service.py  (models)
```

### Layer Responsibilities:
- **Router/Endpoint**: Handle HTTP requests/responses
- **Service**: Business logic
- **Repository**: Data access (akan dibuat saat perlu)
- **Schemas**: Request/response validation
- **Models**: Database models (akan dibuat)

## 📝 Endpoints

### 1. GET /api/v1/halo/
```bash
curl http://localhost:8000/api/v1/halo/
```
Response:
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "message": "Halo! Welcome to FastAPI",
    "info": "This is a simple GET endpoint"
  }
}
```

### 2. POST /api/v1/halo/
```bash
curl -X POST http://localhost:8000/api/v1/halo/ \
  -H "Content-Type: application/json" \
  -d '{"nama":"Sultan","handphone":"081234567890"}'
```
Response:
```json
{
  "success": true,
  "message": "Halo Sultan!",
  "data": {
    "nama": "Sultan",
    "handphone": "+6281234567890",
    "original_phone": "081234567890"
  }
}
```

## 🔧 Development

### Add New Endpoint
1. **Create schema** di `schemas/`
2. **Create service** di `services/`
3. **Create endpoint** di `api/v1/endpoints/`
4. **Register router** di `api/v1/router.py`

### Database Models
Create di `models/` folder (akan dibuat saat perlu)

### Run Tests
```bash
pytest  # (akan dibuat)
```

## 📚 Technologies
- **FastAPI**: Modern web framework
- **Pydantic**: Data validation
- **SQLAlchemy**: ORM untuk database
- **Uvicorn**: ASGI server
- **PostgreSQL**: Database
