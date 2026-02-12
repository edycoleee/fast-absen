#!/bin/bash
# ============================================================
# INIT ADMIN SUPER - First Time Setup
# Sistem Absensi RSUD Sulfat
# ============================================================
# Script untuk membuat admin super dan pegawai pertama kali
# Usage: ./init-admin.sh
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  INIT ADMIN SUPER - Sistem Absensi RSUD Sulfat${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# Load .env file if exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ Loaded .env configuration${NC}"
else
    echo -e "${RED}✗ File .env tidak ditemukan!${NC}"
    echo -e "${YELLOW}  Membuat .env dari template...${NC}"
    cat > .env << 'EOF'
# PostgreSQL Configuration
POSTGRES_DB=attendance_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# pgAdmin Configuration
PGADMIN_DEFAULT_EMAIL=admin@rsud-sulfat.local
PGADMIN_DEFAULT_PASSWORD=admin123
PGADMIN_PORT=5050

# Docker Host IP (0.0.0.0 for all interfaces)
DOCKER_HOST_IP=0.0.0.0
EOF
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ File .env berhasil dibuat${NC}"
fi

echo ""
echo -e "${YELLOW}Database Configuration:${NC}"
echo -e "  Host: ${POSTGRES_HOST:-localhost}"
echo -e "  Port: ${POSTGRES_PORT:-5432}"
echo -e "  Database: ${POSTGRES_DB:-attendance_db}"
echo -e "  User: ${POSTGRES_USER:-postgres}"
echo ""

# Check if PostgreSQL is accessible
echo -e "${BLUE}Checking database connection...${NC}"

# Try using docker exec (preferred method)
if docker exec attendance-db-postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c '\q' 2>/dev/null; then
    echo -e "${GREEN}✓ Database connection OK (via Docker)${NC}"
    USE_DOCKER=true
# Fallback to psql client if available
elif command -v psql &> /dev/null && PGPASSWORD=${POSTGRES_PASSWORD} psql -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c '\q' 2>/dev/null; then
    echo -e "${GREEN}✓ Database connection OK (via psql client)${NC}"
    USE_DOCKER=false
else
    echo -e "${RED}✗ Tidak dapat connect ke database!${NC}"
    echo -e "${YELLOW}  Pastikan PostgreSQL sudah running:${NC}"
    echo -e "  ${BLUE}docker ps -a${NC}"
    echo -e "${YELLOW}  atau jalankan:${NC}"
    echo -e "  ${BLUE}docker-compose up -d${NC}"
    exit 1
fi
echo ""

# ============================================================
# INPUT DATA PEGAWAI
# ============================================================
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  DATA PEGAWAI (Admin Super)${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

read -p "ID Pegawai (contoh: P001): " ID_PEGAWAI
read -p "NIP (contoh: 199001012020121001): " NIP
read -p "Nama Lengkap: " NAMA
read -p "Jenis Kelamin (L/P): " JENIS_KELAMIN
read -p "Tempat Lahir: " TEMPAT_LAHIR
read -p "Tanggal Lahir (YYYY-MM-DD): " TANGGAL_LAHIR
read -p "Alamat: " ALAMAT
read -p "Status (PNS/CPNS/Honorer): " STATUS

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  DATA USER (Login Credentials)${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

read -p "Username: " USERNAME
while true; do
    read -s -p "Password (min 6 karakter, max 72): " PASSWORD
    echo ""
    read -s -p "Konfirmasi Password: " PASSWORD_CONFIRM
    echo ""
    
    if [ "$PASSWORD" = "$PASSWORD_CONFIRM" ]; then
        # Check password length (backend requirement: min 6, bcrypt max 72 bytes)
        PASSWORD_LENGTH=${#PASSWORD}
        if [ $PASSWORD_LENGTH -lt 6 ]; then
            echo -e "${RED}✗ Password terlalu pendek! Minimal 6 karakter.${NC}"
            continue
        fi
        if [ $PASSWORD_LENGTH -gt 72 ]; then
            echo -e "${YELLOW}⚠ Password terlalu panjang (max 72 karakter).${NC}"
            echo -e "${YELLOW}  Password akan dipotong otomatis.${NC}"
            read -p "Lanjutkan? (y/n): " CONTINUE
            if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
                echo -e "${YELLOW}Silakan input password lagi.${NC}"
                continue
            fi
        fi
        break
    else
        echo -e "${RED}Password tidak cocok! Coba lagi.${NC}"
    fi
done

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  KONFIRMASI DATA${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "${YELLOW}Data Pegawai:${NC}"
echo -e "  ID Pegawai    : ${GREEN}${ID_PEGAWAI}${NC}"
echo -e "  NIP           : ${GREEN}${NIP}${NC}"
echo -e "  Nama          : ${GREEN}${NAMA}${NC}"
echo -e "  Jenis Kelamin : ${GREEN}${JENIS_KELAMIN}${NC}"
echo -e "  Tempat Lahir  : ${GREEN}${TEMPAT_LAHIR}${NC}"
echo -e "  Tanggal Lahir : ${GREEN}${TANGGAL_LAHIR}${NC}"
echo -e "  Alamat        : ${GREEN}${ALAMAT}${NC}"
echo -e "  Status        : ${GREEN}${STATUS}${NC}"
echo ""
echo -e "${YELLOW}Data User:${NC}"
echo -e "  Username      : ${GREEN}${USERNAME}${NC}"
echo -e "  Password      : ${GREEN}********${NC}"
echo -e "  Role          : ${GREEN}admin${NC}"
echo ""

read -p "Apakah data sudah benar? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo -e "${RED}Dibatalkan.${NC}"
    exit 0
fi

# ============================================================
# HASH PASSWORD using Python
# ============================================================
echo ""
echo -e "${BLUE}Hashing password...${NC}"

# Hash password using passlib (same as backend)
PASSWORD_HASH=$(python3 << EOF
try:
    from passlib.context import CryptContext
    
    # Same configuration as backend
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Password
    password = "${PASSWORD}"
    
    # Truncate if longer than 72 bytes (bcrypt limitation)
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password = password_bytes[:72].decode('utf-8', errors='ignore')
    
    # Generate hash
    hashed = pwd_context.hash(password)
    print(hashed)
    
except ImportError:
    print("ERROR_IMPORT")
except Exception as e:
    print(f"ERROR: {e}")
EOF
)

if [ -z "$PASSWORD_HASH" ] || [ "$PASSWORD_HASH" = "ERROR_IMPORT" ]; then
    echo -e "${RED}✗ Gagal hash password!${NC}"
    echo -e "${YELLOW}  Install passlib: pip install passlib[bcrypt] --break-system-packages${NC}"
    exit 1
elif [[ "$PASSWORD_HASH" == ERROR* ]]; then
    echo -e "${RED}✗ Error: ${PASSWORD_HASH}${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Password hashed${NC}"

# ============================================================
# INSERT TO DATABASE
# ============================================================
echo ""
echo -e "${BLUE}Inserting data to database...${NC}"

# Create SQL file
SQL_FILE="/tmp/init_admin_${ID_PEGAWAI}.sql"
cat > "${SQL_FILE}" << EOF
-- Insert Pegawai
INSERT INTO pegawai (id_pegawai, nip, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, status, created_at)
VALUES ('${ID_PEGAWAI}', '${NIP}', '${NAMA}', '${JENIS_KELAMIN}', '${TEMPAT_LAHIR}', '${TANGGAL_LAHIR}', '${ALAMAT}', '${STATUS}', NOW())
ON CONFLICT (id_pegawai) DO UPDATE SET
    nip = EXCLUDED.nip,
    nama = EXCLUDED.nama,
    jenis_kelamin = EXCLUDED.jenis_kelamin,
    tempat_lahir = EXCLUDED.tempat_lahir,
    tanggal_lahir = EXCLUDED.tanggal_lahir,
    alamat = EXCLUDED.alamat,
    status = EXCLUDED.status;

-- Insert User
INSERT INTO users (id_pegawai, username, password_hash, is_active, created_at)
VALUES ('${ID_PEGAWAI}', '${USERNAME}', '${PASSWORD_HASH}', TRUE, NOW())
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    id_pegawai = EXCLUDED.id_pegawai;

-- Link User to Admin Role
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = '${USERNAME}' AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;
EOF

# Execute SQL based on connection method
if [ "$USE_DOCKER" = true ]; then
    docker exec -i attendance-db-postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < "${SQL_FILE}"
    RESULT=$?
else
    PGPASSWORD=${POSTGRES_PASSWORD} psql -h ${POSTGRES_HOST} -p ${POSTGRES_PORT} -U ${POSTGRES_USER} -d ${POSTGRES_DB} < "${SQL_FILE}"
    RESULT=$?
fi

# Clean up SQL file
rm -f "${SQL_FILE}"

if [ $RESULT -eq 0 ]; then
    echo ""
    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}  ✓ ADMIN SUPER BERHASIL DIBUAT!${NC}"
    echo -e "${GREEN}============================================================${NC}"
    echo ""
    echo -e "${YELLOW}Credentials untuk login:${NC}"
    echo -e "  Username: ${GREEN}${USERNAME}${NC}"
    echo -e "  Password: ${GREEN}${PASSWORD}${NC}"
    echo -e "  Role: ${GREEN}admin${NC}"
    echo ""
    echo -e "${YELLOW}Akses aplikasi:${NC}"
    echo -e "  Frontend: ${BLUE}http://192.168.171.15:3000${NC}"
    echo -e "  Backend API: ${BLUE}http://192.168.171.15:8000${NC}"
    echo -e "  API Docs: ${BLUE}http://192.168.171.15:8000/docs${NC}"
    echo ""
    echo -e "${BLUE}Selamat! Anda sekarang dapat login sebagai admin.${NC}"
    echo ""
else
    echo -e "${RED}✗ Gagal insert data ke database!${NC}"
    exit 1
fi
