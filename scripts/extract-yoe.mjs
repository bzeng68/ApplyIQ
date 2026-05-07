#!/usr/bin/env node
// Extract years of experience requirements from job postings
// Reads batch-input.tsv, fetches each URL, extracts YOE, reports match against Bryan (2 YOE)

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = process.env.DATA_ROOT
  ? path.resolve(process.env.DATA_ROOT)
  : path.resolve(__dirname, '..');

const INPUT_FILE = path.join(DATA_ROOT, 'batch', 'batch-input.tsv');
const BRYAN_YOE = 2; // Bryan has 2 years production experience + M.S. in progress

// Regex patterns for YOE extraction
const yoePatterns = [
  /(\d+)\+?\s*(?:years?|yrs?)\s+of\s+(?:professional\s+)?(?:software\s+)?engineering/gi,
  /(\d+)\+?\s*(?:years?|yrs?)\s+(?:experience|exp)/gi,
  /(\d+)-(\d+)\s*(?:years?|yrs?)/gi, // range like 3-5 years
  /(?:minimum|at least|required)\s+(\d+)\s+(?:years?|yrs?)/gi,
];

function extractYOE(text) {
  if (!text) return null;

  // Try each pattern
  for (const pattern of yoePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        if (match[2]) {
          // Range: return both min and max
          return { min: parseInt(match[1]), max: parseInt(match[2]) };
        }
        return parseInt(match[1]);
      }
    }
  }

  return null;
}

async function fetchJDText(url) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const text = await page.evaluate(() => document.body.innerText);
    await page.close();

    return text;
  } catch (err) {
    console.error(`  ⚠️  Failed to fetch ${url}: ${err.message}`);
    return null;
  } finally {
    await browser.close();
  }
}

function evaluateMatch(yoe, bryantYOE = BRYAN_YOE) {
  if (yoe === null) return { status: 'unknown', reason: 'Could not extract YOE requirement' };

  if (typeof yoe === 'object' && yoe.min && yoe.max) {
    // Range
    if (bryantYOE >= yoe.min && bryantYOE <= yoe.max) {
      return { status: 'match', reason: `${bryantYOE} YOE fits ${yoe.min}-${yoe.max} range` };
    }
    if (bryantYOE < yoe.min) {
      const gap = yoe.min - bryantYOE;
      return { status: 'underleveled', reason: `${bryantYOE} YOE < ${yoe.min}-${yoe.max} min (gap: ${gap} YOE)` };
    }
    return { status: 'overleveled', reason: `${bryantYOE} YOE > ${yoe.max} max` };
  }

  // Single number
  if (yoe <= bryantYOE + 1) {
    return { status: 'match', reason: `${bryantYOE} YOE >= ${yoe} required` };
  }
  const gap = yoe - bryantYOE;
  return { status: 'underleveled', reason: `${bryantYOE} YOE < ${yoe} required (gap: ${gap} YOE)` };
}

async function main() {
  // Read filtered offers
  const lines = fs.readFileSync(INPUT_FILE, 'utf8').trim().split('\n').filter(Boolean);
  const offers = lines.slice(1).map(line => {
    const cols = line.split('\t');
    return { id: cols[0], url: cols[1], source: cols[2], role: cols[3] };
  });

  console.log(`\n=== YOE Extraction & Match Analysis ===\n`);
  console.log(`Total offers to analyze: ${offers.length}`);
  console.log(`Bryan's YOE: ${BRYAN_YOE} years + M.S. in progress\n`);

  let matchCount = 0;
  let underleveledCount = 0;
  let overleveledCount = 0;
  let unknownCount = 0;

  const results = [];

  for (let i = 0; i < offers.length; i++) {
    const offer = offers[i];
    process.stdout.write(`[${i + 1}/${offers.length}] ${offer.source}: ${offer.role}... `);

    const jdText = await fetchJDText(offer.url);
    const yoe = jdText ? extractYOE(jdText) : null;
    const match = evaluateMatch(yoe);

    results.push({ id: offer.id, source: offer.source, role: offer.role, yoe, match });

    if (match.status === 'match') matchCount++;
    else if (match.status === 'underleveled') underleveledCount++;
    else if (match.status === 'overleveled') overleveledCount++;
    else unknownCount++;

    console.log(`${match.status.toUpperCase()}`);
    console.log(`    YOE: ${JSON.stringify(yoe)} | ${match.reason}\n`);
  }

  console.log(`\n=== Summary (all ${results.length} offers) ===`);
  console.log(`✅ Match: ${matchCount}`);
  console.log(`⚠️  Underleveled: ${underleveledCount}`);
  console.log(`❌ Overleveled: ${overleveledCount}`);
  console.log(`❓ Unknown: ${unknownCount}\n`);

  // Write results to CSV for review
  const csvPath = path.join(DATA_ROOT, 'batch', 'yoe-analysis.csv');
  const csv = ['ID,Company,Role,Required YOE,Match Status,Reason'].concat(
    results.map(r =>
      `${r.id},"${r.source}","${r.role}",${JSON.stringify(r.yoe)},"${r.match.status}","${r.match.reason}"`
    )
  ).join('\n');

  fs.writeFileSync(csvPath, csv);
  console.log(`Results saved to: ${csvPath}`);
}

main().catch(console.error);
