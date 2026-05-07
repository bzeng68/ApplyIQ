#!/usr/bin/env node
// Reads $DATA_ROOT/data/pipeline.md and stages unchecked URLs into $DATA_ROOT/batch/batch-input.tsv.
// Deduplicates by URL — existing entries are never re-added.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = process.env.DATA_ROOT
  ? path.resolve(process.env.DATA_ROOT)
  : path.resolve(__dirname, '..');

const PIPELINE_FILE = path.join(DATA_ROOT, 'data', 'pipeline.md');
const INPUT_FILE = path.join(DATA_ROOT, 'batch', 'batch-input.tsv');

if (!fs.existsSync(PIPELINE_FILE)) {
  console.log(`No pipeline.md found at ${PIPELINE_FILE} — nothing to stage.`);
  process.exit(0);
}

// Parse unchecked items from pipeline.md: - [ ] URL | Company | Role
const raw = fs.readFileSync(PIPELINE_FILE, 'utf8');
const unchecked = [];
for (const line of raw.split('\n')) {
  const m = line.match(/^- \[ \] (https?:\/\/\S+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*$/);
  if (m) unchecked.push({ url: m[1], source: m[2].trim(), notes: m[3].trim() });
}

if (unchecked.length === 0) {
  console.log('No unchecked offers in pipeline.md — nothing to stage.');
  process.exit(0);
}

// Load existing batch-input.tsv to get known URLs and max ID
const existingUrls = new Set();
let maxId = 0;

fs.mkdirSync(path.dirname(INPUT_FILE), { recursive: true });

if (fs.existsSync(INPUT_FILE)) {
  const lines = fs.readFileSync(INPUT_FILE, 'utf8').trim().split('\n').filter(Boolean);
  for (const line of lines.slice(1)) {
    const cols = line.split('\t');
    const id = Number(cols[0]);
    const url = cols[1]?.trim();
    if (url) existingUrls.add(url);
    if (Number.isFinite(id) && id > maxId) maxId = id;
  }
}

// Write header if file is new
if (!fs.existsSync(INPUT_FILE)) {
  fs.writeFileSync(INPUT_FILE, 'id\turl\tsource\tnotes\n');
}

// Append new entries
const newEntries = unchecked.filter((e) => !existingUrls.has(e.url));
if (newEntries.length === 0) {
  console.log(`All ${unchecked.length} pipeline.md offers already in batch-input.tsv.`);
  process.exit(0);
}

const rows = newEntries.map((e, i) => `${maxId + i + 1}\t${e.url}\t${e.source}\t${e.notes}`);
fs.appendFileSync(INPUT_FILE, rows.join('\n') + '\n');

console.log(`Staged ${newEntries.length} new offer(s) to ${INPUT_FILE} (${unchecked.length - newEntries.length} already present).`);
