#!/bin/bash

# Task Track Database Setup Script
# This script automates the PostgreSQL database setup on VPS
# 
# ⚠️ SECURITY WARNING: This script has some security limitations.
# For production use, consider using setup-db-secure.sh instead.

set -e  # Exit on error

echo "🚀 Task Track Database Setup"
echo "============================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  This script needs sudo privileges${NC}"
    echo "Please run: sudo bash setup-db.sh"
    exit 1
fi

# Get database credentials
read -p "Enter database name [tasktrack_db]: " DB_NAME
DB_NAME=${DB_NAME:-tasktrack_db}

read -p "Enter database user [tasktrack_user]: " DB_USER
DB_USER=${DB_USER:-tasktrack_user}

read -sp "Enter database password: " DB_PASSWORD
echo ""

read -sp "Confirm database password: " DB_PASSWORD_CONFIRM
echo ""

if [ "$DB_PASSWORD" != "$DB_PASSWORD_CONFIRM" ]; then
    echo -e "${RED}❌ Passwords do not match!${NC}"
    exit 1
fi

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
echo "🗄️  Creating database and user..."

# Create database and user
sudo -u postgres psql <<EOF
-- Drop database if exists (for fresh start)
DROP DATABASE IF EXISTS ${DB_NAME};

-- Create database
CREATE DATABASE ${DB_NAME};

-- Create user
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
        echo "📝 Creating .env file..."
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
        echo -e "${GREEN}✅ .env file created with secure permissions (600)${NC}"
    else
        echo -e "${YELLOW}⚠️  .env file already exists. Please update it manually.${NC}"
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

echo ""
echo "✅ Database setup complete!"
echo ""
echo "📋 Summary:"
echo "   Database: ${DB_NAME}"
echo "   User: ${DB_USER}"
echo "   Host: localhost"
echo "   Port: 5432"
echo ""
echo "📝 Next steps:"
echo "   1. Update your .env file with these credentials"
echo "   2. Test connection: psql -h localhost -U ${DB_USER} -d ${DB_NAME}"
echo "   3. Start your server: npm start (or PM2)"
echo ""

