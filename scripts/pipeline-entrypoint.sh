#!/usr/bin/env bash
set -euo pipefail

export DATA_ROOT=${DATA_ROOT:-/mnt/data}
cd /app

node scan.mjs
node scripts/evaluate-new.mjs
node build-dashboard-data.mjs

echo "Pipeline complete: $(date -u +%FT%TZ)"
