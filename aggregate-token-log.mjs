#!/usr/bin/env node

/**
 * aggregate-token-log.mjs (repo root)
 *
 * Incremental aggregator: reads `reports/token-log.jsonl` and updates
 * `reports/token-aggregate.json` without reprocessing previously-aggregated lines.
 * Keeps a small state file `reports/token-aggregate-state.json` that stores
 * the number of lines processed.
 */

import fs from 'fs';

const LOG = 'reports/token-log.jsonl';
const OUT = 'reports/token-aggregate.json';
const STATE = 'reports/token-aggregate-state.json';

function readLines(path) {
  return fs.existsSync(path)
    ? fs.readFileSync(path, 'utf8').trim().split('\n').filter(Boolean)
    : [];
}

function loadState() {
  if (!fs.existsSync(STATE)) return { linesProcessed: 0 };
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { return { linesProcessed: 0 }; }
}

function saveState(state) {
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
}

function loadAggregate() {
  if (!fs.existsSync(OUT)) return [];
  try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { return []; }
}

function seriesToMap(series) {
  const map = {};
  for (const r of series) map[r.date] = { ...r };
  return map;
}

function mapToSeries(map) {
  return Object.values(map).sort((a,b) => a.date.localeCompare(b.date));
}

function computeCosts(row) {
  row.estimated_cost_sonnet = Number(( (row.input_tokens/1e6)*3 + (row.output_tokens/1e6)*15 ).toFixed(4));
  row.estimated_cost_haiku = Number(( (row.input_tokens/1e6)*0.8 + (row.output_tokens/1e6)*4 ).toFixed(4));
}

function rebuildFromLines(lines) {
  const byDay = {};
  for (const l of lines) {
    const entry = JSON.parse(l);
    const day = (entry.timestamp || new Date().toISOString()).slice(0,10);
    if (!byDay[day]) byDay[day] = { date: day, offers: 0, input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
    byDay[day].offers += entry.offers_evaluated || 1;
    byDay[day].input_tokens += entry.input_tokens || 0;
    byDay[day].output_tokens += entry.output_tokens || 0;
    byDay[day].cache_creation_input_tokens += entry.cache_creation_input_tokens || 0;
    byDay[day].cache_read_input_tokens += entry.cache_read_input_tokens || 0;
  }
  const series = mapToSeries(byDay);
  for (const row of series) computeCosts(row);
  return series;
}

function updateAggregateIncrementally(existingSeries, newLines) {
  const map = seriesToMap(existingSeries);
  for (const l of newLines) {
    const entry = JSON.parse(l);
    const day = (entry.timestamp || new Date().toISOString()).slice(0,10);
    if (!map[day]) map[day] = { date: day, offers: 0, input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
    map[day].offers += entry.offers_evaluated || 1;
    map[day].input_tokens += entry.input_tokens || 0;
    map[day].output_tokens += entry.output_tokens || 0;
    map[day].cache_creation_input_tokens += entry.cache_creation_input_tokens || 0;
    map[day].cache_read_input_tokens += entry.cache_read_input_tokens || 0;
  }
  const series = mapToSeries(map);
  for (const row of series) computeCosts(row);
  return series;
}

function main() {
  const lines = readLines(LOG);
  const state = loadState();

  // If log was truncated (fewer lines than processed), rebuild from scratch
  if (lines.length < (state.linesProcessed || 0)) {
    console.log('Detected truncated token log — rebuilding aggregate from scratch');
    const series = rebuildFromLines(lines);
    fs.mkdirSync('reports', { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(series, null, 2));
    saveState({ linesProcessed: lines.length });
    console.log(`Wrote ${OUT} (${series.length} days)`);
    return;
  }

  const newLines = lines.slice(state.linesProcessed || 0);
  if (newLines.length === 0) {
    console.log('No new token-log entries to process');
    return;
  }

  const existingSeries = loadAggregate();
  const updated = updateAggregateIncrementally(existingSeries, newLines);
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(updated, null, 2));
  saveState({ linesProcessed: lines.length });
  console.log(`Processed ${newLines.length} new lines — updated ${OUT} (${updated.length} days)`);
}

main();
