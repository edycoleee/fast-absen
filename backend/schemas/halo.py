"""
Halo Schemas - Request dan Response models
"""
from pydantic import BaseModel, Field, validator


class HaloRequest(BaseModel):
    """
    Request schema untuk POST /api/v1/halo/
    
    Attributes:
        nama: Nama user (required)
        handphone: Nomor handphone (required, min 10 karakter)
    """
    nama: str = Field(..., min_length=1, description="Nama user")
    handphone: str = Field(..., min_length=10, description="Nomor handphone")
    
    @validator('handphone')
    def validate_handphone(cls, v):
        """Validasi format handphone"""
        # Hapus karakter non-digit
        digits = ''.join(filter(str.isdigit, v))
        
        if len(digits) < 10:
            raise ValueError('Nomor handphone minimal 10 digit')
        
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "nama": "Sultan",
                "handphone": "081234567890"
            }
        }


class HaloResponse(BaseModel):
    """
    Response schema untuk POST /api/v1/halo/
    
    Attributes:
        message: Pesan halo
        nama: Nama user
        handphone: Nomor handphone
    """
    message: str
    nama: str
    handphone: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "Halo Sultan!",
                "nama": "Sultan",
                "handphone": "081234567890"
            }
        }
