"""
Base Service Classes
Implement business logic layer dengan dependency injection
"""
from typing import Generic, TypeVar, Type, Optional, List, Dict, Any
from sqlalchemy.orm import Session
from repositories.base import BaseRepository
from models.base import BaseModel

ModelType = TypeVar("ModelType", bound=BaseModel)
RepositoryType = TypeVar("RepositoryType", bound=BaseRepository)


class BaseService(Generic[ModelType, RepositoryType]):
    """
    Base service dengan business logic
    
    Usage:
        class UserService(BaseService[User, UserRepository]):
            def __init__(self, db: Session):
                self.repository = UserRepository(db)
                super().__init__(self.repository)
    """
    
    def __init__(self, repository: RepositoryType):
        """
        Initialize service
        
        Args:
            repository: Repository instance
        """
        self.repository = repository
    
    def get_by_id(self, id: int) -> Optional[ModelType]:
        """
        Get record by ID
        
        Args:
            id: Record ID
        
        Returns:
            Model instance or None
        """
        return self.repository.get_by_id(id)
    
    def get_all(
        self,
        page: int = 1,
        limit: int = 10,
        **filters
    ) -> tuple[List[ModelType], int]:
        """
        Get all records with pagination
        
        Args:
            page: Page number
            limit: Items per page
            **filters: Additional filters
        
        Returns:
            Tuple of (items, total_count)
        """
        skip = (page - 1) * limit
        items = self.repository.get_all(skip=skip, limit=limit)
        total = self.repository.count(**filters)
        return items, total
    
    def create(self, data: dict) -> ModelType:
        """
        Create new record with validation
        
        Args:
            data: Dictionary with field values
        
        Returns:
            Created model instance
        """
        # Add business logic validation here
        # Example: Check duplicates, validate relationships, etc.
        
        return self.repository.create(data)
    
    def update(self, id: int, data: dict) -> Optional[ModelType]:
        """
        Update existing record with validation
        
        Args:
            id: Record ID
            data: Dictionary with field values
        
        Returns:
            Updated model instance or None
        """
        # Add business logic validation here
        
        return self.repository.update(id, data)
    
    def delete(self, id: int, soft: bool = True) -> bool:
        """
        Delete record
        
        Args:
            id: Record ID
            soft: Use soft delete if True
        
        Returns:
            True if deleted, False if not found
        """
        if soft:
            return self.repository.soft_delete(id)
        return self.repository.delete(id)
    
    def search(
        self,
        query: str,
        search_fields: List[str],
        page: int = 1,
        limit: int = 10
    ) -> tuple[List[ModelType], int]:
        """
        Search records
        
        Args:
            query: Search query
            search_fields: Fields to search in
            page: Page number
            limit: Items per page
        
        Returns:
            Tuple of (items, total_count)
        """
        skip = (page - 1) * limit
        items = self.repository.search(
            search_fields=search_fields,
            search_query=query,
            skip=skip,
            limit=limit
        )
        # Note: For accurate total, should count search results
        # This is simplified - implement proper search count
        total = len(items)
        return items, total
    
    def exists(self, id: int) -> bool:
        """
        Check if record exists
        
        Args:
            id: Record ID
        
        Returns:
            True if exists
        """
        return self.repository.exists(id)
