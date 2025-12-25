#!/bin/bash

# Database Restore Script
# Usage: ./restore.sh backup_file.sql.gz

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh backup_file.sql.gz"
    exit 1
fi

BACKUP_FILE=$1
DB_NAME="tasktrack_db"
DB_USER="tasktrack_user"
DB_PASSWORD="${DB_PASSWORD}"  # Set this in environment or script

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Confirm restore
read -p "This will overwrite the current database. Are you sure? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
    echo "Decompressing backup..."
    gunzip -c $BACKUP_FILE > /tmp/restore.sql
    SQL_FILE="/tmp/restore.sql"
else
    SQL_FILE=$BACKUP_FILE
fi

# Restore database
echo "Restoring database..."
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h localhost -d $DB_NAME < $SQL_FILE

# Cleanup
if [ -f "/tmp/restore.sql" ]; then
    rm /tmp/restore.sql
fi

echo "Database restored successfully!"

