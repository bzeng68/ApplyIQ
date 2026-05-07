#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { Anthropic } from '@anthropic-ai/sdk';

const DATA_ROOT = process.env.DATA_ROOT ? path.resolve(process.env.DATA_ROOT) : process.cwd();
const APP_ROOT = process.cwd();
const MAX_CONCURRENCY = Number(process.env.EVAL_CONCURRENCY || 4);
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';

const BATCH_DIR = path.join(DATA_ROOT, 'batch');
const DATA_DIR = path.join(DATA_ROOT, 'data');
const REPORTS_DIR = path.join(DATA_ROOT, 'reports');
const TRACKER_DIR = path.join(BATCH_DIR, 'tracker-additions');
const JDS_DIR = path.join(DATA_DIR, 'jds');

const INPUT_FILE = path.join(BATCH_DIR, 'batch-input.tsv');
const STATE_FILE = path.join(BATCH_DIR, 'batch-state.tsv');

function readTsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  const lines = raw.split('\n').filter(Boolean);
  const headers = lines[0].split('\t').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split('\t');
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] || '').trim();
    });
    return row;
  });
}

function ensureStateFile() {
  if (!fs.existsSync(STATE_FILE)) {
    fs.mkdirSync(BATCH_DIR, { recursive: true });
    fs.writeFileSync(
      STATE_FILE,
      'id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries\n'
    );
  }
}

function updateState(row) {
  ensureStateFile();
  const lines = fs.readFileSync(STATE_FILE, 'utf8').trim().split('\n');
  const header = lines[0];
  const entries = lines.slice(1);
  let found = false;
  const next = entries.map((line) => {
    const cols = line.split('\t');
    if (cols[0] === String(row.id)) {
      found = true;
      return [
        row.id,
        row.url,
        row.status,
        row.started_at,
        row.completed_at,
        row.report_num,
        row.score,
        row.error,
        row.retries,
      ].join('\t');
    }
    return line;
  });
  if (!found) {
    next.push(
      [
        row.id,
        row.url,
        row.status,
        row.started_at,
        row.completed_at,
        row.report_num,
        row.score,
        row.error,
        row.retries,
      ].join('\t')
    );
  }
  fs.writeFileSync(STATE_FILE, [header, ...next].join('\n') + '\n');
}

function nextReportNum(states) {
  let maxNum = 0;
  const reportFiles = fs.existsSync(REPORTS_DIR) ? fs.readdirSync(REPORTS_DIR) : [];
  for (const file of reportFiles) {
    if (!file.endsWith('.md')) continue;
    const num = Number(file.split('-')[0]);
    if (Number.isFinite(num) && num > maxNum) maxNum = num;
  }
  for (const row of states) {
    const num = Number(row.report_num || 0);
    if (Number.isFinite(num) && num > maxNum) maxNum = num;
  }
  return String(maxNum + 1).padStart(3, '0');
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

async function fetchJdText(url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'ApplyIQ/1.0' } });
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 500) return text;
    }
  } catch (e) {
    // ignore and fallback
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    const text = await page.evaluate(() => document.body.innerText || '');
    return text;
  } finally {
    await browser.close();
  }
}

function loadPrompt() {
  const promptPath = path.join(APP_ROOT, 'batch', 'batch-prompt.md');
  return fs.readFileSync(promptPath, 'utf8');
}

function loadOptionalFile(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function buildSystemPrompt({ url, jdPath, reportNum, id, date }) {
  let prompt = loadPrompt();
  prompt = prompt
    .replaceAll('{{URL}}', url)
    .replaceAll('{{JD_FILE}}', jdPath)
    .replaceAll('{{REPORT_NUM}}', reportNum)
    .replaceAll('{{DATE}}', date)
    .replaceAll('{{ID}}', String(id));

  const cv = loadOptionalFile(path.join(APP_ROOT, 'cv.md'));
  const profile = loadOptionalFile(path.join(APP_ROOT, 'modes', '_profile.md'));
  const digest = loadOptionalFile(path.join(APP_ROOT, 'article-digest.md'));
  const llms = loadOptionalFile(path.join(APP_ROOT, 'llms.txt'));

  const appended = [
    '\n\n---\n## Context files (read-only)\n',
    cv ? `\n### cv.md\n\n${cv}` : '',
    profile ? `\n### modes/_profile.md\n\n${profile}` : '',
    digest ? `\n### article-digest.md\n\n${digest}` : '',
    llms ? `\n### llms.txt\n\n${llms}` : '',
    `\n### JD text\n\n${fs.readFileSync(jdPath, 'utf8')}`,
    '\n\nIMPORTANT: You cannot write files. Return a JSON object with keys: report_markdown, tracker_tsv, score, company, role, legitimacy. Do not add extra text outside the JSON.',
  ].join('\n');

  return prompt + appended;
}

function parseJsonResponse(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    return null;
  }
}

async function evaluateOffer(anthropic, inputRow, states) {
  const id = Number(inputRow.id);
  const url = inputRow.url;
  const startedAt = new Date().toISOString();
  const retries = 0;

  const reportNum = nextReportNum(states);
  const date = new Date().toISOString().slice(0, 10);

  fs.mkdirSync(JDS_DIR, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.mkdirSync(TRACKER_DIR, { recursive: true });

  const jdPath = path.join(JDS_DIR, `${id}.txt`);
  const jdText = await fetchJdText(url);
  fs.writeFileSync(jdPath, jdText || '');

  const system = buildSystemPrompt({ url, jdPath, reportNum, id, date });

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.2,
    system,
    messages: [{ role: 'user', content: 'Evaluate this offer.' }],
  });

  const content = response.content?.[0]?.text || '';
  const parsed = parseJsonResponse(content);
  if (!parsed) {
    updateState({
      id,
      url,
      status: 'failed',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      report_num: reportNum,
      score: '-',
      error: 'Failed to parse model response',
      retries,
    });
    return;
  }

  const company = parsed.company || inputRow.source || 'Unknown';
  const role = parsed.role || inputRow.notes || 'Role';
  const score = parsed.score || '-';
  const legitimacy = parsed.legitimacy || 'Proceed with Caution';
  const slug = slugify(company);
  const reportFile = `${reportNum}-${slug}-${date}.md`;
  const reportPath = path.join(REPORTS_DIR, reportFile);

  fs.writeFileSync(reportPath, parsed.report_markdown || '');
  if (parsed.tracker_tsv) {
    fs.writeFileSync(path.join(TRACKER_DIR, `${id}.tsv`), parsed.tracker_tsv.trim() + '\n');
  }

  updateState({
    id,
    url,
    status: 'completed',
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    report_num: reportNum,
    score,
    error: '-',
    retries,
  });

  console.log(
    JSON.stringify({
      status: 'completed',
      id,
      report_num: reportNum,
      company,
      role,
      score,
      legitimacy,
      report: reportPath,
      error: null,
    })
  );
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is required');
    process.exit(1);
  }

  ensureStateFile();
  const inputs = readTsv(INPUT_FILE);
  const states = readTsv(STATE_FILE);

  const stateById = new Map(states.map((row) => [Number(row.id), row]));
  const pending = inputs.filter((row) => {
    const id = Number(row.id);
    if (!id || !row.url) return false;
    const state = stateById.get(id);
    return !state || state.status !== 'completed';
  });

  if (pending.length === 0) {
    console.log('No pending offers to evaluate');
    return;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  for (let i = 0; i < pending.length; i += MAX_CONCURRENCY) {
    const batch = pending.slice(i, i + MAX_CONCURRENCY);
    await Promise.all(batch.map((row) => evaluateOffer(anthropic, row, states)));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
