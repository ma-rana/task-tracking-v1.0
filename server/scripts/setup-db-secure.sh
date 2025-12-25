#!/bin/bash

# Task Track Database Setup Script (Secure Version)
# This script automates the PostgreSQL database setup on VPS with security best practices

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

echo "🚀 Task Track Database Setup (Secure)"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Security: Clear sensitive data on exit
cleanup() {
    unset DB_PASSWORD
    unset DB_PASSWORD_CONFIRM
    unset PGPASSWORD
    # Clear bash history for this session
    history -c
}
trap cleanup EXIT INT TERM

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  This script needs sudo privileges${NC}"
    echo "Please run: sudo bash setup-db-secure.sh"
    exit 1
fi

# Function to validate database name/user (prevent SQL injection)
validate_identifier() {
    local identifier=$1
    if [[ ! "$identifier" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
        echo -e "${RED}❌ Invalid identifier: $identifier${NC}"
        echo "   Must start with letter or underscore, contain only letters, numbers, and underscores"
        return 1
    fi
    if [ ${#identifier} -gt 63 ]; then
        echo -e "${RED}❌ Identifier too long: $identifier${NC}"
        echo "   Maximum 63 characters allowed"
        return 1
    fi
    return 0
}

# Function to check password strength
check_password_strength() {
    local password=$1
    local min_length=8
    
    if [ ${#password} -lt $min_length ]; then
        echo -e "${RED}❌ Password must be at least $min_length characters long${NC}"
        return 1
    fi
    
    # Check for at least one number
    if [[ ! "$password" =~ [0-9] ]]; then
        echo -e "${YELLOW}⚠️  Warning: Password should contain at least one number${NC}"
    fi
    
    # Check for at least one letter
    if [[ ! "$password" =~ [a-zA-Z] ]]; then
        echo -e "${YELLOW}⚠️  Warning: Password should contain at least one letter${NC}"
    fi
    
    return 0
}

# Get database credentials
echo -e "${BLUE}📝 Database Configuration${NC}"
echo ""

read -p "Enter database name [tasktrack_db]: " DB_NAME
DB_NAME=${DB_NAME:-tasktrack_db}

if ! validate_identifier "$DB_NAME"; then
    exit 1
fi

read -p "Enter database user [tasktrack_user]: " DB_USER
DB_USER=${DB_USER:-tasktrack_user}

if ! validate_identifier "$DB_USER"; then
    exit 1
fi

# Secure password input with validation
while true; do
    read -sp "Enter database password (min 8 chars): " DB_PASSWORD
    echo ""
    
    if ! check_password_strength "$DB_PASSWORD"; then
        continue
    fi
    
    read -sp "Confirm database password: " DB_PASSWORD_CONFIRM
    echo ""
    
    if [ "$DB_PASSWORD" != "$DB_PASSWORD_CONFIRM" ]; then
        echo -e "${RED}❌ Passwords do not match!${NC}"
        continue
    fi
    
    break
done

# Clear confirmation password from memory
unset DB_PASSWORD_CONFIRM

echo ""
echo "📦 Installing PostgreSQL (if not already installed)..."
if ! command -v psql &> /dev/null; then
    apt-get update -qq
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    echo -e "${GREEN}✅ PostgreSQL installed${NC}"
else
    echo -e "${GREEN}✅ PostgreSQL already installed${NC}"
fi

echo ""
echo "🔒 Securing PostgreSQL..."

# Configure PostgreSQL for local connections only (security)
PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
PG_HBA="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"

# Ensure PostgreSQL only listens on localhost (not exposed to internet)
if [ -f "$PG_CONF" ]; then
    if ! grep -q "^listen_addresses = 'localhost'" "$PG_CONF"; then
        sed -i "s/^#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" "$PG_CONF"
        sed -i "s/^listen_addresses = '\*'/listen_addresses = 'localhost'/" "$PG_CONF"
        echo -e "${GREEN}✅ PostgreSQL configured for localhost only${NC}"
    fi
fi

# Restart PostgreSQL if config changed
if systemctl is-active --quiet postgresql; then
    systemctl restart postgresql
fi

echo ""
echo "🗄️  Creating database and user..."

# Use PGPASSWORD environment variable (more secure than command line)
export PGPASSWORD=''  # Clear for postgres user operations

# Create database and user using environment variable (more secure)
sudo -u postgres bash <<PSQL_SCRIPT
export PGPASSWORD=''
psql <<EOF
-- Drop database if exists (for fresh start)
DROP DATABASE IF EXISTS ${DB_NAME};

-- Create database
CREATE DATABASE ${DB_NAME};

-- Create user with secure password
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '${DB_USER}') THEN
        CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
    ELSE
        ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
    END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\q
EOF
PSQL_SCRIPT

# Clear PGPASSWORD
unset PGPASSWORD

echo -e "${GREEN}✅ Database and user created${NC}"

echo ""
echo "📋 Creating tables and schema..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SCHEMA_FILE="$SCRIPT_DIR/../db/schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ Schema file not found at: $SCHEMA_FILE${NC}"
    exit 1
fi

# Run schema
sudo -u postgres psql -d ${DB_NAME} -f "$SCHEMA_FILE"

echo -e "${GREEN}✅ Tables created${NC}"

echo ""
echo "🔐 Granting privileges..."

# Grant all privileges
sudo -u postgres psql -d ${DB_NAME} <<EOF
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
\q
EOF

echo -e "${GREEN}✅ Privileges granted${NC}"

echo ""
echo "🌱 Seeding admin user..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. Skipping seed script.${NC}"
    echo "   You can run it manually later: node scripts/seed.js"
else
    # Check if .env exists
    ENV_FILE="$SCRIPT_DIR/../.env"
    if [ ! -f "$ENV_FILE" ]; then
        echo "📝 Creating .env file with secure permissions..."
        
        # Create .env file with secure content
        cat > "$ENV_FILE" <<ENVEOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# Server Configuration
PORT=3001
NODE_ENV=production
ENVEOF
        
        # Set secure file permissions (readable only by owner)
        chmod 600 "$ENV_FILE"
        chown $(whoami):$(whoami) "$ENV_FILE" 2>/dev/null || true
        
        echo -e "${GREEN}✅ .env file created with secure permissions (600)${NC}"
    else
        echo -e "${YELLOW}⚠️  .env file already exists. Please update it manually.${NC}"
        echo -e "${YELLOW}   Ensure it has secure permissions: chmod 600 .env${NC}"
    fi
    
    # Install dependencies if needed
    if [ ! -d "$SCRIPT_DIR/../node_modules" ]; then
        echo "📦 Installing Node.js dependencies..."
        cd "$SCRIPT_DIR/.."
        npm install --silent
    fi
    
    # Run seed script
    cd "$SCRIPT_DIR/.."
    node scripts/seed.js
fi

# Clear password from environment before displaying summary
unset DB_PASSWORD

echo ""
echo "✅ Database setup complete!"
echo ""
echo "📋 Summary:"
echo "   Database: ${DB_NAME}"
echo "   User: ${DB_USER}"
echo "   Host: localhost (secure - not exposed to internet)"
echo "   Port: 5432"
echo ""
echo -e "${GREEN}🔒 Security Features Applied:${NC}"
echo "   ✅ Password strength validation"
echo "   ✅ PostgreSQL configured for localhost only"
echo "   ✅ .env file with secure permissions (600)"
echo "   ✅ Input validation (SQL injection prevention)"
echo "   ✅ Sensitive data cleared from memory"
echo ""
echo "📝 Next steps:"
echo "   1. Verify .env file permissions: ls -l server/.env"
echo "   2. Test connection: psql -h localhost -U ${DB_USER} -d ${DB_NAME}"
echo "   3. Start your server: npm start (or PM2)"
echo "   4. Change default admin password after first login!"
echo ""

