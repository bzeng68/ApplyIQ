import fs from 'fs';
import path from 'path';
import { findReportFile, normalizeReportNum, parseReport, readTsv } from './parsers';
import { readFromGCS, writeToGCS } from './gcs';

const BASE_ROOT = process.env.DATA_ROOT
  ? path.resolve(process.env.DATA_ROOT)
  : path.resolve(process.cwd(), '..');

function profilePaths(profile: string) {
  const root = path.join(BASE_ROOT, 'profiles', profile);
  return {
    DATA_DIR:       path.join(root, 'data'),
    REPORTS_DIR:    path.join(root, 'reports'),
    BATCH_DIR:      path.join(root, 'batch'),
    UI_STATE_FILE:  path.join(root, 'data', 'ui-state.json'),
    DASHBOARD_FILE: path.join(root, 'data', 'dashboard-offers.json'),
    STATE_FILE:     path.join(root, 'batch', 'batch-state.tsv'),
    INPUT_FILE:     path.join(root, 'batch', 'batch-input.tsv'),
    SCAN_FILE:      path.join(root, 'data', 'scan-history.tsv'),
  };
}

export function listProfiles(): string[] {
  const dir = path.join(BASE_ROOT, 'profiles');
  if (fs.existsSync(dir)) {
    const profiles = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    if (profiles.length > 0) return profiles;
  }
  // Fallback: if no profiles dir or empty, check for root data/ (backward compat)
  const rootDataFile = path.join(BASE_ROOT, 'data', 'dashboard-offers.json');
  if (fs.existsSync(rootDataFile)) {
    return ['default'];
  }
  return [];
}

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

export function loadUiStateForProfile(profile: string) {
  return loadUiState(profilePaths(profile).UI_STATE_FILE);
}

export async function loadUiStateForProfileAsync(profile: string) {
  return loadUiStateFromGCS(profile);
}

function loadUiState(uiStateFile: string) {
  if (!fs.existsSync(uiStateFile)) return { done: [], skipped: [] };
  try {
    const data = JSON.parse(fs.readFileSync(uiStateFile, 'utf8'));
    return {
      done: Array.isArray(data.done) ? data.done : [],
      skipped: Array.isArray(data.skipped) ? data.skipped : [],
    };
  } catch {
    return { done: [], skipped: [] };
  }
}

function buildOffers(p: ReturnType<typeof profilePaths>): Offer[] {
  const inputs = readTsv(p.INPUT_FILE);
  const states = readTsv(p.STATE_FILE);
  const scans = readTsv(p.SCAN_FILE);
  const uiState = loadUiState(p.UI_STATE_FILE);
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
    const reportFile = reportNum ? findReportFile(p.REPORTS_DIR, reportNum) : null;
    const reportPath = reportFile ? path.join(p.REPORTS_DIR, reportFile) : null;
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
      scanned_at: (scan as Record<string, string>).first_seen || null,
      evaluated_at: state.completed_at || null,
      done: doneSet.has(id),
      skipped: skippedSet.has(id),
    });
  }

  return offers;
}

export function loadDashboardOffers(profile: string): Offer[] {
  const p = profilePaths(profile);
  const uiState = loadUiState(p.UI_STATE_FILE);
  const doneSet = new Set((uiState.done || []).map((id: number) => Number(id)));
  const skippedSet = new Set((uiState.skipped || []).map((id: number) => Number(id)));

  // Try profile-specific path first
  if (fs.existsSync(p.DASHBOARD_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(p.DASHBOARD_FILE, 'utf8')) as Offer[];
      return raw.map((offer) => ({
        ...offer,
        done: doneSet.has(Number(offer.id)),
        skipped: skippedSet.has(Number(offer.id)),
      }));
    } catch {
      // Fall through to buildOffers
    }
  }

  // Fallback to root data/ path for backward compat (e.g., Cloud Run FUSE mount)
  const rootDashboardFile = path.join(BASE_ROOT, 'data', 'dashboard-offers.json');
  if (fs.existsSync(rootDashboardFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(rootDashboardFile, 'utf8')) as Offer[];
      return raw.map((offer) => ({
        ...offer,
        done: doneSet.has(Number(offer.id)),
        skipped: skippedSet.has(Number(offer.id)),
      }));
    } catch {
      // Fall through to buildOffers
    }
  }

  return buildOffers(p);
}

export function updateDoneState(id: number, profile: string, done?: boolean) {
  const p = profilePaths(profile);
  const uiState = loadUiState(p.UI_STATE_FILE);
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
  fs.mkdirSync(p.DATA_DIR, { recursive: true });
  fs.writeFileSync(p.UI_STATE_FILE, JSON.stringify(nextState, null, 2));
  return nextState;
}

export function updateSkipState(id: number, profile: string, skipped?: boolean) {
  const p = profilePaths(profile);
  const uiState = loadUiState(p.UI_STATE_FILE);
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
  fs.mkdirSync(p.DATA_DIR, { recursive: true });
  fs.writeFileSync(p.UI_STATE_FILE, JSON.stringify(nextState, null, 2));
  return nextState;
}

export function findReportByNum(num: string, profile: string) {
  const p = profilePaths(profile);
  const normalized = normalizeReportNum(num);
  if (!normalized) return null;
  const file = findReportFile(p.REPORTS_DIR, normalized);
  return file ? path.join(p.REPORTS_DIR, file) : null;
}

export function findJdById(id: string, profile: string) {
  const p = profilePaths(profile);
  const file = path.join(p.DATA_DIR, 'jds', `${id}.txt`);
  return fs.existsSync(file) ? file : null;
}

async function loadUiStateFromGCS(profile: string): Promise<{ done: number[]; skipped: number[] }> {
  const gcsPath = `ui-state/${profile}/ui-state.json`;
  const content = await readFromGCS(gcsPath);
  if (content) {
    try {
      const data = JSON.parse(content);
      return {
        done: Array.isArray(data.done) ? (data.done as number[]) : [],
        skipped: Array.isArray(data.skipped) ? (data.skipped as number[]) : [],
      };
    } catch {
      // Fall through to local fallback
    }
  }
  // Fallback to local file (written as backup on every state update)
  return loadUiState(profilePaths(profile).UI_STATE_FILE);
}

async function saveUiStateToGCS(profile: string, state: { done: number[]; skipped: number[] }) {
  const gcsPath = `ui-state/${profile}/ui-state.json`;
  const content = JSON.stringify(state, null, 2);
  return writeToGCS(gcsPath, content);
}

export async function updateDoneStateAsync(id: number, profile: string, done?: boolean) {
  const uiState = await loadUiStateFromGCS(profile);
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
  await saveUiStateToGCS(profile, nextState);
  // Best-effort local backup (no-op in Cloud Run where FS is read-only)
  try {
    const p = profilePaths(profile);
    fs.mkdirSync(p.DATA_DIR, { recursive: true });
    fs.writeFileSync(p.UI_STATE_FILE, JSON.stringify(nextState, null, 2));
  } catch { /* ignore — GCS is source of truth */ }
  return nextState;
}

export async function updateSkipStateAsync(id: number, profile: string, skipped?: boolean) {
  const uiState = await loadUiStateFromGCS(profile);
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
  await saveUiStateToGCS(profile, nextState);
  // Best-effort local backup (no-op in Cloud Run where FS is read-only)
  try {
    const p = profilePaths(profile);
    fs.mkdirSync(p.DATA_DIR, { recursive: true });
    fs.writeFileSync(p.UI_STATE_FILE, JSON.stringify(nextState, null, 2));
  } catch { /* ignore — GCS is source of truth */ }
  return nextState;
}

// Option A: Filter offers to exclude those marked done/skip in GCS ui-state
export async function filterUnevaluatedOffers(profile: string): Promise<number[]> {
  const p = profilePaths(profile);
  const inputs = readTsv(p.INPUT_FILE);
  const states = readTsv(p.STATE_FILE);
  const uiState = await loadUiStateFromGCS(profile);
  const doneSet = new Set((uiState.done || []).map((id: number) => Number(id)));
  const skippedSet = new Set((uiState.skipped || []).map((id: number) => Number(id)));

  const stateById = new Map(states.map((row) => [Number(row.id), row]));
  const unevaluated: number[] = [];

  for (const row of inputs) {
    const id = Number(row.id);
    if (!id) continue;
    const state = stateById.get(id);
    if (!state) continue;
    // Skip if marked as done/skipped in GCS, or already completed
    if (doneSet.has(id) || skippedSet.has(id) || state.status === 'completed' || state.status === 'skipped') {
      continue;
    }
    unevaluated.push(id);
  }

  return unevaluated;
}
