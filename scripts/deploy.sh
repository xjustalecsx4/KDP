#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Deployment refused: commit or stash local changes first." >&2
  exit 1
fi
if [[ ! -f .env.local ]]; then echo "Configure .env.local before deployment." >&2; exit 1; fi
git pull --ff-only
npm ci
npm run db:migrate
npm run build
export GIT_COMMIT="$(git rev-parse HEAD)"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
echo "Deployment completed. Verify /api/health and /admin/health."
