#!/usr/bin/env bash
set -euo pipefail

BASE_ROOT="${DATA_ROOT:-/mnt/data}"
PROFILES_BASE="${BASE_ROOT}/profiles"
cd /app

if [ ! -d "$PROFILES_BASE" ] || [ -z "$(ls -A "$PROFILES_BASE" 2>/dev/null)" ]; then
  echo "No profiles found at ${PROFILES_BASE}"
  exit 0
fi

for profile_dir in "${PROFILES_BASE}"/*/; do
  [ -d "$profile_dir" ] || continue
  PROFILE_NAME=$(basename "$profile_dir")
  export DATA_ROOT="$profile_dir"
  echo "=== Pipeline: ${PROFILE_NAME} ==="

  # Restore gitignored user config files from GCS (synced via sync-to-gcs.mjs)
  UC="${profile_dir}user-config"
  [ -f "${UC}/cv.md" ]             && cp "${UC}/cv.md"             /app/cv.md
  [ -f "${UC}/portals.yml" ]       && cp "${UC}/portals.yml"       /app/portals.yml
  [ -f "${UC}/article-digest.md" ] && cp "${UC}/article-digest.md" /app/article-digest.md
  [ -f "${UC}/_profile.md" ]       && cp "${UC}/_profile.md"       /app/modes/_profile.md
  if [ -f "${UC}/profile.yml" ]; then
    mkdir -p /app/config
    cp "${UC}/profile.yml" /app/config/profile.yml
  fi

  node scan.mjs
  node scripts/evaluate-new.mjs
  node build-dashboard-data.mjs

  echo "=== Done: ${PROFILE_NAME} ==="
done

echo "All profiles complete: $(date -u +%FT%TZ)"
