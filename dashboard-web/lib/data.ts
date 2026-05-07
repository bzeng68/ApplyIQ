import fs from 'fs';
import path from 'path';
import { findReportFile, normalizeReportNum, parseReport, readTsv } from './parsers';

const ROOT = process.env.DATA_ROOT
  ? path.resolve(process.env.DATA_ROOT)
  : path.resolve(process.cwd(), '..');
const DATA_DIR = path.join(ROOT, 'data');
const REPORTS_DIR = path.join(ROOT, 'reports');
const BATCH_DIR = path.join(ROOT, 'batch');

const STATE_FILE = path.join(BATCH_DIR, 'batch-state.tsv');
const INPUT_FILE = path.join(BATCH_DIR, 'batch-input.tsv');
const SCAN_FILE = path.join(DATA_DIR, 'scan-history.tsv');
const UI_STATE_FILE = path.join(DATA_DIR, 'ui-state.json');
const DASHBOARD_FILE = path.join(DATA_DIR, 'dashboard-offers.json');

export type Offer = {
  id: number;
  url: string;
  company: string | null;
  role: string | null;
  score: number | null;
  status: string | null;
  report_num: string | null;
  report_file: string | null;
  archetype: string | null;
  legitimacy: string | null;
  remote: string | null;
  scanned_at: string | null;
  evaluated_at: string | null;
  done: boolean;
  skipped?: boolean;
};

function loadUiState() {
  if (!fs.existsSync(UI_STATE_FILE)) return { done: [], skipped: [] };
  try {
    const data = JSON.parse(fs.readFileSync(UI_STATE_FILE, 'utf8'));
    return {
      done: Array.isArray(data.done) ? data.done : [],
      skipped: Array.isArray(data.skipped) ? data.skipped : [],
    };
  } catch (e) {
    return { done: [], skipped: [] };
  }
}

function buildOffers() {
  const inputs = readTsv(INPUT_FILE);
  const states = readTsv(STATE_FILE);
  const scans = readTsv(SCAN_FILE);
  const uiState = loadUiState();
  const doneSet = new Set((uiState.done || []).map((id: number) => Number(id)));
  const skippedSet = new Set((uiState.skipped || []).map((id: number) => Number(id)));

  const stateById = new Map(states.map((row) => [Number(row.id), row]));
  const scanByUrl = new Map(scans.map((row) => [row.url, row]));

  const offers: Offer[] = [];

  for (const row of inputs) {
    const id = Number(row.id);
    if (!id || !row.url) continue;
    const state = stateById.get(id);
    if (!state) continue;
    if (state.status !== 'completed' && state.status !== 'skipped') continue;

    const reportNum = normalizeReportNum(state.report_num);
    const reportFile = reportNum ? findReportFile(REPORTS_DIR, reportNum) : null;
    const reportPath = reportFile ? path.join(REPORTS_DIR, reportFile) : null;
    const reportMeta = parseReport(reportPath);
    const scan = scanByUrl.get(row.url) || {};

    offers.push({
      id,
      url: row.url,
      company: row.source || null,
      role: row.notes || null,
      score: state.score && state.score !== '-' ? Number(state.score) : null,
      status: state.status || null,
      report_num: reportNum,
      report_file: reportFile,
      archetype: reportMeta.archetype || null,
      legitimacy: reportMeta.legitimacy || null,
      remote: reportMeta.remote || null,
      scanned_at: scan.first_seen || null,
      evaluated_at: state.completed_at || null,
      done: doneSet.has(id),
      skipped: skippedSet.has(id),
    });
  }

  return offers;
}

export function loadDashboardOffers(): Offer[] {
  const uiState = loadUiState();
  const doneSet = new Set((uiState.done || []).map((id: number) => Number(id)));
  const skippedSet = new Set((uiState.skipped || []).map((id: number) => Number(id)));

  if (fs.existsSync(DASHBOARD_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(DASHBOARD_FILE, 'utf8')) as Offer[];
      return raw.map((offer) => ({
        ...offer,
        done: doneSet.has(Number(offer.id)),
        skipped: skippedSet.has(Number(offer.id)),
      }));
    } catch (e) {
      return buildOffers();
    }
  }

  return buildOffers();
}

export function updateDoneState(id: number, done?: boolean) {
  const uiState = loadUiState();
  const doneSet = new Set((uiState.done || []).map((entry: number) => Number(entry)));
  if (typeof done === 'boolean') {
    done ? doneSet.add(id) : doneSet.delete(id);
  } else {
    doneSet.has(id) ? doneSet.delete(id) : doneSet.add(id);
  }
  const nextState = {
    done: Array.from(doneSet).sort((a, b) => (a as number) - (b as number)),
    skipped: uiState.skipped || [],
  };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(UI_STATE_FILE, JSON.stringify(nextState, null, 2));
  return nextState;
}

export function updateSkipState(id: number, skipped?: boolean) {
  const uiState = loadUiState();
  const skippedSet = new Set((uiState.skipped || []).map((entry: number) => Number(entry)));
  if (typeof skipped === 'boolean') {
    skipped ? skippedSet.add(id) : skippedSet.delete(id);
  } else {
    skippedSet.has(id) ? skippedSet.delete(id) : skippedSet.add(id);
  }
  const nextState = {
    done: uiState.done || [],
    skipped: Array.from(skippedSet).sort((a, b) => (a as number) - (b as number)),
  };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(UI_STATE_FILE, JSON.stringify(nextState, null, 2));
  return nextState;
}

export function findReportByNum(num: string) {
  const normalized = normalizeReportNum(num);
  if (!normalized) return null;
  const file = findReportFile(REPORTS_DIR, normalized);
  return file ? path.join(REPORTS_DIR, file) : null;
}

export function findJdById(id: string) {
  const file = path.join(DATA_DIR, 'jds', `${id}.txt`);
  return fs.existsSync(file) ? file : null;
}
