# Dashboard Plan — ApplyIQ Web UI

## Context

After running batch evaluation (`batch-runner.sh`), results live in `batch-state.tsv` and `reports/*.md` with no easy way to review them. The existing Go/Bubble Tea TUI (`dashboard/`) is terminal-only and can't support clickable links or charts. This plan builds a Next.js web UI at `dashboard-web/` that sits on top of the existing data files — no changes to the pipeline itself except adding a formatter step at the end of `batch-runner.sh`.

---

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** — utility-first, Japandi design system
- **Recharts** — lightweight chart library for the token usage page
- **Node.js file APIs** — API routes read data files directly from the project root; no database
- **Location**: `dashboard-web/` (alongside existing `dashboard/` Go TUI)
- **Run**: `npm run dashboard` (added to root `package.json`)

---

## Design System — Japandi

Neutral, minimal, card-based. Color only for score and legitimacy signals.

**Colors:**
- Background: `#F5F3EF` (warm off-white)
- Card surface: `#FFFFFF`
- Border/divider: `#E8E4DC`
- Text primary: `#1A1714`
- Text secondary: `#6B6560`
- Accent (links, active nav): `#3D6B5B` (muted sage green)

**Score pill colors:**
- Green (`≥4.0`): `#4A7C59`
- Yellow (`3.5–3.9`): `#A07C40`
- Red (`<3.5`): `#8B3A3A`

**Legitimacy badge:**
- High Confidence: green tint
- Proceed with Caution: yellow tint
- Suspicious: red tint

**Typography:** system-ui stack. Table rows `text-sm`, headers `text-xs uppercase tracking-wide`.

**Cards:** `rounded-lg border border-[#E8E4DC] bg-white shadow-sm`. Table hover: `hover:bg-[#F9F7F4]`. Nav: horizontal tabs with underline active state.

---

## JD Storage in Batch Pipeline

During each worker evaluation, `batch-runner.sh` saves the resolved JD text:

```bash
mkdir -p data/jds
echo "$jd_content" > "data/jds/${id}.txt"
```

This enables the JD modal in the dashboard without re-fetching the original URL.

---

## `build-dashboard-data.mjs` — Post-Eval Formatter

Auto-appended as the final step in `batch-runner.sh`:

```bash
echo "Building dashboard data..."
node build-dashboard-data.mjs
```

**Produces:** `data/dashboard-offers.json` — pre-joined offer array for fast API reads.

**Input files:**
- `batch/batch-state.tsv` — score, status, report_num, completed_at
- `batch/batch-input.tsv` — url, source (company), notes (role)
- `data/scan-history.tsv` — first_seen per URL
- `reports/{num}-*.md` — archetype, legitimacy, hybrid/remote (Block A table)
- `data/ui-state.json` — done checkbox state

**Output schema per offer:**
```json
{
  "id": 3,
  "url": "https://...",
  "company": "Airtable",
  "role": "Software Engineer, Data",
  "score": 4.2,
  "report_num": "003",
  "report_file": "003-airtable-2026-05-04.md",
  "archetype": "LLMOps",
  "legitimacy": "High Confidence",
  "remote": "Hybrid (2 days onsite)",
  "scanned_at": "2026-05-02T14:23:00Z",
  "evaluated_at": "2026-05-04T09:11:00Z",
  "done": false
}
```

**Parsing regexes for report markdown:**
- Remote: `\|\s*Remote\s*\|([^|]+)\|`
- Archetype: `\|\s*Arquetipo\s*\|([^|]+)\|` (also try `Archetype`)
- Legitimacy: `\*\*Legitimacy:\*\*\s*(.+)`

---

## Data Sources & Joins

All heavy joining runs in `build-dashboard-data.mjs` at post-eval time. API routes read `data/dashboard-offers.json` directly. Fallback: live join from raw files if the JSON doesn't exist yet.

### Checkbox persistence
`data/ui-state.json` — `{ "done": [3, 7, 12] }` — written by `POST /api/offers/[id]/done`.

---

## Pages

### Page 1 — Pending (`/`)

Evaluated offers not in done list, sorted by score descending.

**Table columns:**
| Column | Source | Notes |
|--------|--------|-------|
| ✓ | `data/ui-state.json` | Checkbox — moves to Completed on check |
| Score | `batch-state.tsv` `.score` | Colored pill |
| Company | `batch-input.tsv` `.source` | |
| Role | `batch-input.tsv` `.notes` | |
| Archetype | `reports/{num}-*.md` Block A | |
| Legitimacy | `reports/{num}-*.md` header | Colored badge |
| Remote | `reports/{num}-*.md` Block A | Hybrid / Remote / Onsite badge |
| Scanned | `scan-history.tsv` `.first_seen` | Relative time |
| Evaluated | `batch-state.tsv` `.completed_at` | Relative time |
| JD | `data/jds/{id}.txt` | Button → modal overlay |
| Link | `batch-input.tsv` `.url` | External link icon → new tab |
| Report | `batch-state.tsv` `.report_num` | Slide-over panel |

**Interactions:**
- Checkbox → marks done, moves to Completed
- JD button → modal with scrollable JD text, close on Esc or backdrop click
- Link icon → opens job URL in new tab
- Report badge → slide-over with rendered markdown
- Column header click → sort (default: score desc)
- Filter bar: search by company/role

**Empty state:** "No evaluated offers yet. Run `bash batch/batch-runner.sh` to evaluate."

---

### Page 2 — Completed (`/completed`)

Same table layout. Offers where id is in done list. Unchecking moves back to Pending.

Extra column: **Status** from `batch-state.tsv`.

---

### Page 3 — Token Usage (`/tokens`)

**Summary cards (top row):**
- Total offers evaluated
- Total input tokens
- Total output tokens
- Estimated cost (Sonnet pricing)

**Charts (Recharts):**
1. Daily input vs output tokens — stacked bar chart by date
2. Cumulative cost over time — line chart
3. Tokens per offer (efficiency) — line chart

**Per-offer table:** All rows from `token-log.jsonl`, paginated.

**Empty state:** "No token data yet. Token logging activates when evaluations run."

---

## API Routes

```
GET  /api/offers              → dashboard-offers.json (fallback: live join)
POST /api/offers/[id]/done    → toggle done state in data/ui-state.json
GET  /api/reports/[num]       → reports/{num}-*.md raw markdown
GET  /api/jds/[id]            → data/jds/{id}.txt raw text
GET  /api/tokens              → token-aggregate.json + token-log.jsonl
```

---

## File Structure

```
dashboard-web/
  app/
    page.tsx                  # Pending offers table
    completed/page.tsx        # Completed offers table
    tokens/page.tsx           # Token usage charts
    layout.tsx                # Nav (Pending | Completed | Tokens)
    globals.css               # Japandi CSS custom properties
  components/
    OffersTable.tsx            # Shared table for pending + completed
    JDModal.tsx               # Modal overlay for JD text
    ReportPanel.tsx            # Slide-over markdown report viewer
    TokenCharts.tsx            # Recharts wrappers
    ScoreBadge.tsx             # Colored score pill
    LegitimacyBadge.tsx        # Tier badge
    RemoteBadge.tsx            # Hybrid/Remote/Onsite badge
  lib/
    parsers.ts                 # TSV/markdown parsers
    data.ts                    # Data join logic (fallback)
    relative-time.ts           # "2 days ago" formatter
  app/api/
    offers/route.ts
    offers/[id]/done/route.ts
    reports/[num]/route.ts
    jds/[id]/route.ts
    tokens/route.ts
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  package.json

build-dashboard-data.mjs       # Post-eval formatter (project root)
data/dashboard-offers.json     # Pre-joined output (gitignored)
data/ui-state.json             # Checkbox state (gitignored)
data/jds/{id}.txt              # JD text per offer (gitignored)
```

---

## Critical Files to Modify

| File | Change |
|------|--------|
| `batch/batch-runner.sh` | Add JD save to `data/jds/${id}.txt` + call `node build-dashboard-data.mjs` at end |
| `root package.json` | Add `"dashboard": "cd dashboard-web && npm run dev"` |

---

## Root package.json Addition

```json
"dashboard": "cd dashboard-web && npm run dev"
```

---

## Verification

1. `cd dashboard-web && npm install && npm run dev`
2. Open `http://localhost:3000` — empty state with instruction to run batch
3. After running `bash batch/batch-runner.sh` on a few offers:
   - Pending table shows offers sorted by score
   - Score colors correct (green/yellow/red)
   - Legitimacy badge colored by tier
   - Remote badge shows Hybrid/Remote/Onsite
   - JD button opens modal with job description text
   - Link icon opens job URL
   - Checking a row moves it to `/completed`
   - Unchecking moves it back
4. `/tokens` shows empty state if no token-log.jsonl, charts if it exists
5. Report slide-over renders markdown correctly
6. Japandi aesthetic: warm off-white background, card-based layout, minimal chrome
