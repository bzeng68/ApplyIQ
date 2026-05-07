#!/usr/bin/env bash
set -euo pipefail

export DATA_ROOT=${DATA_ROOT:-/mnt/data}
cd /app

# Restore user config files from GCS (synced locally via sync-to-gcs.mjs).
# These are gitignored so they are not baked into the container image.
USER_CONFIG="${DATA_ROOT}/user-config"
[ -f "${USER_CONFIG}/cv.md" ]          && cp "${USER_CONFIG}/cv.md"          /app/cv.md
[ -f "${USER_CONFIG}/portals.yml" ]    && cp "${USER_CONFIG}/portals.yml"    /app/portals.yml
[ -f "${USER_CONFIG}/article-digest.md" ] && cp "${USER_CONFIG}/article-digest.md" /app/article-digest.md
[ -f "${USER_CONFIG}/_profile.md" ]    && cp "${USER_CONFIG}/_profile.md"    /app/modes/_profile.md
if [ -f "${USER_CONFIG}/profile.yml" ]; then
  mkdir -p /app/config
  cp "${USER_CONFIG}/profile.yml" /app/config/profile.yml
fi

node scan.mjs
node scripts/evaluate-new.mjs
node build-dashboard-data.mjs

echo "Pipeline complete: $(date -u +%FT%TZ)"
