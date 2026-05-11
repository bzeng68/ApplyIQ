#!/usr/bin/env node
/**
 * sync-config-from-gcs.mjs
 *
 * Downloads user profile config files from GCS.
 * Used by remote routines to access personalized settings.
 *
 * Usage:
 *   GCS_BUCKET=applyiq-data-apply-iq-495519 PROFILE=bryan node scripts/sync-config-from-gcs.mjs
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const PROFILE = process.env.PROFILE || 'bryan';
const DATA_ROOT = path.join(APP_ROOT, 'profiles', PROFILE);
const GCS_BUCKET = process.env.GCS_BUCKET || 'applyiq-data-apply-iq-495519';

const CONFIG_FILES = [
  'portals.yml',
  'cv.md',
  'config/profile.yml',
  'modes/_profile.md',
  'article-digest.md'
];

const GCS_PREFIX = `gs://${GCS_BUCKET}/config/${PROFILE}`;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function downloadFile(localPath) {
  ensureDir(path.dirname(path.join(DATA_ROOT, localPath)));

  const fullPath = path.join(DATA_ROOT, localPath);
  const gcsPath = `${GCS_PREFIX}/${localPath}`;

  try {
    execSync(`gsutil cp "${gcsPath}" "${fullPath}"`, { stdio: 'inherit' });
    console.log(`✓ Downloaded ${localPath}`);
  } catch (err) {
    console.warn(`⊘ Could not download ${localPath} (may not exist): ${err.message}`);
  }
}

function main() {
  console.log(`Downloading config from GCS...`);
  console.log(`Bucket: ${GCS_BUCKET}`);
  console.log(`Profile: ${PROFILE}`);
  console.log(`Destination: ${DATA_ROOT}`);
  console.log('');

  for (const file of CONFIG_FILES) {
    downloadFile(file);
  }

  console.log('');
  console.log(`Config downloaded from ${GCS_PREFIX}`);
}

main();
