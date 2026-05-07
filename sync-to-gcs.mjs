#!/usr/bin/env node

/**
 * sync-to-gcs.mjs — Push local pipeline data to GCS
 *
 * Syncs data/, reports/, batch/ (excluding batch/logs/), and user-config/
 * (cv.md, portals.yml, modes/_profile.md, config/profile.yml,
 * article-digest.md) to the GCS bucket so Cloud Run has everything it needs.
 *
 * Guard: skips automatically when DATA_ROOT starts with /mnt/ (Cloud Run FUSE
 * mount already writes directly to GCS — no SDK sync needed there).
 *
 * Usage:
 *   node sync-to-gcs.mjs               # sync all directories + user config
 *   GCS_BUCKET=my-bucket node sync-to-gcs.mjs
 *
 * Authentication: Application Default Credentials (run `gcloud auth application-default login` once).
 */

import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BUCKET_NAME = process.env.GCS_BUCKET;
const DATA_ROOT = process.env.DATA_ROOT
  ? path.resolve(process.env.DATA_ROOT)
  : __dirname;

const SYNC_DIRS = [
  { local: path.join(DATA_ROOT, 'data'),    remote: 'data' },
  { local: path.join(DATA_ROOT, 'reports'), remote: 'reports' },
  { local: path.join(DATA_ROOT, 'batch'),   remote: 'batch' },
];

// Directories inside batch/ to skip (ephemeral logs not useful in cloud)
const SKIP_SUBDIRS = ['logs'];

// User config files that are gitignored and must be synced explicitly so
// Cloud Run has candidate context (CV, profile, portals) at runtime.
const USER_CONFIG_FILES = [
  { local: path.join(__dirname, 'cv.md'),                    remote: 'user-config/cv.md' },
  { local: path.join(__dirname, 'portals.yml'),              remote: 'user-config/portals.yml' },
  { local: path.join(__dirname, 'article-digest.md'),        remote: 'user-config/article-digest.md' },
  { local: path.join(__dirname, 'modes/_profile.md'),        remote: 'user-config/_profile.md' },
  { local: path.join(__dirname, 'config/profile.yml'),       remote: 'user-config/profile.yml' },
];

function collectFiles(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      // Skip excluded subdirectories (checked against top-level name only)
      const topLevel = relPath.split(path.sep)[0];
      if (SKIP_SUBDIRS.includes(topLevel)) continue;
      results.push(...collectFiles(fullPath, baseDir));
    } else {
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

export async function syncToGcs() {
  if (!BUCKET_NAME) {
    // Silently skip — GCS_BUCKET not configured (local-only mode)
    return;
  }

  const isCloudRun = DATA_ROOT.startsWith('/mnt/');
  if (isCloudRun) {
    // FUSE mount writes directly to GCS — nothing to do
    return;
  }

  const storage = new Storage();
  const bucket = storage.bucket(BUCKET_NAME);

  let uploaded = 0;
  let skipped = 0;
  const errors = [];

  for (const { local, remote } of SYNC_DIRS) {
    const files = collectFiles(local);
    for (const { fullPath, relPath } of files) {
      const destPath = `${remote}/${relPath.split(path.sep).join('/')}`;
      try {
        await bucket.upload(fullPath, {
          destination: destPath,
          resumable: false,
        });
        uploaded++;
      } catch (err) {
        errors.push(`${destPath}: ${err.message}`);
        skipped++;
      }
    }
  }

  // Sync user config files (gitignored, needed by Cloud Run at runtime)
  for (const { local, remote } of USER_CONFIG_FILES) {
    if (!fs.existsSync(local)) continue;
    try {
      await bucket.upload(local, { destination: remote, resumable: false });
      uploaded++;
    } catch (err) {
      errors.push(`${remote}: ${err.message}`);
      skipped++;
    }
  }

  if (errors.length > 0) {
    console.warn(`⚠️  GCS sync: ${errors.length} file(s) failed:`);
    errors.slice(0, 5).forEach((e) => console.warn(`   ${e}`));
    if (errors.length > 5) console.warn(`   ...and ${errors.length - 5} more`);
  }

  console.log(`☁️  Synced ${uploaded} file(s) to gs://${BUCKET_NAME} (${skipped} skipped)`);
}

// Allow running standalone: node sync-to-gcs.mjs
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!BUCKET_NAME) {
    console.error('Error: GCS_BUCKET environment variable is required.');
    console.error('  export GCS_BUCKET=applyiq-data-apply-iq-495519');
    process.exit(1);
  }
  syncToGcs().catch((err) => {
    console.error('Sync failed:', err.message);
    process.exit(1);
  });
}
