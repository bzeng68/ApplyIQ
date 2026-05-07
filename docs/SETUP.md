# Setup Guide

## Prerequisites

- [Claude Code](https://claude.ai/code) installed and configured
- Node.js 18+

## Quick Start (5 steps)

### 1. Install dependencies

```bash
npm install
npx playwright install chromium   # Required for liveness checks and batch evaluation
```

### 2. Configure your profile

```bash
cp config/profile.example.yml config/profile.yml
```

Edit `config/profile.yml` with your personal details: name, email, target roles, narrative, proof points.

### 3. Add your CV

Create `cv.md` in the project root with your full CV in markdown format. This is the source of truth for all evaluations.

(Optional) Create `article-digest.md` with proof points from your portfolio projects/articles.

### 4. Configure portals

```bash
cp templates/portals.example.yml portals.yml
```

Edit `portals.yml`:
- Update `title_filter.positive` with keywords matching your target roles
- Add companies you want to track in `tracked_companies`
- Customize `search_queries` for your preferred job boards

### 5. Start using

Open Claude Code in this directory:

```bash
claude
```

Then paste a job offer URL or description. ApplyIQ will evaluate it, generate a report, and track it.

## Available Commands

| Action | How |
|--------|-----|
| Evaluate an offer | Paste a URL or JD text |
| Search for offers | `/career-ops scan` |
| Process pending URLs | `/career-ops pipeline` |
| Batch evaluate | `/career-ops batch` |
| Check tracker status | `/career-ops tracker` |

## Verify Setup

```bash
npm run doctor      # Validate prerequisites
npm run verify      # Check pipeline integrity
```

## Dashboard

```bash
npm run dashboard   # Start web dashboard at localhost:3000
```
