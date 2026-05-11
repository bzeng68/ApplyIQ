#!/usr/bin/env node
/**
 * sync-config-to-gcs.mjs
 *
 * Uploads user profile config files to GCS so remote routines can access them.
 *
 * Usage:
 *   GCS_BUCKET=applyiq-data-apply-iq-495519 node scripts/sync-config-to-gcs.mjs
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

function uploadFile(localPath) {
  const fullPath = path.join(DATA_ROOT, localPath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⊘ Skipping ${localPath} (not found)`);
    return;
  }

  const gcsPath = `${GCS_PREFIX}/${localPath}`;

  try {
    execSync(`gsutil cp "${fullPath}" "${gcsPath}"`, { stdio: 'inherit' });
    console.log(`✓ Uploaded ${localPath}`);
  } catch (err) {
    console.error(`✗ Failed to upload ${localPath}: ${err.message}`);
    process.exit(1);
  }
}

function main() {
  console.log(`Syncing config to GCS...`);
  console.log(`Bucket: ${GCS_BUCKET}`);
  console.log(`Profile: ${PROFILE}`);
  console.log(`Source: ${DATA_ROOT}`);
  console.log('');

  for (const file of CONFIG_FILES) {
    uploadFile(file);
  }

  console.log('');
  console.log(`Config synced to ${GCS_PREFIX}`);
}

main();
