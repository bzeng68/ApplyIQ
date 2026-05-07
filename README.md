# ApplyIQ

<p align="center">
  <img src="docs/hero-banner.jpg" alt="ApplyIQ — AI Job Search Pipeline" width="800">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white" alt="Claude Code">
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white" alt="Playwright">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT">
</p>

---

AI-powered job search pipeline built on Claude Code. Evaluates offers with a structured scoring system, scans portals automatically, processes in batch, and visualizes everything in a web dashboard.

> **Not a spray-and-pray tool.** ApplyIQ is a filter — it helps you find the few offers worth your time out of hundreds. The system strongly recommends against applying to anything scoring below 4.0/5. Always review before submitting.

## Core Flow

```
scan portals  →  evaluate offer (A-F scoring)  →  dashboard
```

## Features

| Feature | Description |
|---------|-------------|
| **Offer Evaluation** | A-F structured scoring across 10 weighted dimensions — role fit, CV match, comp research, STAR stories |
| **Auto-Pipeline** | Paste a URL, get a full evaluation + tracker entry automatically |
| **Portal Scanner** | 45+ companies pre-configured (Anthropic, Figma, Vercel, Scale AI, ...) via Greenhouse, Ashby, Lever, Wellfound APIs — zero LLM cost |
| **Batch Processing** | Parallel evaluation with `claude -p` workers |
| **Web Dashboard** | Next.js dashboard to browse, filter, and sort your pipeline |
| **Pipeline Integrity** | Automated merge, dedup, status normalization, health checks |
| **Human-in-the-Loop** | AI evaluates and recommends, you decide and act. Never submits — you have the final call |

## Quick Start

```bash
# 1. Install dependencies
npm install
npx playwright install chromium

# 2. Validate setup
npm run doctor

# 3. Configure
cp config/profile.example.yml config/profile.yml   # Edit with your details
cp templates/portals.example.yml portals.yml        # Customize companies

# 4. Add your CV
# Create cv.md in the project root with your CV in markdown

# 5. Open Claude Code
claude

# Then paste a job URL or run /career-ops
```

## Commands

```
/career-ops                  → Show all available commands
/career-ops {paste a JD}     → Auto-pipeline: evaluate + tracker entry
/career-ops scan             → Scan portals for new offers
/career-ops batch            → Batch evaluate multiple offers
/career-ops pipeline         → Process pending URLs from inbox
/career-ops tracker          → View application status
```

## How It Works

```
Paste a job URL or description
        │
        ▼
┌──────────────────┐
│  A-F Evaluation  │  Role fit, CV match, comp research, STAR stories
│  (reads cv.md)   │  Reads modes/oferta.md + modes/_profile.md
└────────┬─────────┘
         │
    ┌────┼────────┐
    ▼    ▼        ▼
Report  Tracker  Dashboard
.md     .tsv     build-dashboard-data.mjs
```

## Project Structure

```
modes/
  oferta.md          ← evaluation instructions
  scan.md            ← scanner instructions
  pipeline.md        ← pipeline orchestration
  batch.md           ← batch processing
  auto-pipeline.md   ← URL → eval → tracker
  tracker.md         ← tracker queries
  _shared*.md        ← scoring system
  _profile.md        ← your customizations (never auto-updated)

scan.mjs             ← portal scanner
build-dashboard-data.mjs  ← dashboard data builder
scripts/evaluate-new.mjs  ← Playwright batch evaluator

dashboard-web/       ← Next.js web dashboard
data/                ← tracker, pipeline inbox, scan history
batch/               ← batch runner + tracker additions
reports/             ← evaluation reports
config/              ← profile config
```

## Utilities

```bash
npm run scan          # Scan portals for new offers
npm run verify        # Pipeline health check
npm run merge         # Merge batch tracker additions
npm run dedup         # Remove duplicate tracker entries
npm run normalize     # Normalize non-canonical statuses
npm run liveness      # Check if job postings are still live
npm run doctor        # Validate prerequisites
npm run dashboard     # Start web dashboard (localhost:3000)
npm run update:check  # Check for upstream updates
```

## Customization

The system is designed to be customized by Claude itself. Just ask:

- "Change the archetypes to data engineering roles" → edits `modes/_profile.md`
- "Add these companies to my portals" → edits `portals.yml`
- "Update my profile" → edits `config/profile.yml`
- "Adjust the scoring weights" → edits `modes/_profile.md`

User data (`cv.md`, `config/profile.yml`, `modes/_profile.md`, `portals.yml`) is never touched by system updates.

## License

MIT
