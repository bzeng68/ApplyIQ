import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const ROOT = path.resolve(process.cwd(), '..');
const REPORTS_DIR = path.join(ROOT, 'reports');
const LOG_FILE = path.join(REPORTS_DIR, 'token-log.jsonl');
const AGG_FILE = path.join(REPORTS_DIR, 'token-aggregate.json');

function readLogLines() {
  if (!fs.existsSync(LOG_FILE)) return [];
  const raw = fs.readFileSync(LOG_FILE, 'utf8').trim();
  if (!raw) return [];
  return raw.split('\n').filter(Boolean).map((line) => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
}

function computeCost(inputTokens: number, outputTokens: number) {
  return Number(((inputTokens / 1e6) * 3 + (outputTokens / 1e6) * 15).toFixed(4));
}

function buildDailyFromAggregate() {
  if (!fs.existsSync(AGG_FILE)) return null;
  try {
    const rows = JSON.parse(fs.readFileSync(AGG_FILE, 'utf8')) as Array<Record<string, number | string>>;
    return rows.map((row) => {
      const offers = Number(row.offers || 0) || 0;
      const inputTokens = Number(row.input_tokens || 0) || 0;
      const outputTokens = Number(row.output_tokens || 0) || 0;
      const tokensPerOffer = offers > 0 ? Number(((inputTokens + outputTokens) / offers).toFixed(1)) : 0;
      return {
        ...row,
        tokens_per_offer: tokensPerOffer,
        estimated_cost_sonnet: Number(row.estimated_cost_sonnet || computeCost(inputTokens, outputTokens))
      };
    });
  } catch (e) {
    return null;
  }
}

function buildDailyFromLog(log: Array<Record<string, number | string>>) {
  const byDay: Record<string, { date: string; offers: number; input_tokens: number; output_tokens: number }> = {};
  log.forEach((entry) => {
    const day = String(entry.timestamp || entry.date || new Date().toISOString()).slice(0, 10);
    if (!byDay[day]) byDay[day] = { date: day, offers: 0, input_tokens: 0, output_tokens: 0 };
    byDay[day].offers += Number(entry.offers_evaluated || 1) || 1;
    byDay[day].input_tokens += Number(entry.input_tokens || 0) || 0;
    byDay[day].output_tokens += Number(entry.output_tokens || 0) || 0;
  });
  return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)).map((row) => {
    const tokensPerOffer = row.offers > 0 ? Number(((row.input_tokens + row.output_tokens) / row.offers).toFixed(1)) : 0;
    return {
      ...row,
      tokens_per_offer: tokensPerOffer,
      estimated_cost_sonnet: computeCost(row.input_tokens, row.output_tokens)
    };
  });
}

export async function GET() {
  const log = readLogLines();
  const daily = buildDailyFromAggregate() || buildDailyFromLog(log);

  const inputTokens = log.reduce((sum, row: any) => sum + (Number(row.input_tokens) || 0), 0);
  const outputTokens = log.reduce((sum, row: any) => sum + (Number(row.output_tokens) || 0), 0);

  const summary = {
    offers: log.length,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost_sonnet: computeCost(inputTokens, outputTokens)
  };

  const normalizedLog = log.map((row: any) => ({
    offer_id: row.offer_id ?? null,
    date: row.date ?? null,
    timestamp: row.timestamp ?? null,
    mode: row.mode ?? null,
    input_tokens: Number(row.input_tokens || 0),
    output_tokens: Number(row.output_tokens || 0),
    cache_creation_input_tokens: Number(row.cache_creation_input_tokens || 0),
    cache_read_input_tokens: Number(row.cache_read_input_tokens || 0)
  }));

  return NextResponse.json({ summary, daily, log: normalizedLog });
}
