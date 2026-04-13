"""
Alembic Environment Configuration
Terhubung ke DATABASE_URL dari settings aplikasi — tidak perlu setting ulang.
"""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Tambahkan root project ke sys.path agar bisa import dari config/settings
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ← Import semua models agar Alembic bisa detect perubahan schema via autogenerate
from models import (  # noqa: F401 — import semua agar metadata ter-register
    Base,
    User, Role, Permission, role_permissions, user_roles,
    Pegawai, Unit,
    ShiftKelompok, ShiftKelompokAturan, PegawaiShiftKelompok,
    RosterUploadBatch, RosterShift,
    PenilaianShiftAbsensi, Absensi,
    UserSession,
    ApprovalPengajuanAbsensi, ApprovalPengajuanAbsensiLog,
    FaceEmbedding,
    KamusKodeShift, KamusPolaShift,
    IpWhitelist,
    AppClient,
)

# Alembic Config object (akses ke alembic.ini)
config = context.config

# Setup logging dari alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata untuk autogenerate
target_metadata = Base.metadata


def get_url() -> str:
    """
    Ambil DATABASE_URL dari environment (settings aplikasi).
    Urutan prioritas:
    1. DATABASE_URL env var (set langsung oleh Docker/CI)
    2. Build dari komponen POSTGRES_* env vars (sama seperti settings.py)
    """
    # Opsi 1: DATABASE_URL langsung
    url = os.environ.get("DATABASE_URL")
    if url:
        return url

    # Opsi 2: Build dari komponen (mirip config/settings.py)
    from config.settings import settings
    return settings.DATABASE_URL


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    Menghasilkan SQL script tanpa koneksi database — berguna untuk review.
    Jalankan dengan: alembic upgrade head --sql
    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode (default).
    Membuat koneksi ke database dan menjalankan migration secara langsung.
    """
    # Override sqlalchemy.url dari alembic.ini dengan URL dari settings
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # NullPool: setiap migration buka koneksi baru, aman untuk CLI
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,      # Deteksi perubahan tipe kolom
            compare_server_default=True,  # Deteksi perubahan default value
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
