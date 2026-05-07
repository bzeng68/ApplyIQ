#!/usr/bin/env node
// Filter offers from batch-input.tsv based on portals.yml title filters
// Output: filtered offers to stdout + summary stats

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = process.env.DATA_ROOT
  ? path.resolve(process.env.DATA_ROOT)
  : path.resolve(__dirname, '..');

const PORTALS_FILE = path.join(DATA_ROOT, 'portals.yml');
const INPUT_FILE = path.join(DATA_ROOT, 'batch', 'batch-input.tsv');

if (!fs.existsSync(PORTALS_FILE)) {
  console.error(`Error: ${PORTALS_FILE} not found`);
  process.exit(1);
}

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`Error: ${INPUT_FILE} not found`);
  process.exit(1);
}

// Load filters from portals.yml
const portalsRaw = fs.readFileSync(PORTALS_FILE, 'utf8');
const portals = yaml.load(portalsRaw);
const titleFilter = portals.title_filter || {};
const positiveKeywords = (titleFilter.positive || []).map(k => k.toLowerCase());
const negativeKeywords = (titleFilter.negative || []).map(k => k.toLowerCase());

// Read batch-input.tsv
const lines = fs.readFileSync(INPUT_FILE, 'utf8').trim().split('\n').filter(Boolean);
const header = lines[0].split('\t');
const offers = lines.slice(1).map(line => {
  const cols = line.split('\t');
  return {
    id: cols[0],
    url: cols[1],
    source: cols[2],
    notes: cols[3],
  };
});

// Filter function
function passesFilter(title) {
  const titleLower = title.toLowerCase();

  // Check negative keywords — ANY match = fail
  for (const neg of negativeKeywords) {
    if (titleLower.includes(neg)) return false;
  }

  // Check positive keywords — AT LEAST ONE match = pass
  if (positiveKeywords.length === 0) return true; // no positive filter = pass all
  for (const pos of positiveKeywords) {
    if (titleLower.includes(pos)) return true;
  }

  return false;
}

// Filter and print results
const filtered = offers.filter(o => passesFilter(o.notes));

console.log(`\n=== Offer Filtering Results ===`);
console.log(`Total offers: ${offers.length}`);
console.log(`Matching filters: ${filtered.length}`);
console.log(`Filtered out: ${offers.length - filtered.length}`);
console.log(`Match rate: ${((filtered.length / offers.length) * 100).toFixed(1)}%\n`);

console.log(`=== Filtered Offers (${filtered.length}) ===\n`);
console.log(`id\tcompany\trole`);
for (const o of filtered) {
  console.log(`${o.id}\t${o.source}\t${o.notes}`);
}

console.log(`\n=== Filtered Out Examples ===\n`);
const rejected = offers.filter(o => !passesFilter(o.notes)).slice(0, 10);
for (const o of rejected) {
  console.log(`${o.id}\t${o.source}\t${o.notes}`);
}
