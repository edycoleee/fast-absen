"""
Base Repository Classes
Implement generic CRUD operations untuk semua repositories
"""
from typing import Generic, TypeVar, Type, Optional, List, Any
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc, inspect
from models.base import BaseModel

ModelType = TypeVar("ModelType", bound=BaseModel)


class BaseRepository(Generic[ModelType]):
    """
    Base repository dengan generic CRUD operations
    
    Usage:
        class UserRepository(BaseRepository[User]):
            def __init__(self, db: Session):
                super().__init__(User, db)
    """
    
    def __init__(self, model: Type[ModelType], db: Session):
        """
        Initialize repository
        
        Args:
            model: SQLAlchemy model class
            db: Database session
        """
        self.model = model
        self.db = db
    
    def get_by_id(self, id: int) -> Optional[ModelType]:
        """
        Get record by ID
        
        Args:
            id: Record ID
        
        Returns:
            Model instance or None
        """
        return self.db.query(self.model).filter(self.model.id == id).first()
    
    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: str = None,
        order_dir: str = "asc"
    ) -> List[ModelType]:
        """
        Get all records with pagination
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            order_by: Column to sort by (defaults to primary key)
            order_dir: Sort direction (asc or desc)
        
        Returns:
            List of model instances
        """
        query = self.db.query(self.model)
        
        # Get default order column (primary key if order_by not specified)
        if order_by is None:
            # Get primary key column
            mapper = inspect(self.model)
            pk_columns = mapper.primary_key
            order_column = pk_columns[0] if pk_columns else None
        else:
            # Get specified column, fallback to primary key
            mapper = inspect(self.model)
            pk_columns = mapper.primary_key
            default_col = pk_columns[0] if pk_columns else None
            order_column = getattr(self.model, order_by, default_col)
        
        # Apply sorting if order column exists
        if order_column is not None:
            if order_dir == "desc":
                query = query.order_by(desc(order_column))
            else:
                query = query.order_by(asc(order_column))
        
        return query.offset(skip).limit(limit).all()
    
    def get_by_field(self, field: str, value: Any) -> Optional[ModelType]:
        """
        Get record by field value
        
        Args:
            field: Field name
            value: Field value
        
        Returns:
            Model instance or None
        """
        return self.db.query(self.model).filter(
            getattr(self.model, field) == value
        ).first()
    
    def get_many_by_field(
        self,
        field: str,
        value: Any,
        skip: int = 0,
        limit: int = 100
    ) -> List[ModelType]:
        """
        Get multiple records by field value
        
        Args:
            field: Field name
            value: Field value
            skip: Number of records to skip
            limit: Maximum number of records to return
        
        Returns:
            List of model instances
        """
        return self.db.query(self.model).filter(
            getattr(self.model, field) == value
        ).offset(skip).limit(limit).all()
    
    def count(self, **filters) -> int:
        """
        Count total records
        
        Args:
            **filters: Optional filters
        
        Returns:
            Total count
        """
        query = self.db.query(self.model)
        
        # Apply filters
        for field, value in filters.items():
            if hasattr(self.model, field):
                query = query.filter(getattr(self.model, field) == value)
        
        return query.count()
    
    def create(self, obj_in: Any) -> ModelType:
        """
        Create new record
        
        Args:
            obj_in: Dictionary, Pydantic model, atau instance model
        
        Returns:
            Created model instance
        """
        if isinstance(obj_in, self.model):
            db_obj = obj_in
        elif isinstance(obj_in, dict):
            db_obj = self.model(**obj_in)
        elif hasattr(obj_in, "model_dump"):
            db_obj = self.model(**obj_in.model_dump())
        else:
            raise TypeError(f"Unsupported create payload type: {type(obj_in).__name__}")

        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
    
    def update(self, id: int, obj_in: dict) -> Optional[ModelType]:
        """
        Update existing record
        
        Args:
            id: Record ID
            obj_in: Dictionary with field values to update
        
        Returns:
            Updated model instance or None
        """
        db_obj = self.get_by_id(id)
        if not db_obj:
            return None
        
        for field, value in obj_in.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
    
    def delete(self, id: int) -> bool:
        """
        Delete record (hard delete)
        
        Args:
            id: Record ID
        
        Returns:
            True if deleted, False if not found
        """
        db_obj = self.get_by_id(id)
        if not db_obj:
            return False
        
        self.db.delete(db_obj)
        self.db.commit()
        return True
    
    def soft_delete(self, id: int) -> bool:
        """
        Soft delete record (if model has soft delete support)
        
        Args:
            id: Record ID
        
        Returns:
            True if deleted, False if not found
        """
        db_obj = self.get_by_id(id)
        if not db_obj:
            return False
        
        if hasattr(db_obj, 'soft_delete'):
            db_obj.soft_delete()
            self.db.commit()
            return True
        
        return False
    
    def search(
        self,
        search_fields: List[str],
        search_query: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[ModelType]:
        """
        Search records across multiple fields
        
        Args:
            search_fields: List of field names to search in
            search_query: Search query string
            skip: Number of records to skip
            limit: Maximum number of records to return
        
        Returns:
            List of matching model instances
        """
        from sqlalchemy import or_
        
        query = self.db.query(self.model)
        
        # Build OR conditions for search
        conditions = []
        for field in search_fields:
            if hasattr(self.model, field):
                conditions.append(
                    getattr(self.model, field).ilike(f"%{search_query}%")
                )
        
        if conditions:
            query = query.filter(or_(*conditions))
        
        return query.offset(skip).limit(limit).all()
    
    def exists(self, id: int) -> bool:
        """
        Check if record exists
        
        Args:
            id: Record ID
        
        Returns:
            True if exists, False otherwise
        """
        return self.db.query(self.model).filter(
            self.model.id == id
        ).count() > 0
