#!/bin/bash
set -e

# ApplyIQ local pipeline runner
# Runs the job offer evaluation pipeline locally with GCS sync

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
export DATA_ROOT="${DATA_ROOT:-${PROJECT_ROOT}/profiles/bryan}"
export GCS_BUCKET="${GCS_BUCKET:-applyiq-data-apply-iq-495519}"
export GOOGLE_APPLICATION_CREDENTIALS="${GOOGLE_APPLICATION_CREDENTIALS:-${HOME}/.gcp/apply-iq-key.json}"

echo "================================================"
echo "ApplyIQ Pipeline - Local Run"
echo "================================================"
echo "Time: $(date)"
echo "Data Root: $DATA_ROOT"
echo "GCS Bucket: $GCS_BUCKET"
echo ""

# Check for GCS credentials
if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "❌ GCS credentials not found at: $GOOGLE_APPLICATION_CREDENTIALS"
  echo "Set GOOGLE_APPLICATION_CREDENTIALS env var or place key at: $HOME/.gcp/apply-iq-key.json"
  exit 1
fi

echo "✓ GCS credentials found"
echo ""

# Setup
cd "$PROJECT_ROOT"

echo "🔄 Checking GCS for done/skip offers (Option A)..."
node scripts/skip-done-offers.mjs

echo ""
echo "🔄 Running sequential evaluation pipeline..."
node scripts/evaluate-new.mjs

echo ""
echo "📊 Building dashboard data..."
node build-dashboard-data.mjs

echo ""
echo "🔗 Merging tracker..."
node merge-tracker.mjs

echo ""
echo "📤 Syncing results to GCS..."
node scripts/sync-to-gcs.mjs || echo "⚠ GCS sync had issues"

echo ""
echo "✅ Pipeline complete!"
echo "Finished: $(date)"
