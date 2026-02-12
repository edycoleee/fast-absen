"""
API v1 Main Router
Menggabungkan semua endpoint
"""
from fastapi import APIRouter
from api.v1.endpoints import halo

api_router = APIRouter()

# Include routers
api_router.include_router(
    halo.router,
    prefix="/halo",
    tags=["Halo"]
)

# Endpoint lain bisa ditambahkan di sini
# api_router.include_router(
#     lokasi.router,
#     prefix="/lokasi",
#     tags=["Lokasi"]
# )
