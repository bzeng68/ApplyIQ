#!/usr/bin/env node
// Checks if GCS data is fresh (< FRESHNESS_HOURS old).
// Exit 0 = fresh (pipeline should skip), Exit 2 = stale (proceed), Exit 1 = error/no GCS config.

import { Storage } from '@google-cloud/storage';

const BUCKET_NAME = process.env.GCS_BUCKET;
const PROFILE = process.env.PIPELINE_PROFILE ?? 'bryan';
const MAX_AGE_HOURS = Number(process.env.FRESHNESS_HOURS ?? 1);

if (!BUCKET_NAME) {
  console.log('GCS_BUCKET not set — treating as stale, proceeding.');
  process.exit(2);
}

const storage = new Storage();
const filePath = `profiles/${PROFILE}/data/dashboard-offers.json`;

try {
  const [meta] = await storage.bucket(BUCKET_NAME).file(filePath).getMetadata();
  const updated = new Date(meta.updated);
  const ageHours = (Date.now() - updated.getTime()) / 3_600_000;

  if (ageHours < MAX_AGE_HOURS) {
    console.log(`GCS data is ${ageHours.toFixed(1)}h old (< ${MAX_AGE_HOURS}h threshold) — skipping pipeline.`);
    process.exit(0);
  }

  console.log(`GCS data is ${ageHours.toFixed(1)}h old (>= ${MAX_AGE_HOURS}h threshold) — proceeding.`);
  process.exit(2);
} catch (err) {
  if (err.code === 404) {
    console.log(`GCS file not found (${filePath}) — treating as stale, proceeding.`);
    process.exit(2);
  }
  console.error(`GCS freshness check failed: ${err.message}`);
  process.exit(1);
}
