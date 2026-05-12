---
name: career-ops
description: AI job search command center -- evaluate offers, generate CVs, scan portals, track applications
user_invocable: true
args: mode
argument-hint: "[scan | deep | pdf | oferta | ofertas | apply | batch | sequential | tracker | pipeline | contacto | training | project | interview-prep | update]"
---

# career-ops -- Router

## Mode Routing

Determine the mode from `{{mode}}`:

| Input | Mode |
|-------|------|
| (empty / no args) | `discovery` -- Show command menu |
| JD text or URL (no sub-command) | **`auto-pipeline`** |
| `oferta` | `oferta` |
| `ofertas` | `ofertas` |
| `contacto` | `contacto` |
| `deep` | `deep` |
| `pdf` | `pdf` |
| `training` | `training` |
| `project` | `project` |
| `tracker` | `tracker` |
| `pipeline` | `pipeline` |
| `apply` | `apply` |
| `scan` | `scan` |
| `batch` | `batch` |
| `sequential` | `sequential` |
| `patterns` | `patterns` |
| `followup` | `followup` |

**Auto-pipeline detection:** If `{{mode}}` is not a known sub-command AND contains JD text (keywords: "responsibilities", "requirements", "qualifications", "about the role", "we're looking for", company name + role) or a URL to a JD, execute `auto-pipeline`.

If `{{mode}}` is not a sub-command AND doesn't look like a JD, show discovery.

---

## Discovery Mode (no arguments)

Show this menu:

```
career-ops -- Command Center

Available commands:
  /career-ops {JD}      → AUTO-PIPELINE: evaluate + report + PDF + tracker (paste text or URL)
  /career-ops pipeline  → Process pending URLs from inbox (data/pipeline.md)
  /career-ops oferta    → Evaluation only A-B-C-G (no auto PDF)
  /career-ops ofertas   → Compare and rank multiple offers
  /career-ops contacto  → LinkedIn power move: find contacts + draft message
  /career-ops deep      → Deep research prompt about company
  /career-ops pdf       → PDF only, ATS-optimized CV
  /career-ops training  → Evaluate course/cert against North Star
  /career-ops project   → Evaluate portfolio project idea
  /career-ops tracker   → Application status overview
  /career-ops apply     → Live application assistant (reads form + generates answers)
  /career-ops scan      → Scan portals and discover new offers
  /career-ops batch     → Batch processing with parallel workers (use `node batch/batch-worker.mjs` for OPT-3 caching)
  /career-ops sequential → Automatically evaluate all unevaluated offers and populate dashboard
  /career-ops patterns  → Analyze rejection patterns and improve targeting
  /career-ops followup  → Follow-up cadence tracker: flag overdue, generate drafts

Inbox: add URLs to data/pipeline.md → /career-ops pipeline
Or paste a JD directly to run the full pipeline.
```

---

## Context Loading by Mode (OPT-5 Lazy-Load)

After determining the mode, load context files before executing. Use language variant if configured in config/profile.yml.

### Evaluation modes (oferta, ofertas, pipeline, batch, auto-pipeline):
Load:
1. `modes/_shared-core.md` (always)
2. `modes/_shared-scoring.md` (scoring rules)
3. `modes/{mode}.md`

### Generation modes (pdf, apply, contacto):
Load:
1. `modes/_shared-core.md` (always)
2. `modes/_shared-writing.md` (writing style + ATS rules)
3. `modes/{mode}.md`

### Non-evaluation modes (tracker, deep, training, project, patterns, followup):
Load:
1. `modes/_shared-core.md` (always)
2. `modes/{mode}.md`

### Modes delegated to subagent:
For `scan`, `apply` (with Playwright), and `pipeline` (3+ URLs): launch as Agent with conditional context injection.

```javascript
const coreContext = readFile('modes/_shared-core.md');
const specialContext = (mode in ['oferta','ofertas','pipeline','batch']) 
  ? readFile('modes/_shared-scoring.md') 
  : (mode in ['pdf','apply','contacto']) 
    ? readFile('modes/_shared-writing.md') 
    : '';

Agent(
  subagent_type="general-purpose",
  prompt="${coreContext}\n\n${specialContext}\n\n[content of modes/{mode}.md]\n\n[invocation-specific data]",
  description="career-ops {mode}"
)
```

Execute the instructions from the loaded mode file.

---

## Sequential Mode (Automated Pipeline)

If `{{mode}}` is `sequential`:

1. **Resolve the active profile:**
   - Read `config/profile.yml` to get the profile name (field `name` or `profile`), default to `bryan`
   - All paths below are relative to `profiles/{profile}/` (e.g. `profiles/bryan/batch/batch-state.tsv`)

2. **Scan for unevaluated offers:**
   - Read `profiles/{profile}/batch/batch-state.tsv`
   - Also check `profiles/{profile}/batch/batch-input.tsv` for IDs with no state row at all
   - Find all offers where `status` is NOT `'completed'` OR `report_num` is empty
   - Count unevaluated offers

3. **Report status:**
   - If 0 unevaluated: "All offers already evaluated. Dashboard is current."
   - If >0: "Found {N} unevaluated offers. Starting automated evaluation pipeline..."

4. **Delegate to subagent:**
   - Load `modes/_shared-core.md` and `modes/_shared-scoring.md`
   - Launch Agent with `subagent_type="general-purpose"` and:
     ```
     prompt: |
       # Automated Sequential Evaluation Pipeline
       
       {_shared-core.md content}
       
       {_shared-scoring.md content}
       
       ## Your Task
       
       You will evaluate ALL unevaluated offers from profiles/{profile}/batch/batch-state.tsv sequentially and NON-INTERACTIVELY.
       The profile root is `profiles/{profile}/`. All file paths below are relative to the project root.
       
       ### Process (for each unevaluated offer):
       
       1. **Read offer metadata** from `profiles/{profile}/batch/batch-input.tsv` (id, url, source, notes) and `profiles/{profile}/batch/batch-state.tsv` (status, report_num)
       2. **Fetch JD:** Use Playwright or WebFetch to get the current job description text from {url}
       3. **Save JD:** Write to `profiles/{profile}/data/jds/{id}.txt`
       4. **Evaluate:** Apply blocks A-G scoring framework (role summary, CV match, level strategy, legitimacy)
       5. **Generate report:** Create markdown report at `profiles/{profile}/reports/{report_num}-{company-slug}-{date}.md`
       6. **Update batch-state.tsv:** Set status='completed', completed_at=ISO8601, report_num, score in `profiles/{profile}/batch/batch-state.tsv`
       7. **Track progress:** Output "Evaluated {id}: {company} - {role} ({score}/5.0)"
       
       ### Critical Requirements
       
       - **Non-interactive:** No questions, no pausing, no user input. Just process all offers.
       - **Report format:** Standard blocks A-F (role, CV match, level, comp, tradeoffs, notes) + block G (legitimacy)
       - **Legitimacy:** High Confidence, Proceed with Caution, or Suspicious (use intuition from JD quality/posting details)
       - **Score:** 0-5 scale based on overall fit (see _shared-scoring.md)
       - **Handle failures:** If fetch fails, use archived JD from `profiles/{profile}/data/jds/{id}.txt` if available; if evaluation fails, set score=2.0 and error reason
       
       ### After All Evaluations Complete
       
       1. Run: `DATA_ROOT=profiles/{profile} node build-dashboard-data.mjs` (pre-compute dashboard JSON)
       2. Run: `node merge-tracker.mjs` (merge TSV additions to applications.md)
       3. Report: "Pipeline complete. Evaluated {total} offers. {passing} passed (≥3.0), {failing} below threshold."
       
       Start now. No preamble, just evaluate sequentially.
     ```
   - Description: "career-ops sequential: automated evaluation pipeline"

5. **After completion:**
   - Subagent will have updated `profiles/{profile}/batch/batch-state.tsv`, created reports, updated tracker
   - Subagent runs `DATA_ROOT=profiles/{profile} node build-dashboard-data.mjs` and `node merge-tracker.mjs`
   - Confirm to user: "Sequential pipeline complete. Dashboard is ready for viewing."