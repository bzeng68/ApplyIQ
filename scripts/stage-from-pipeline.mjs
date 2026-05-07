#!/usr/bin/env node
/**
 * stage-from-pipeline.mjs
 *
 * Reads pipeline.md unchecked items, fetches each JD, does a lightweight
 * YOE check (requires <= YOE_THRESHOLD), caches the JD text, and appends
 * qualified offers to batch-input.tsv. Marks every processed URL as
 * checked in pipeline.md so it is never re-processed.
 *
 * Usage:
 *   DATA_ROOT=profiles/bryan node scripts/stage-from-pipeline.mjs
 *
 * Env vars:
 *   DATA_ROOT       — profile root (default: project root)
 *   YOE_THRESHOLD   — max YOE to accept (default: 3)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT   = path.resolve(__dirname, '..');
const DATA_ROOT  = process.env.DATA_ROOT ? path.resolve(process.env.DATA_ROOT) : APP_ROOT;

const YOE_THRESHOLD = parseInt(process.env.YOE_THRESHOLD ?? '3', 10);

const PIPELINE_PATH = path.join(DATA_ROOT, 'data', 'pipeline.md');
const BATCH_INPUT   = path.join(DATA_ROOT, 'batch', 'batch-input.tsv');
const JDS_DIR       = path.join(DATA_ROOT, 'data', 'jds');

// ── YOE extraction ────────────────────────────────────────────────────

const YOE_PATTERNS = [
  /(\d+)\s*\+?\s*years?\s+of\s+(?:professional\s+)?(?:software\s+)?(?:engineering|experience)/gi,
  /(\d+)\s*\+?\s*years?\s+(?:experience|exp)/gi,
  /(\d+)-(\d+)\s*years?/gi,
  /(?:minimum|at least|requires?)\s+(\d+)\s+years?/gi,
];

function extractYoe(text) {
  if (!text) return null;
  for (const pattern of YOE_PATTERNS) {
    for (const m of text.matchAll(pattern)) {
      const lo = parseInt(m[1], 10);
      const hi = m[2] ? parseInt(m[2], 10) : null;
      return hi ? { min: lo, max: hi } : lo;
    }
  }
  return null;
}

function yoeFits(yoe) {
  if (yoe === null) return true; // no explicit requirement — assume entry-friendly
  if (typeof yoe === 'object') return yoe.min <= YOE_THRESHOLD;
  return yoe <= YOE_THRESHOLD;
}

function yoeLabel(yoe) {
  if (yoe === null) return 'no req stated';
  if (typeof yoe === 'object') return `${yoe.min}-${yoe.max} YOE`;
  return `${yoe} YOE`;
}

// ── pipeline.md helpers ───────────────────────────────────────────────

function readUnchecked(pipelinePath) {
  if (!fs.existsSync(pipelinePath)) return [];
  const lines = fs.readFileSync(pipelinePath, 'utf-8').split('\n');
  const items = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^- \[ \] (https?:\/\/\S+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*$/);
    if (m) items.push({ lineIndex: i, url: m[1], company: m[2].trim(), title: m[3].trim() });
  }
  return items;
}

function markChecked(pipelinePath, lineIndices) {
  if (lineIndices.length === 0) return;
  const lines = fs.readFileSync(pipelinePath, 'utf-8').split('\n');
  for (const idx of lineIndices) {
    lines[idx] = lines[idx].replace('- [ ]', '- [x]');
  }
  fs.writeFileSync(pipelinePath, lines.join('\n'), 'utf-8');
}

// ── batch-input.tsv helpers ───────────────────────────────────────────

function loadBatchInput(batchPath) {
  if (!fs.existsSync(batchPath)) return { urls: new Set(), nextId: 1 };
  const lines = fs.readFileSync(batchPath, 'utf-8').trim().split('\n').filter(Boolean);
  const urls = new Set();
  let maxId = 0;
  for (const line of lines.slice(1)) {
    const cols = line.split('\t');
    if (cols[1]) urls.add(cols[1].trim());
    const id = parseInt(cols[0], 10);
    if (!isNaN(id) && id > maxId) maxId = id;
  }
  return { urls, nextId: maxId + 1 };
}

function appendToBatchInput(batchPath, entries) {
  if (entries.length === 0) return;
  if (!fs.existsSync(batchPath)) {
    fs.mkdirSync(path.dirname(batchPath), { recursive: true });
    fs.writeFileSync(batchPath, 'id\turl\tsource\tnotes\n', 'utf-8');
  }
  const rows = entries.map(e => `${e.id}\t${e.url}\t${e.company}\t${e.title}`).join('\n') + '\n';
  fs.appendFileSync(batchPath, rows, 'utf-8');
}

// ── JD fetching ───────────────────────────────────────────────────────

async function fetchJd(url) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(12000);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    return await page.evaluate(() => document.body.innerText);
  } catch (err) {
    console.error(`  ⚠  fetch failed: ${err.message}`);
    return null;
  } finally {
    await browser.close();
  }
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  const unchecked = readUnchecked(PIPELINE_PATH);

  if (unchecked.length === 0) {
    console.log('No unchecked items in pipeline.md — nothing to stage.');
    return;
  }

  console.log(`\n=== Stage from Pipeline ===`);
  console.log(`YOE threshold : <= ${YOE_THRESHOLD}`);
  console.log(`Unchecked     : ${unchecked.length} items\n`);

  fs.mkdirSync(JDS_DIR, { recursive: true });

  const { urls: existingUrls, nextId } = loadBatchInput(BATCH_INPUT);
  let currentId = nextId;

  const toAdd = [];
  const processedIndices = [];
  let accepted = 0, rejected = 0, skipped = 0;

  for (let i = 0; i < unchecked.length; i++) {
    const { lineIndex, url, company, title } = unchecked[i];
    process.stdout.write(`[${i + 1}/${unchecked.length}] ${company}: ${title}... `);

    if (existingUrls.has(url)) {
      console.log('SKIP (already in batch-input)');
      processedIndices.push(lineIndex);
      skipped++;
      continue;
    }

    const jdText = await fetchJd(url);
    if (!jdText) {
      console.log('SKIP (fetch failed)');
      processedIndices.push(lineIndex);
      skipped++;
      continue;
    }

    const yoe  = extractYoe(jdText);
    const fits = yoeFits(yoe);

    if (fits) {
      const id = currentId++;
      fs.writeFileSync(path.join(JDS_DIR, `${id}.txt`), jdText, 'utf-8');
      toAdd.push({ id, url, company, title });
      accepted++;
      console.log(`ACCEPTED (${yoeLabel(yoe)})`);
    } else {
      rejected++;
      console.log(`REJECTED (${yoeLabel(yoe)} > threshold ${YOE_THRESHOLD})`);
    }

    processedIndices.push(lineIndex);
  }

  appendToBatchInput(BATCH_INPUT, toAdd);
  markChecked(PIPELINE_PATH, processedIndices);

  console.log(`\n=== Summary ===`);
  console.log(`Accepted : ${accepted}  (queued + JD cached)`);
  console.log(`Rejected : ${rejected}  (YOE too high)`);
  console.log(`Skipped  : ${skipped}   (already queued or fetch failed)`);
  console.log(`Total    : ${unchecked.length}`);
}

main().catch(console.error);
