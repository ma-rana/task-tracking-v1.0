#!/bin/bash

# Database Backup Script
# Usage: ./backup.sh

BACKUP_DIR="/home/tasktrack/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="tasktrack_db"
DB_USER="tasktrack_user"
DB_PASSWORD="${DB_PASSWORD}"  # Set this in environment or script

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
PGPASSWORD=$DB_PASSWORD pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql.gz"
echo "Backup location: $BACKUP_DIR/backup_$DATE.sql.gz"

# Optional: Upload to cloud storage (uncomment and configure)
# aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://your-bucket/backups/

