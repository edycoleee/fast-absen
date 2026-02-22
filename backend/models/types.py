"""
Cross-dialect SQLAlchemy custom types.

- Uses native PostgreSQL UUID/JSONB on Postgres
- Falls back to String(36)/JSON on SQLite and other dialects
"""
from sqlalchemy.types import TypeDecorator, String, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB


class GUID(TypeDecorator):
    """Platform-independent GUID type.

    Stores as PostgreSQL UUID on Postgres, otherwise as String(36).
    """

    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(String(36))


class JSONBCompat(TypeDecorator):
    """Platform-independent JSONB type.

    Stores as PostgreSQL JSONB on Postgres, otherwise as generic JSON.
    """

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_JSONB())
        return dialect.type_descriptor(JSON())
