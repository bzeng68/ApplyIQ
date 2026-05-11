#!/usr/bin/env node
/**
 * skip-done-offers.mjs
 *
 * Option A: Prevents pipeline from re-evaluating offers marked as done/skip in GCS.
 * Updates batch-state.tsv to mark done/skip offers as 'completed'/'skipped'
 * so /career-ops sequential skips them.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_ROOT = process.env.DATA_ROOT || path.join(PROJECT_ROOT, 'profiles/bryan');
const GCS_BUCKET = process.env.GCS_BUCKET || 'applyiq-data-apply-iq-495519';

// Read TSV lines
function parseTsv(content) {
  return content.trim().split('\n').map(line => {
    const parts = line.split('\t');
    return {
      line,
      id: Number(parts[0]),
      date: parts[1],
      company: parts[2],
      role: parts[3],
      status: parts[4],
      score: parts[5],
      pdf: parts[6],
      report: parts[7],
      notes: parts[8],
    };
  });
}

function formatTsvLine(row) {
  return [row.id, row.date, row.company, row.role, row.status, row.score, row.pdf, row.report, row.notes].join('\t');
}

async function main() {
  console.log('📋 Checking for done/skip offers in GCS ui-state...');

  try {
    // Download ui-state from GCS
    const uiStateJson = execSync(
      `gsutil cat gs://${GCS_BUCKET}/ui-state/bryan/ui-state.json 2>/dev/null || echo '{}'`,
      { encoding: 'utf8' }
    );
    const uiState = JSON.parse(uiStateJson);
    const doneSet = new Set((uiState.done || []).map(Number));
    const skippedSet = new Set((uiState.skipped || []).map(Number));

    if (doneSet.size === 0 && skippedSet.size === 0) {
      console.log('✓ No done/skip offers found. Ready to evaluate.');
      return;
    }

    // Update batch-state.tsv
    const batchStateFile = path.join(DATA_ROOT, 'batch', 'batch-state.tsv');
    if (!fs.existsSync(batchStateFile)) {
      console.log('⚠ batch-state.tsv not found. Creating empty file.');
      fs.mkdirSync(path.dirname(batchStateFile), { recursive: true });
      fs.writeFileSync(batchStateFile, '');
      return;
    }

    const content = fs.readFileSync(batchStateFile, 'utf8');
    const lines = content.trim().split('\n');
    const updatedLines = lines.map(line => {
      if (!line.trim()) return line;
      const parts = line.split('\t');
      const id = Number(parts[0]);

      // Mark done offers as 'completed', skip offers as 'skipped'
      if (doneSet.has(id)) {
        parts[4] = 'completed'; // status column
        console.log(`  ✓ Marked #${id} as completed (was done)`);
      } else if (skippedSet.has(id)) {
        parts[4] = 'skipped'; // status column
        console.log(`  ✓ Marked #${id} as skipped`);
      }

      return parts.join('\t');
    });

    fs.writeFileSync(batchStateFile, updatedLines.join('\n') + '\n');
    console.log(`\n✓ Updated batch-state.tsv. Sequential will skip ${doneSet.size + skippedSet.size} offer(s).`);
  } catch (err) {
    console.error('⚠ Error checking GCS ui-state:', err.message);
    console.log('Proceeding anyway (will evaluate all unevaluated offers).');
  }
}

main().catch(console.error);
