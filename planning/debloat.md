# Debloat — ApplyIQ

**Date:** 2026-05-07  
**Author:** Bryan Zeng

## Context

This repo was forked from [santifer/career-ops](https://github.com/santifer/career-ops), an open-source multi-platform job search pipeline. The upstream project targets community contributors, multiple languages, and multiple AI platforms (Claude Code, OpenCode, Gemini CLI).

This instance is a solo personal setup. The debloat removes everything outside the actual usage pattern:

- **Core flow:** scan → evaluate (oferta) → dashboard (dashboard-web)
- **Also used:** batch processing
- **Language:** English only
- **Platform:** Claude Code only
- **Contributor:** solo (Bryan Zeng)

---

## What Was Removed

### 1. Multi-language Modes (~25 files)
`modes/de/`, `modes/fr/`, `modes/ja/`, `modes/pt/`, `modes/ru/`  
Never used. English-only setup.

### 2. Unused English Modes (11 files)
| File | Reason |
|------|--------|
| `modes/pdf.md` | PDF/CV generation removed |
| `modes/latex.md` | LaTeX generation removed |
| `modes/contacto.md` | LinkedIn outreach — not in use |
| `modes/deep.md` | Deep company research — not in use |
| `modes/interview-prep.md` | Interview prep — not in use |
| `modes/training.md` | Course/cert evaluation — not in use |
| `modes/project.md` | Portfolio project evaluation — not in use |
| `modes/patterns.md` | Rejection patterns — not in use |
| `modes/followup.md` | Follow-up cadence — not in use |
| `modes/ofertas.md` | Multi-offer comparison — not in use |
| `modes/apply.md` | Live application assistant — not in use |

### 3. PDF / CV Generation (5 files)
`generate-pdf.mjs`, `generate-latex.mjs`, `cv-sync-check.mjs`,  
`templates/cv-template.html`, `templates/cv-template.tex`  
CV is managed separately. Not part of core flow.

### 4. Gemini Integration (~19 files)
`.gemini/`, `gemini-eval.mjs`, `GEMINI.md`  
Claude Code only. Gemini is an unused alternative.

### 5. OpenCode Integration (~13 files)
`.opencode/`  
Claude Code only. OpenCode is an unused alternative.

### 6. Go TUI Dashboard (~13 files)
`dashboard/` (main.go, go.mod, go.sum, internal/)  
Superseded by `dashboard-web/` (Next.js). Two competing implementations; keeping the web version.

### 7. Multi-language READMEs (7 files)
`README.de.md`, `README.zh.md`, `README.ja.md`, `README.ko.md`,  
`README.pt.md`, `README.ru.md`, `README.zh-TW.md`  
English only.

### 8. Community / Open-Source Overhead (~16 files)
`CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `CONTRIBUTORS.md`, `GOVERNANCE.md`,  
`LEGAL_DISCLAIMER.md`, `TRADEMARK.md`, `CITATION.cff`, `SUPPORT.md`,  
`.coderabbit.yaml`, `release-please-config.json`, `.release-please-manifest.json`,  
`renovate.json`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/labeler.yml`,  
`.github/dependabot.yml`, `.github/ISSUE_TEMPLATE/`  
Solo contributor. Community governance infrastructure is irrelevant.

### 9. GitHub Workflows (2 files)
`.github/workflows/codeql.yml`, `.github/workflows/dependency-review.yml`  
Not needed for solo private repo.

### 10. Unused Scripts (5 files)
| File | Reason |
|------|--------|
| `analyze-patterns.mjs` | patterns mode removed |
| `followup-cadence.mjs` | followup mode removed |
| `aggregate-token-log.mjs` | token analytics — not core |
| `token-audit.mjs` | token analytics — not core |
| `generate-missing-data.mjs` | not part of core flow |

### 11. Peripheral Directories
`interview-prep/`, `writing-samples/`, `examples/`  
Not part of core flow.

### 12. Cloud Deployment Infrastructure
`terraform/`, `docker/`, `scripts/pipeline-entrypoint.sh`  
Running locally only.

---

## What Was Updated

### `CLAUDE.md`
- Removed: Language Modes section (German, French, Japanese)
- Removed: OpenCode Commands table
- Removed: Gemini CLI Commands table
- Removed: Skill Modes rows for removed modes
- Removed: References to removed scripts in Main Files table

### `package.json`
- Removed scripts: `pdf`, `sync-check`, `gemini:eval`

### `README.md`
- Rewritten for solo/English/Claude-only setup
- Removed: language selector, Gemini section, OpenCode section, community badges
- Removed: santifer attribution copy and social proof
- Removed: feature rows for removed features
- Updated: Quick Start, commands table, badges

---

## What Was Kept

### Core Flow
- `scan.mjs` + `modes/scan.md` + `portals.yml`
- `modes/oferta.md` + `modes/_shared*.md` + `modes/_profile.md`
- `modes/pipeline.md`, `modes/batch.md`, `modes/auto-pipeline.md`, `modes/tracker.md`
- `build-dashboard-data.mjs` + `dashboard-web/`
- `batch/` (batch processing still in use)

### Utilities
- `merge-tracker.mjs`, `dedup-tracker.mjs`, `normalize-statuses.mjs`
- `verify-pipeline.mjs`, `doctor.mjs`, `test-all.mjs`
- `check-liveness.mjs`, `liveness-core.mjs`
- `update-system.mjs`

### Plugin / Config
- `.claude-plugin/` — required for `/career-ops` skill registration
- `config/`, `data/`, `templates/states.yml`, `templates/portals.example.yml`
- `fonts/` — used by dashboard-web

### Docs
- `README.md`, `CLAUDE.md`, `DATA_CONTRACT.md`, `AGENTS.md`, `CHANGELOG.md`
