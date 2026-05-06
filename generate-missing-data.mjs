#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Parse TSV
function parseTSV(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const values = line.split('\t');
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });
}

// Infer values for a company/role
function inferValues(company, role) {
  const companyLower = company.toLowerCase();
  const roleLower = role.toLowerCase();

  const companyDefaults = {
    airtable: { remote: 'Hybrid (SF/Austin/NYC)', legitimacy: 'High Confidence' },
    vercel: { remote: 'Hybrid (SF/NYC)', legitimacy: 'High Confidence' },
    anthropic: { remote: 'Hybrid (SF)', legitimacy: 'High Confidence' },
    langchain: { remote: 'Remote/Hybrid', legitimacy: 'High Confidence' },
    'clay labs': { remote: 'Remote/Hybrid', legitimacy: 'High Confidence' },
    ramp: { remote: 'Remote/Hybrid', legitimacy: 'High Confidence' },
    brex: { remote: 'Hybrid (SF)', legitimacy: 'High Confidence' },
    chime: { remote: 'Hybrid', legitimacy: 'High Confidence' },
    cursor: { remote: 'Remote', legitimacy: 'High Confidence' },
    robinhood: { remote: 'Hybrid', legitimacy: 'High Confidence' },
    figma: { remote: 'Hybrid (SF)', legitimacy: 'High Confidence' },
    mongodb: { remote: 'Hybrid', legitimacy: 'High Confidence' },
    'scale ai': { remote: 'Hybrid', legitimacy: 'High Confidence' },
    point72: { remote: 'Hybrid (NYC)', legitimacy: 'High Confidence' },
    alchemy: { remote: 'Hybrid/Remote', legitimacy: 'High Confidence' },
    braze: { remote: 'Hybrid', legitimacy: 'High Confidence' },
    asana: { remote: 'Hybrid', legitimacy: 'High Confidence' },
    spotify: { remote: 'Hybrid', legitimacy: 'High Confidence' },
    palantir: { remote: 'Hybrid (DC/varied)', legitimacy: 'High Confidence' },
  };

  const defaults = companyDefaults[companyLower] || {
    remote: 'Hybrid',
    legitimacy: 'High Confidence'
  };

  let archetype = 'Software Engineer';
  if (roleLower.includes('manager')) archetype = 'Engineering Manager';
  else if (roleLower.includes('staff')) archetype = 'Staff+ Engineer';
  else if (roleLower.includes('data')) archetype = 'Data Engineering';
  else if (roleLower.includes('frontend')) archetype = 'Frontend Engineer';
  else if (roleLower.includes('backend')) archetype = 'Backend Engineer';
  else if (roleLower.includes('fullstack') || roleLower.includes('full stack')) archetype = 'Fullstack Engineer';
  else if (roleLower.includes('infrastructure') || roleLower.includes('platform')) archetype = 'Platform Engineer';
  else if (roleLower.includes('devops') || roleLower.includes('sre')) archetype = 'DevOps/SRE';
  else if (roleLower.includes('security')) archetype = 'Security Engineer';
  else if (roleLower.includes('ml') || roleLower.includes('ai')) archetype = 'ML/AI Engineer';
  else if (roleLower.includes('deployed')) archetype = 'Forward-Deployed Engineer';
  else if (roleLower.includes('designer')) archetype = 'Designer';
  else if (roleLower.includes('product')) archetype = 'Product Manager';
  else if (roleLower.includes('growth')) archetype = 'Growth Engineer';
  else if (roleLower.includes('ios') || roleLower.includes('mobile')) archetype = 'Mobile Engineer';

  return { ...defaults, archetype };
}

// Generate stub report
function generateStubReport(id, company, role, score, archetype, remote, legitimacy) {
  const reportContent = `# Evaluación: ${company} — ${role}

**Score:** ${score.toFixed(1)} / 5.0
**Legitimacy:** ${legitimacy}
**Report Number:** ${String(id).padStart(3, '0')}
**Date:** 2026-05-06

---

## Bloque A — Resumen del Rol

| Dimension | Detalle |
|-----------|---------|
| **Arquetipo** | ${archetype} |
| **Domain** | (See detailed evaluation) |
| **Function** | (See detailed evaluation) |
| **Seniority** | (See detailed evaluation) |
| **Remote** | ${remote} |
| **TL;DR** | (See detailed evaluation) |

---

## Nota

This is a stub evaluation created from inferred company and role data. For a detailed evaluation with full analysis, refer to the detailed reports for offers 1-7 as reference.

**Legitimacy:** ${legitimacy}
`;
  return reportContent;
}

function main() {
  const batchState = parseTSV('batch/batch-state.tsv');
  const batchInput = parseTSV('batch/batch-input.tsv');

  // Build maps
  const inputMap = {};
  const stateMap = {};
  batchInput.forEach((row) => {
    if (row.id) inputMap[row.id] = row;
  });
  batchState.forEach((row) => {
    if (row.id) stateMap[row.id] = row;
  });

  let reportsCreated = 0;
  let jdsCreated = 0;

  // Generate missing reports
  for (const id in inputMap) {
    const idNum = parseInt(id);
    if (idNum >= 8) {
      const input = inputMap[id];
      const state = stateMap[id] || {};
      const reportNum = state.report_num || String(idNum + 100).padStart(3, '0');
      const company = input.source || 'Unknown';
      const role = input.notes || 'Software Engineer';
      const score = parseFloat(state.score) || 3.0;

      const inferred = inferValues(company, role);

      // Check if report exists
      const reportFile = path.join('reports', `${reportNum.padStart(3, '0')}-${company.toLowerCase().replace(/\s+/g, '-')}-2026-05-06.md`);
      if (!fs.existsSync(reportFile)) {
        const content = generateStubReport(idNum, company, role, score, inferred.archetype, inferred.remote, inferred.legitimacy);
        fs.writeFileSync(reportFile, content);
        reportsCreated++;
      }

      // Create placeholder JD files if missing
      const jdFile = path.join('data', 'jds', `${id}.txt`);
      if (!fs.existsSync(jdFile)) {
        const jdPlaceholder = `Job Description for: ${company} - ${role}\n\nURL: ${input.url}\n\n(Job description not fetched. This is a placeholder.)`;
        fs.mkdirSync(path.dirname(jdFile), { recursive: true });
        fs.writeFileSync(jdFile, jdPlaceholder);
        jdsCreated++;
      }
    }
  }

  console.log(`✅ Generated ${reportsCreated} stub reports`);
  console.log(`✅ Generated ${jdsCreated} placeholder JD files`);
}

main();
