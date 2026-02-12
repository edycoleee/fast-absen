"""
Halo Service - Business logic untuk endpoint halo
"""
from schemas.halo import HaloRequest, HaloResponse
from utils.logger import logger


class HaloService:
    """
    Service class untuk handle business logic endpoint halo
    
    Clean Architecture:
    - Controller (router) -> Service (business logic) -> Repository (data access)
    - Service ini handle business logic
    - Bisa dipanggil dari berbagai controller/router
    """
    
    def get_halo_message(self) -> dict:
        """
        Get simple halo message
        
        Returns:
            Dictionary dengan message
        """
        logger.info("Getting halo message")
        
        return {
            "message": "Halo! Welcome to FastAPI",
            "info": "This is a simple GET endpoint"
        }
    
    def process_halo_data(self, data: HaloRequest) -> dict:
        """
        Process halo data dari POST request
        
        Args:
            data: HaloRequest dengan nama dan handphone
        
        Returns:
            Dictionary dengan processed data
        """
        logger.info(f"Processing halo data for: {data.nama}")
        
        # Business logic bisa ditambahkan di sini
        # Contoh: validasi tambahan, transform data, dll
        
        # Format handphone (contoh business logic)
        formatted_phone = self._format_handphone(data.handphone)
        
        return {
            "nama": data.nama,
            "handphone": formatted_phone,
            "original_phone": data.handphone
        }
    
    def _format_handphone(self, phone: str) -> str:
        """
        Format nomor handphone
        
        Args:
            phone: Nomor handphone raw
        
        Returns:
            Formatted phone number
        """
        # Hapus karakter non-digit
        digits = ''.join(filter(str.isdigit, phone))
        
        # Convert 08xx ke +628xx
        if digits.startswith('0'):
            digits = '62' + digits[1:]
        
        return f"+{digits}"
