#!/bin/bash
# Daily MongoDB backup for ashoktex
# Usage: bash scripts/backup-db.sh
# Add to crontab: 0 2 * * * /bin/bash /path/to/backend/scripts/backup-db.sh

BACKUP_DIR="$HOME/ashoktex-backups"
DATE=$(date +%Y-%m-%d_%H-%M)
DEST="$BACKUP_DIR/$DATE"

mkdir -p "$DEST"
mongodump --uri="mongodb://127.0.0.1:27017/ashoktex" --out="$DEST"

# Keep only last 7 days
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +7 -exec rm -rf {} + 2>/dev/null

echo "Backup done: $DEST"
