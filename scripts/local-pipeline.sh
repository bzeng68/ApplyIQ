#!/usr/bin/env bash
# Local pipeline — always runs (no freshness gate).
# Uses claude -p workers (Claude Max plan) instead of the SDK.
# Run manually or via launchd daily at 4 PM.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PROFILE="${PIPELINE_PROFILE:-bryan}"
export DATA_ROOT="$APP_ROOT/profiles/$PROFILE"
export GCS_BUCKET="${GCS_BUCKET:-applyiq-data-apply-iq-495519}"

cd "$APP_ROOT"

echo "=== ApplyIQ local pipeline: $PROFILE ==="
echo "DATA_ROOT: $DATA_ROOT"
echo "Started: $(date)"
echo ""

echo "=== [1/5] Scanning portals ==="
node scan.mjs

echo ""
echo "=== [2/5] Staging new URLs to batch-input.tsv ==="
node scripts/stage-from-pipeline.mjs

echo ""
echo "=== [3/5] Evaluating via Claude Code (batch-runner.sh) ==="
bash batch/batch-runner.sh --parallel 2

echo ""
echo "=== [4/5] Merging tracker entries ==="
node merge-tracker.mjs

echo ""
echo "=== [5/5] Building dashboard data ==="
GCS_BUCKET="$GCS_BUCKET" DATA_ROOT="$DATA_ROOT" node build-dashboard-data.mjs

echo ""
echo "=== [6/6] Syncing to GCS ==="
GCS_BUCKET="$GCS_BUCKET" node sync-to-gcs.mjs

echo ""
echo "=== [7/7] Deploying dashboard data ==="
# Copy built dashboard JSON to public/ for next Docker build
mkdir -p dashboard-web/public
cp "$DATA_ROOT/data/dashboard-offers.json" dashboard-web/public/dashboard-offers.json
echo "Dashboard ready for deployment: dashboard-web/public/dashboard-offers.json"

echo ""
echo "=== Local pipeline complete: $(date) ==="
echo ""
echo "Next steps:"
echo "  1. Commit dashboard-offers.json: git add dashboard-web/public/dashboard-offers.json && git commit -m 'chore: update dashboard data'"
echo "  2. Push to trigger Cloud Run deployment: git push origin main"
