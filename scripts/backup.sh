#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${BACKUP_DIR:?Set BACKUP_DIR to a protected directory outside the repository}"
mkdir -p "$BACKUP_DIR"
umask 077
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
# Pass DATABASE_URL and STORAGE_PATH through the environment; do not source .env.local as shell code.
: "${DATABASE_URL:?Export DATABASE_URL before running this script}"
: "${STORAGE_PATH:?Export the absolute STORAGE_PATH before running this script}"
[[ -d "$STORAGE_PATH" ]] || { echo "Storage directory unavailable" >&2; exit 1; }
pg_dump --dbname="$DATABASE_URL" --format=custom --file="$BACKUP_DIR/database-$stamp.dump"
tar -czf "$BACKUP_DIR/storage-$stamp.tar.gz" -C "$STORAGE_PATH" .
echo "Backup complete: $stamp. Encrypt and copy it off-server."
