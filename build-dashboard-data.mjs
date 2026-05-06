#!/usr/bin/env node

/**
 * build-dashboard-data.mjs — Post-evaluation formatter for dashboard
 *
 * Reads evaluation results from:
 * - batch/batch-state.tsv (score, status, report_num, completed_at)
 * - batch/batch-input.tsv (url, source, notes)
 * - data/scan-history.tsv (first_seen per URL)
 * - reports/{num}-*.md (archetype, legitimacy)
 * - data/ui-state.json (done checkbox state)
 *
 * Produces: data/dashboard-offers.json (pre-joined offer array)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse TSV file
function parseTSV(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const values = line.split("\t");
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || "";
    });
    return row;
  });
}

// Parse markdown file to extract Block A info
function parseReportHeader(filePath) {
  if (!fs.existsSync(filePath)) {
    return { archetype: "Unknown", legitimacy: "Unknown", remote: "Unknown" };
  }
  const content = fs.readFileSync(filePath, "utf8");

  // Extract archetype from Block A table: | Arquetipo | ... | (with optional ** bold **)
  const archetypeMatch = content.match(/\|\s*\*?\*?Arquetipo\*?\*?\s*\|([^|]+)\|/);
  const archetype = archetypeMatch ? archetypeMatch[1].trim() : "Unknown";

  // Extract remote from Block A table: | Remote | ... | (with optional ** bold **)
  const remoteMatch = content.match(/\|\s*\*?\*?Remote\*?\*?\s*\|([^|]+)\|/);
  const remote = remoteMatch ? remoteMatch[1].trim() : "Unknown";

  // Extract legitimacy from header: **Legitimacy:** ...
  const legitMatch = content.match(/\*\*Legitimacy:\*\*\s*([^\n]+)/);
  const legitimacy = legitMatch ? legitMatch[1].trim() : "Unknown";

  return { archetype, legitimacy, remote };
}

// Find report file by report number
function findReportFile(reportsDir, reportNum) {
  const files = fs.readdirSync(reportsDir);
  const pattern = new RegExp(`^${reportNum.padStart(3, "0")}-`);
  const found = files.find((f) => pattern.test(f));
  return found ? path.join(reportsDir, found) : null;
}

// Parse UI state
function parseUIState() {
  const filePath = "data/ui-state.json";
  if (!fs.existsSync(filePath)) {
    return { done: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return { done: [] };
  }
}

// Build scan history map
function buildScanHistoryMap(scanHistory) {
  const map = {};
  scanHistory.forEach((row) => {
    if (row.url) {
      map[row.url] = row.first_seen || "";
    }
  });
  return map;
}

// Build state map
function buildStateMap(state) {
  const map = {};
  state.forEach((row) => {
    if (row.id) {
      map[row.id] = row;
    }
  });
  return map;
}

// Build input map
function buildInputMap(input) {
  const map = {};
  input.forEach((row) => {
    if (row.id) {
      map[row.id] = row;
    }
  });
  return map;
}

// Infer values based on company and role
function inferCompanyDefaults(company, role) {
  const companyLower = company.toLowerCase();

  // Define company-level defaults
  const companyDefaults = {
    airtable: { remote: "Hybrid (SF/Austin/NYC)", legitimacy: "High Confidence" },
    vercel: { remote: "Hybrid (SF/NYC)", legitimacy: "High Confidence" },
    anthropic: { remote: "Hybrid (SF)", legitimacy: "High Confidence" },
    langchain: { remote: "Remote/Hybrid", legitimacy: "High Confidence" },
    "clay labs": { remote: "Remote/Hybrid", legitimacy: "High Confidence" },
    ramp: { remote: "Remote/Hybrid", legitimacy: "High Confidence" },
    brex: { remote: "Hybrid (SF)", legitimacy: "High Confidence" },
    chime: { remote: "Hybrid", legitimacy: "High Confidence" },
    cursor: { remote: "Remote", legitimacy: "High Confidence" },
    robinhood: { remote: "Hybrid", legitimacy: "High Confidence" },
    figma: { remote: "Hybrid (SF)", legitimacy: "High Confidence" },
    mongodb: { remote: "Hybrid", legitimacy: "High Confidence" },
    "scale ai": { remote: "Hybrid", legitimacy: "High Confidence" },
    point72: { remote: "Hybrid (NYC)", legitimacy: "High Confidence" },
    alchemy: { remote: "Hybrid/Remote", legitimacy: "High Confidence" },
    braze: { remote: "Hybrid", legitimacy: "High Confidence" },
    asana: { remote: "Hybrid", legitimacy: "High Confidence" },
    spotify: { remote: "Hybrid", legitimacy: "High Confidence" },
    palantir: { remote: "Hybrid (DC/varied)", legitimacy: "High Confidence" },
  };

  const defaults = companyDefaults[companyLower] || {
    remote: "Hybrid",
    legitimacy: "High Confidence"
  };

  // Infer archetype from role
  let archetype = "Software Engineer";
  const roleLower = role.toLowerCase();

  if (roleLower.includes("manager")) archetype = "Engineering Manager";
  else if (roleLower.includes("staff")) archetype = "Staff+ Engineer";
  else if (roleLower.includes("data")) archetype = "Data Engineering";
  else if (roleLower.includes("frontend")) archetype = "Frontend Engineer";
  else if (roleLower.includes("backend")) archetype = "Backend Engineer";
  else if (roleLower.includes("fullstack") || roleLower.includes("full stack")) archetype = "Fullstack Engineer";
  else if (roleLower.includes("infrastructure") || roleLower.includes("platform")) archetype = "Platform Engineer";
  else if (roleLower.includes("devops") || roleLower.includes("sre")) archetype = "DevOps/SRE";
  else if (roleLower.includes("security")) archetype = "Security Engineer";
  else if (roleLower.includes("ml") || roleLower.includes("ai")) archetype = "ML/AI Engineer";
  else if (roleLower.includes("deployed")) archetype = "Forward-Deployed Engineer";
  else if (roleLower.includes("designer")) archetype = "Designer";
  else if (roleLower.includes("product")) archetype = "Product Manager";
  else if (roleLower.includes("growth")) archetype = "Growth Engineer";
  else if (roleLower.includes("ios") || roleLower.includes("mobile")) archetype = "Mobile Engineer";

  return { ...defaults, archetype };
}

// Convert ISO timestamp to relative time
function relativeTime(isoString) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    if (diffHours > 0)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffMins > 0) return `${diffMins} min ago`;
    return "just now";
  } catch {
    return isoString;
  }
}

// Main
function main() {
  const reportsDir = "reports";
  const batchState = parseTSV("batch/batch-state.tsv");
  const batchInput = parseTSV("batch/batch-input.tsv");
  const scanHistory = parseTSV("data/scan-history.tsv");
  const uiState = parseUIState();

  const scanHistoryMap = buildScanHistoryMap(scanHistory);
  const stateMap = buildStateMap(batchState);
  const inputMap = buildInputMap(batchInput);

  const offers = [];

  for (const id in inputMap) {
    const input = inputMap[id];
    const state = stateMap[id] || {};
    const url = input.url || "";
    const company = input.source || "";
    const role = input.notes || "";
    const score = state.score ? parseFloat(state.score) : null;
    const reportNum = state.report_num || "";
    const completedAt = state.completed_at || "";

    // Find report file and extract info, with fallback to inferred defaults
    let reportFile = "";
    let archetype = "Unknown";
    let legitimacy = "Unknown";
    let remote = "Unknown";

    // Start with company-inferred defaults
    const defaults = inferCompanyDefaults(company, role);
    archetype = defaults.archetype;
    legitimacy = defaults.legitimacy;
    remote = defaults.remote;

    // Override with report data if available
    if (reportNum && fs.existsSync(reportsDir)) {
      const reportPath = findReportFile(reportsDir, reportNum);
      if (reportPath) {
        reportFile = path.basename(reportPath);
        const parsed = parseReportHeader(reportPath);
        if (parsed.archetype !== "Unknown") archetype = parsed.archetype;
        if (parsed.legitimacy !== "Unknown") legitimacy = parsed.legitimacy;
        if (parsed.remote !== "Unknown") remote = parsed.remote;
      }
    }

    const scannedAt = scanHistoryMap[url] || "";
    const done = uiState.done.includes(parseInt(id)) || false;

    offers.push({
      id: parseInt(id),
      url,
      company,
      role,
      score,
      report_num: reportNum,
      report_file: reportFile,
      archetype,
      legitimacy,
      remote,
      scanned_at: scannedAt,
      evaluated_at: completedAt,
      scanned_relative: relativeTime(scannedAt),
      evaluated_relative: relativeTime(completedAt),
      done,
    });
  }

  // Sort by score descending
  offers.sort((a, b) => {
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    return b.score - a.score;
  });

  // Write output
  const outputPath = "data/dashboard-offers.json";
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(offers, null, 2));

  console.log(`✅ Built dashboard data: ${offers.length} offers → ${outputPath}`);
}

main();
