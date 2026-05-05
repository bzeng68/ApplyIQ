# Token Optimization Plan

## Context

Every interactive evaluation (oferta mode) consumes ~13–20K tokens. Every batch worker spends ~3,500 tokens on its system prompt alone — before reading a single line of the JD or CV. With parallel batch runs of 10+ offers this adds up fast.

The codebase is already lean: all 16 `.mjs` scripts use zero Claude tokens (scanning, PDF generation, deduplication, validation, merging — all local). **100% of token spend is driven by LLM evaluation calls**, primarily through the batch system and interactive `/career-ops` skill invocations.

Goal: reduce per-evaluation token cost 40–70% without degrading output quality.

---

## Baseline Token Budget (Current State)

Two recent commits (`d02c9e8`, `5e10a07`) pruned the interactive evaluation pipeline. `oferta.md` was cut from ~163 → 100 lines and now runs only Blocks A, B, C, G (removed: D=Comp, E=CV Personalization, F=STAR Stories). `auto-pipeline.md` was similarly scoped down and no longer generates full reports or PDFs by default.

**`batch/batch-prompt.md` has not been updated** and still carries all blocks A–G (378 lines). This is the primary drift to resolve.

### Interactive Mode (single evaluation via `/career-ops oferta`) — post-pruning
| File loaded | Lines | Est. tokens |
|-------------|-------|-------------|
| `modes/_shared.md` | 239 | ~3,000 |
| `modes/oferta.md` | 100 *(was ~163)* | ~1,200 |
| `cv.md` | 55 | ~600 |
| `modes/_profile.md` | 90 | ~1,100 |
| JD text (variable) | — | ~2,000–4,000 |
| **Context subtotal** | | **~7,900–9,900** |
| Response (A+B+C+G only) | — | ~2,500–4,500 |
| **Total per evaluation** | | **~10,400–14,400** |

### Batch Mode (single worker via `batch-runner.sh`) — not yet pruned
| File loaded | Lines | Est. tokens |
|-------------|-------|-------------|
| `batch/batch-prompt.md` (all blocks A–G) | 378 | ~3,500 |
| `cv.md` (worker reads directly) | 55 | ~600 |
| JD text (variable) | — | ~2,000–4,000 |
| **Context subtotal** | | **~6,100–8,100** |
| Response (full A–G) | — | ~4,000–8,000 |
| **Total per offer** | | **~10,000–16,000** |
| **10 parallel workers** | | **~100,000–160,000** |

---

## User Decisions

| Decision | Choice |
|----------|--------|
| SDK migration / API billing | No — keep `claude -p` workers; uses Claude Max plan, no separate API bill |
| Batch API latency tolerance | No — keep real-time; skip Batch API (OPT-4) |
| Implementation order | All at once in a single pass |

---

## Optimization Opportunities

### OPT-1 — Align and Compress `batch-prompt.md`

**What:** `batch-prompt.md` (378 lines, ~3,500 tokens) still contains Blocks D, E, and F that were already removed from `modes/oferta.md` in the last two commits. This drift means batch workers are doing significantly more work than interactive evaluations, with no corresponding quality benefit for standard screening.

Beyond the block alignment, the file contains compressible boilerplate:
- Placeholder reference table (lines 30–39) — ~200 tokens, human-facing docs not needed at runtime
- Archetype framing table (lines 58–88) — ~600 tokens, can be condensed to inline bullets
- Block E and F scaffolding examples — ~400 tokens of example rows and table headers

**How:**
1. Remove Blocks D (Comp WebSearch), E (CV Personalization Plan), F (STAR Stories) — align with `oferta.md` scope
2. Remove placeholder docs table
3. Compress archetype framing table into inline text

**Savings estimate:**
- Removing D+E+F from prompt: ~900–1,200 tokens input per worker; ~2,500–4,500 tokens less output per offer (no WebSearch, no STAR table)
- Compression of boilerplate: ~600 tokens per worker
- At 10 workers: **~31,000–57,000 tokens per batch run** (input + output combined)
- Risk: low — aligns batch with the already-validated interactive scope

---

### ~~OPT-2 — Two-Phase Evaluation~~ (Skipped)

**Decision:** Requires Anthropic SDK (separate API billing). Skipped — batch runs on `claude -p` workers via Claude Max plan.

---

### ~~OPT-3 — Anthropic SDK + Prompt Caching~~ (Skipped)

**Decision:** Would require separate Anthropic API billing. `claude -p` workers use Claude Max subscription with no additional cost. Skipped.

---

### ~~OPT-4 — Anthropic Batch API~~ (Skipped)

**Decision:** Real-time results required. Also would require separate API billing.

---

### OPT-5 — Lazy-Load Writing Style / ATS Rules in Interactive Mode

**What:** `modes/_shared.md` (239 lines, ~3,000 tokens) is always loaded for evaluation modes. It contains sections that are only needed in specific modes:
- Writing style calibration (~60 lines) — only needed for `pdf`, `apply`, `contacto`
- ATS compatibility rules (~25 lines) — only needed for `pdf`
- Scoring system table (~20 lines) — relevant only during evaluation

**How:** Split `_shared.md` into:
- `_shared-core.md` (~70 lines) — always loaded: global rules, data sources, tools
- `_shared-scoring.md` (~70 lines) — load for: `oferta`, `ofertas`, `batch`, `pipeline`
- `_shared-writing.md` (~110 lines) — load for: `pdf`, `apply`, `contacto`

SKILL.md controls which mode files are loaded — OPT-5 adds conditional `_shared` sections.

**Savings estimate:**
- For non-generation modes (`tracker`, `deep`, `patterns`, `followup`, `scan`): save ~1,500–2,000 tokens per invocation
- These are lower-frequency modes; moderate aggregate impact
- **Savings: ~1,500–2,000 tokens per non-evaluation mode call**
- Risk: low — additive split, backwards-compatible

---

### OPT-6 — Deduplicate Language Variant `_shared.md` Files

**What:** There are 6 language variants of `_shared.md` (en, de, fr, ja, pt, ru) each ~200–240 lines. The scoring tables, rule sections, and data source references are semantically identical — only labels differ. This is a maintenance issue and contributes to prompt bloat for multilingual users who might switch languages mid-session.

**How:** Keep one canonical `_shared.md`. Add a `language` key to `config/profile.yml`. Language-specific terminology (DACH compensation terms, French contract types, etc.) lives only in the language-specific mode files (already separate: `modes/de/`, `modes/fr/`, etc.).

**Savings estimate:**
- No direct per-call token savings (only one language is loaded at a time)
- Eliminates ~1,200 lines of duplicated maintenance surface
- Reduces risk of language variants drifting out of sync after updates
- Risk: low — consolidation only, no behavior change

---

### ~~OPT-7 — Conditional Block F~~ (Superseded by OPT-1)

Block F was already removed from `modes/oferta.md` in commit `5e10a07`. Removing it from `batch-prompt.md` is now part of OPT-1 (alignment). This optimization no longer exists as a separate item.

---

## Implementation Roadmap

All optimizations in a single pass. OPT-MEASURE runs before and after to capture actual savings.

| Order | ID | Name | Effort | Token Savings (10-offer batch) | Risk |
|-------|----|------|--------|-------------------------------|------|
| 0 | OPT-MEASURE | Baseline capture | Low (1h) | — (measurement) | None |
| 1 | OPT-1 | Align + compress batch-prompt.md | Low (2–3h) | ~31,000–57,000 | Low |
| 2 | OPT-6 | Deduplicate language _shared | Low (1h) | 0 (maintenance) | Low |
| 3 | OPT-5 | Lazy-load _shared sections | Medium (2–3h) | ~1,500/call | Low |
| — | ~~OPT-2~~ | ~~Two-phase evaluation~~ | — | Skipped (requires API billing) | — |
| — | ~~OPT-3~~ | ~~SDK + Prompt Caching~~ | — | Skipped (requires API billing) | — |
| — | ~~OPT-4~~ | ~~Batch API~~ | — | Skipped (requires API billing) | — |
| — | ~~OPT-7~~ | ~~Conditional Block F~~ | — | Superseded by OPT-1 | — |

**Combined savings estimate (all implemented, 10-offer batch run):**
- OPT-1 alone: ~31,000–57,000 tokens (block removal + compression)
- Interactive mode (OPT-5): additional ~1,500–2,000 tokens per non-evaluation call

---

## Implementation Notes

### OPT-1: What to remove/compress in `batch-prompt.md`
- **Remove Block D** (Comp + WebSearch, ~40 lines) — no longer in interactive scope
- **Remove Block E** (CV Personalization Plan, ~25 lines) — no longer in interactive scope
- **Remove Block F** (STAR Stories, ~30 lines) — removed from `oferta.md` in commit `5e10a07`
- **Remove Placeholders table** (lines 30–39) — human docs, not needed at runtime
- **Compress archetype framing table** (lines 58–88) → inline bullets (~600 → ~200 tokens)
- **Remove Block E/F table example scaffolding** (~8 lines of header examples)
- Target: reduce from 378 → ~240 lines; output per offer drops ~2,500–4,500 tokens (no WebSearch, no rewrite plan, no STAR table)


---

## Measuring Token Savings (OPT-MEASURE)

### Phase 0 — Baseline Capture (before any changes)

Create `token-audit.mjs` that counts estimated prompt tokens for each mode combination. Run before implementing any optimization and save output to `reports/token-baseline-{date}.json`.

```js
// token-audit.mjs
// Reads all prompt files and estimates token counts (1 token ≈ 4 chars)
// Outputs: per-file counts, per-mode totals, batch worker total
// Usage: node token-audit.mjs [--save]
```

Files to measure:
- `batch/batch-prompt.md` (system prompt per worker)
- `modes/_shared.md`, `modes/oferta.md`, `modes/auto-pipeline.md`
- `modes/_profile.md`, `cv.md`
- Each language `_shared.md` variant (de, fr, ja, pt, ru)

Output format (`reports/token-baseline-{date}.json`):
```json
{
  "captured_at": "2026-05-04",
  "files": { "batch/batch-prompt.md": 3512, "modes/_shared.md": 2987, ... },
  "modes": {
    "oferta": { "input_estimate": 8900, "files": ["_shared.md", "oferta.md", "cv.md", "_profile.md"] },
    "batch_worker": { "input_estimate": 6800, "files": ["batch-prompt.md", "cv.md"] }
  }
}
```

### Phase 1 — SDK Usage Logging (after OPT-3)

Once `batch-worker.mjs` uses the Anthropic SDK, every API response includes a `usage` object. Log it per offer:

```js
// In batch-worker.mjs, after each message.create():
const { input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens } = response.usage;
appendToLog({ offer_id, input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens });
```

Append to `reports/token-log.jsonl` (one JSON line per offer evaluated). Fields:
- `offer_id`, `date`, `mode` (`batch` / `interactive`)
- `input_tokens`, `output_tokens`
- `cache_creation_input_tokens` (tokens written to cache, charged at 125% — first worker only)
- `cache_read_input_tokens` (tokens read from cache, charged at 10%)
- `quick_screen_tokens` (if OPT-2 pre-screen ran and filtered the offer)

### Phase 2 — Token Report Script

`node token-audit.mjs --report` reads `reports/token-log.jsonl` and prints:

```
Token Usage Summary
───────────────────────────────────────
Offers evaluated:       42
Total input tokens:     612,400
Total output tokens:    198,300
Cache hits:             38 / 42 workers (90%)
Cache read tokens:      126,000  (saved ~113,400 vs. uncached)
Pre-screen filtered:    11 offers (26%) — saved ~77,000 tokens
───────────────────────────────────────
Estimated cost:         $X.XX
Estimated savings vs. baseline: $X.XX (XX%)
```

### Baseline Comparison

After all optimizations land, run a controlled comparison:
1. Take 5 identical JDs
2. Run against the pre-optimization baseline (git stash or branch)
3. Run against the new implementation
4. Compare `token-log.jsonl` entries
5. Document in `reports/token-savings-report-{date}.md`

---

## Verification

For each optimization, validate against a known 10-offer batch:
1. `node token-audit.mjs` — confirm estimated prompt sizes match expectations for the current change
2. `node verify-pipeline.mjs` — confirm reports are structurally valid
3. Spot-check 3 reports: one high score (≥4.5), one mid (3.5–4.0), one low (≤3.0)
4. Confirm TSV tracker lines are well-formed for `merge-tracker.mjs`
5. For OPT-1: confirm batch reports no longer contain Block D/E/F sections; confirm Bloque G still present
6. For OPT-2: confirm skipped offers write a valid `SKIP` report; confirm quick-screen JSON is parseable
7. For OPT-3: `node token-audit.mjs --report` — confirm `cache_read_input_tokens` > 0 after worker 2+; expect ≥80% cache hit rate on `batch-prompt.md` content
8. Final: run 5 identical JDs before and after all changes, compare `token-log.jsonl` entries to validate savings estimates
