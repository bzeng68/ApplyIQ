import fs from 'fs';
import path from 'path';

export function readTsv(filePath: string) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  const lines = raw.split('\n').filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split('\t').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split('\t');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] || '').trim();
    });
    return row;
  });
}

export function normalizeReportNum(value?: string | null) {
  if (!value || value === '-') return null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  const numeric = cleaned.replace(/^0+/, '') || '0';
  if (!/^[0-9]+$/.test(numeric)) return cleaned;
  return String(parseInt(numeric, 10)).padStart(3, '0');
}

export function findReportFile(reportsDir: string, reportNum: string | null) {
  if (!reportNum || !fs.existsSync(reportsDir)) return null;
  const files = fs.readdirSync(reportsDir);
  const match = files.find((file) => file.startsWith(`${reportNum}-`) && file.endsWith('.md'));
  return match || null;
}

export function parseReport(reportPath: string | null) {
  if (!reportPath || !fs.existsSync(reportPath)) return {};
  const content = fs.readFileSync(reportPath, 'utf8');
  const remoteMatch = content.match(/\|\s*Remote\s*\|([^|]+)\|/i);
  const archetypeMatch =
    content.match(/\|\s*Arquetipo\s*\|([^|]+)\|/i) ||
    content.match(/\|\s*Archetype\s*\|([^|]+)\|/i);
  const legitimacyMatch = content.match(/\*\*Legitimacy:\*\*\s*(.+)/i);

  return {
    remote: remoteMatch ? remoteMatch[1].trim() : null,
    archetype: archetypeMatch ? archetypeMatch[1].trim() : null,
    legitimacy: legitimacyMatch ? legitimacyMatch[1].trim() : null,
  };
}
