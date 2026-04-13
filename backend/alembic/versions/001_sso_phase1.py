"""SSO Phase 1: add nik to pegawai, create app_clients

Revision ID: 001_sso_phase1
Revises: -
Create Date: 2026-04-10

Perubahan:
- Tambah kolom `nik` (VARCHAR 20, UNIQUE, nullable) ke tabel pegawai
  → NIK menjadi kunci identitas global lintas aplikasi (SSO key)
- Buat tabel `app_clients`
  → Registry aplikasi yang diizinkan menggunakan SSO ini sebagai identity provider
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision: str = "001_sso_phase1"
down_revision: Union[str, None] = None  # Migration pertama — tidak ada sebelumnya
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─────────────────────────────────────────────────────────────────────────
    # 1. Tambah kolom `nik` ke tabel `pegawai`
    #    nullable=True karena data pegawai existing belum punya NIK
    #    Admin mengisi NIK secara bertahap setelah migration ini dijalankan
    # ─────────────────────────────────────────────────────────────────────────
    op.add_column(
        "pegawai",
        sa.Column("nik", sa.String(20), nullable=True),
    )

    # Buat unique index untuk kolom nik
    # Hanya enforce unique pada nilai yang tidak NULL
    # PostgreSQL otomatis mengizinkan multiple NULL pada unique index
    op.create_index(
        "ix_pegawai_nik",
        "pegawai",
        ["nik"],
        unique=True,
    )

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Buat tabel `app_clients` — SSO client registry
    #    Setiap aplikasi (SIMRS, finance, signature, dll.) wajib terdaftar
    # ─────────────────────────────────────────────────────────────────────────
    op.create_table(
        "app_clients",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "client_id",
            sa.String(100),
            nullable=False,
            comment="Contoh: simrs-web, signature-service, finance-app",
        ),
        sa.Column(
            "client_name",
            sa.String(255),
            nullable=False,
            comment="Nama tampilkan aplikasi",
        ),
        sa.Column(
            "client_secret_hash",
            sa.Text(),
            nullable=True,
            comment="SHA-256 dari secret. NULL = aplikasi publik / frontend only",
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "allowed_origins",
            sa.Text(),
            nullable=True,
            comment="Comma-separated allowed origins, misal: https://simrs.rs.id",
        ),
        sa.Column(
            "allowed_scopes",
            sa.Text(),
            nullable=True,
            server_default="identity:read",
            comment="Scopes yang diizinkan, misal: identity:read,signature:embed",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_app_clients_id", "app_clients", ["id"])
    op.create_index("ix_app_clients_client_id", "app_clients", ["client_id"], unique=True)

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Seed app_clients — daftarkan aplikasi default
    #    Ini data awal, bisa ditambah via admin UI nanti
    # ─────────────────────────────────────────────────────────────────────────
    op.execute("""
        INSERT INTO app_clients (client_id, client_name, description, allowed_scopes, is_active)
        VALUES
            (
                'absen-app',
                'Aplikasi Absensi RSUD Sulfat',
                'Aplikasi absensi internal — juga berfungsi sebagai SSO provider',
                'identity:read',
                true
            ),
            (
                'signature-service',
                'Signature Service',
                'Service tanda tangan elektronik — consumer SSO untuk identitas user',
                'identity:read,signature:embed,signature:audit',
                true
            )
        ON CONFLICT (client_id) DO NOTHING;
    """)


def downgrade() -> None:
    # Hapus tabel app_clients
    op.drop_index("ix_app_clients_client_id", table_name="app_clients")
    op.drop_index("ix_app_clients_id", table_name="app_clients")
    op.drop_table("app_clients")

    # Hapus kolom nik dari pegawai
    op.drop_index("ix_pegawai_nik", table_name="pegawai")
    op.drop_column("pegawai", "nik")
