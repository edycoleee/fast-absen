"""
Halo Endpoint - Simple GET and POST examples
"""
from fastapi import APIRouter, Depends
from schemas.halo import HaloRequest, HaloResponse
from services.halo_service import HaloService
from utils.response import success_response

router = APIRouter(prefix="/halo", tags=["Halo"])


@router.get("/", response_model=dict)
async def halo_get():
    """
    GET /api/v1/halo/
    
    Endpoint GET sederhana yang mengembalikan pesan halo.
    
    Mirip dengan:
    - Flask: @app.route('/api/halo/', methods=['GET'])
    - Express: app.get('/api/halo/', ...)
    
    Returns:
        Standard response dengan message
    """
    service = HaloService()
    result = service.get_halo_message()
    
    return success_response(
        message="Success",
        data=result
    )


@router.post("/", response_model=dict)
async def halo_post(data: HaloRequest):
    """
    POST /api/v1/halo/
    
    Endpoint POST yang menerima data nama dan handphone.
    
    Perbedaan dengan Flask/Express:
    - Tidak perlu manual parsing request.json atau req.body
    - Pydantic otomatis validasi tipe data
    - Auto-generate OpenAPI documentation
    
    Args:
        data: HaloRequest object dengan field nama dan handphone
    
    Returns:
        Standard response dengan data nama dan handphone
    """
    service = HaloService()
    result = service.process_halo_data(data)
    
    return success_response(
        message=f"Halo {data.nama}!",
        data=result
    )
