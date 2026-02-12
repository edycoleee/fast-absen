"""
Pegawai Service
Business logic for employee management
"""
import os
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from schemas.pegawai import PegawaiCreate, PegawaiUpdate, PegawaiResponse
from repositories.pegawai_repository import PegawaiRepository
from models.pegawai import Pegawai
from config.settings import settings


class PegawaiService:
    """Pegawai service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.pegawai_repo = PegawaiRepository(db)
        self.upload_dir = os.path.join(os.getcwd(), "uploads", "photos")
        
        # Create upload directory if not exists
        os.makedirs(self.upload_dir, exist_ok=True)
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[PegawaiResponse]:
        """Get all pegawai"""
        pegawai_list = self.pegawai_repo.get_all(skip=skip, limit=limit)
        return [PegawaiResponse.model_validate(p) for p in pegawai_list]
    
    def search(self, query: str, skip: int = 0, limit: int = 100) -> List[PegawaiResponse]:
        """Search pegawai by name or NIP"""
        pegawai_list = self.pegawai_repo.search(query, skip=skip, limit=limit)
        return [PegawaiResponse.model_validate(p) for p in pegawai_list]
    
    def get_by_id(self, pegawai_id: str) -> PegawaiResponse:
        """Get pegawai by ID"""
        pegawai = self.pegawai_repo.get(pegawai_id)
        
        if not pegawai:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pegawai with id {pegawai_id} not found"
            )
        
        return PegawaiResponse.model_validate(pegawai)
    
    async def create(
        self, 
        pegawai_data: PegawaiCreate,
        foto: Optional[UploadFile] = None
    ) -> PegawaiResponse:
        """Create new pegawai"""
        # Check if pegawai ID already exists
        existing = self.pegawai_repo.get(pegawai_data.id_pegawai)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Pegawai with id '{pegawai_data.id_pegawai}' already exists"
            )
        
        # Check if NIP already exists
        if pegawai_data.nip:
            existing_nip = self.pegawai_repo.get_by_nip(pegawai_data.nip)
            if existing_nip:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Pegawai with NIP '{pegawai_data.nip}' already exists"
                )
        
        # Handle photo upload
        foto_filename = None
        if foto:
            foto_filename = await self._save_photo(foto, pegawai_data.id_pegawai)
        
        # Create pegawai
        pegawai_dict = pegawai_data.model_dump()
        if foto_filename:
            pegawai_dict["foto"] = foto_filename
        
        pegawai = Pegawai(**pegawai_dict)
        
        # Save to database
        created_pegawai = self.pegawai_repo.create(pegawai)
        
        return PegawaiResponse.model_validate(created_pegawai)
    
    async def update(
        self,
        pegawai_id: str,
        pegawai_data: PegawaiUpdate,
        foto: Optional[UploadFile] = None
    ) -> PegawaiResponse:
        """Update pegawai"""
        # Get existing pegawai
        pegawai = self.pegawai_repo.get(pegawai_id)
        if not pegawai:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pegawai with id {pegawai_id} not found"
            )
        
        # Update fields
        update_data = pegawai_data.model_dump(exclude_unset=True)
        
        # Check if NIP is being updated and already exists
        if "nip" in update_data and update_data["nip"] and update_data["nip"] != pegawai.nip:
            existing_nip = self.pegawai_repo.get_by_nip(update_data["nip"])
            if existing_nip:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Pegawai with NIP '{update_data['nip']}' already exists"
                )
        
        # Handle photo upload
        if foto:
            # Delete old photo if exists
            if pegawai.foto:
                old_photo_path = os.path.join(self.upload_dir, pegawai.foto)
                if os.path.exists(old_photo_path):
                    os.remove(old_photo_path)
            
            # Save new photo
            foto_filename = await self._save_photo(foto, pegawai_id)
            update_data["foto"] = foto_filename
        
        # Update fields
        for field, value in update_data.items():
            setattr(pegawai, field, value)
        
        # Save to database
        updated_pegawai = self.pegawai_repo.update(pegawai)
        
        return PegawaiResponse.model_validate(updated_pegawai)
    
    def delete(self, pegawai_id: str) -> None:
        """Delete pegawai"""
        pegawai = self.pegawai_repo.get(pegawai_id)
        
        if not pegawai:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pegawai with id {pegawai_id} not found"
            )
        
        # Delete photo if exists
        if pegawai.foto:
            photo_path = os.path.join(self.upload_dir, pegawai.foto)
            if os.path.exists(photo_path):
                os.remove(photo_path)
        
        self.pegawai_repo.delete(pegawai_id)
    
    async def _save_photo(self, foto: UploadFile, pegawai_id: str) -> str:
        """Save uploaded photo and return filename"""
        # Validate file type
        allowed_types = ["image/jpeg", "image/jpg", "image/png"]
        if foto.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
            )
        
        # Get file extension
        ext = foto.filename.split(".")[-1] if "." in foto.filename else "jpg"
        
        # Generate filename
        filename = f"{pegawai_id}.{ext}"
        file_path = os.path.join(self.upload_dir, filename)
        
        # Save file
        contents = await foto.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        return filename
