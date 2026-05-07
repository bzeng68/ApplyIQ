# Cloud Sync + Run Pipeline Button

**Date:** 2026-05-07

## Context

The local pipeline (scan → evaluate → build-dashboard-data) writes files to the local filesystem. The cloud dashboard reads from a GCS bucket mounted at `/mnt/data`. Right now there's no connection between the two — local work never reaches the live dashboard.

This plan adds:
1. **GCS sync** — triggered at the end of `build-dashboard-data.mjs` locally, pushing local data to GCS so the online dashboard always reflects current state.
2. **Run Pipeline button** — a button in the dashboard header that triggers the Cloud Run job on demand, shows live status, and auto-reloads the offers table when done.

---

## Feature 1: Local-to-GCS Sync

### How it works

At the end of `build-dashboard-data.mjs` (which is the final step of any local pipeline run), detect if we're running locally vs in Cloud Run. If local and `GCS_BUCKET` is set, sync data to GCS.

**Double-write guard:** Cloud Run sets `DATA_ROOT=/mnt/data` (GCS FUSE mount) — data written there goes directly to GCS. No SDK sync needed. Skip sync when `DATA_ROOT` starts with `/mnt/`.

```
Local run:  build-dashboard-data.mjs → writes to ./data/ → sync-to-gcs.mjs → GCS bucket
Cloud run:  build-dashboard-data.mjs → writes to /mnt/data/ (FUSE) → GCS bucket (automatic)
```

### Files to sync

Three directories, mirrored into the GCS bucket root:

| Local path | GCS path | Contents |
|------------|----------|----------|
| `data/` | `data/` | dashboard-offers.json, scan-history.tsv, ui-state.json, pipeline.md |
| `reports/` | `reports/` | all evaluation .md files |
| `batch/` | `batch/` | batch-state.tsv, batch-input.tsv, tracker-additions/ (exclude `logs/`) |

Sync is **upsert-only** (no remote deletes) — use `{ preconditionOpts: { ifGenerationMatch: 0 } }` only for new files, overwrite existing ones unconditionally.

### Authentication (local)

Uses [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials). User must run `gcloud auth application-default login` once. No key file needed.

GCS SDK auto-picks ADC when `GOOGLE_APPLICATION_CREDENTIALS` is unset.

### Implementation

**New file: `sync-to-gcs.mjs`**

```js
// Reads GCS_BUCKET env var
// Syncs data/, reports/, batch/ (excluding batch/logs/)
// Logs: "Synced 47 files to gs://applyiq-data-xxx"
// Skips silently if GCS_BUCKET not set
```

**`build-dashboard-data.mjs` changes:**
- Make `main()` async (it's currently sync)
- Add at the very end:
  ```js
  const isCloudRun = DATA_ROOT.startsWith('/mnt/');
  if (!isCloudRun && process.env.GCS_BUCKET) {
    const { syncToGcs } = await import('./sync-to-gcs.mjs');
    await syncToGcs();
  }
  ```

**`package.json` changes:**
- Add script: `"sync": "node sync-to-gcs.mjs"` (standalone manual sync)
- Add dependency: `"@google-cloud/storage": "^7.x"`

**`.env.example` changes:**
- Add `GCS_BUCKET=applyiq-data-apply-iq-495519` with a comment

### Files modified
- `build-dashboard-data.mjs` — make async, add sync call at end
- `sync-to-gcs.mjs` — new file
- `package.json` — add script + dependency
- `.env.example` — document GCS_BUCKET

---

## Feature 2: Run Pipeline Button

### Architecture

```
Browser → POST /api/pipeline/run → Cloud Run Jobs API → applyiq-pipeline job
Browser → GET /api/pipeline/status → Cloud Run Executions API → execution state
```

The Next.js API routes call GCP via `google-auth-library` (service account OIDC token — automatic in Cloud Run). The dashboard SA needs a new IAM permission to trigger jobs.

### IAM change

Current `dashboard_sa` has `storage.objectViewer` on the bucket. Needs project-level `roles/run.developer` to:
- Create executions (`run.executions.create`)
- Read execution status (`run.executions.get`, `run.jobs.get`)

**`terraform/main/iam.tf` — add:**
```hcl
resource "google_project_iam_member" "dashboard_run_developer" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.dashboard_sa.email}"
}
```

### Dashboard container env vars

**`terraform/main/cloud_run_service.tf` — add to containers block:**
```hcl
env { name = "GCP_PROJECT_ID", value = var.project_id }
env { name = "GCP_REGION",     value = var.region }
env { name = "PIPELINE_JOB_NAME", value = "applyiq-pipeline" }
```

### API routes

**`dashboard-web/app/api/pipeline/run/route.ts`** — `POST`
- Gets OIDC access token via `google-auth-library` (`GoogleAuth` with `cloud-platform` scope)
- Calls: `POST https://{REGION}-run.googleapis.com/apis/run.googleapis.com/v1/projects/{PROJECT}/locations/{REGION}/jobs/{JOB}:run`
- Returns: `{ executionName: string, startTime: string }`
- Error cases: 409 already running (return current execution), 403 permission denied

**`dashboard-web/app/api/pipeline/status/route.ts`** — `GET ?executionName=xxx` or `?latest=true`
- `?executionName=xxx` — calls Cloud Run Executions API for that specific execution, returns `{ state, startTime, completedAt, error? }`
- `?latest=true` — lists executions for the job (sorted desc), returns most recent one's state + times
- Maps Cloud Run condition types to simple states: `QUEUED | RUNNING | SUCCEEDED | FAILED`

**`dashboard-web/package.json` — add:**
```json
"google-auth-library": "^9.x"
```

### UI

**Where:** Header in `app/layout.tsx`, right side (already has an empty right slot in the `flex items-center justify-between` div).

**Component: `components/PipelineButton.tsx`** (new, client component)

States and display:

| State | Button label | Subtitle below header title |
|-------|-------------|---------------------------|
| `idle` | `▶ Run Pipeline` | `Last run: 3 hours ago` |
| `triggering` | `Starting...` (spinner) | `Last run: 3 hours ago` |
| `running` | `Scanning...` / `Evaluating...` / `Formatting...` (spinner) | `Running for 2m 14s` |
| `succeeded` | `▶ Run Pipeline` | `Last run: just now` |
| `failed` | `▶ Run Pipeline` | `Last run failed — 5 min ago` |

**Phase simulation** (since Cloud Run gives no sub-step granularity):
- 0–30s elapsed → "Scanning..."
- 30s–5m elapsed → "Evaluating..."
- 5m+ elapsed → "Formatting..."

**Polling:** 5-second interval while `state === 'running'`. Stop on SUCCEEDED or FAILED.

**Auto-reload:** On SUCCEEDED, call `router.refresh()` (Next.js App Router) to re-fetch server components and update the offers table.

**State persistence across page refreshes:** Store `{ executionName, startTime }` in `localStorage`. On mount:
1. If localStorage has an in-progress execution → resume polling it
2. Else → call `/api/pipeline/status?latest=true` to populate "Last run" time

**`app/layout.tsx` change:**
```tsx
// Replace the empty right side of the header with:
<PipelineButton />
```

### Files modified / created
- `terraform/main/iam.tf` — add `dashboard_run_developer`
- `terraform/main/cloud_run_service.tf` — add 3 env vars
- `dashboard-web/app/api/pipeline/run/route.ts` — new
- `dashboard-web/app/api/pipeline/status/route.ts` — new
- `dashboard-web/components/PipelineButton.tsx` — new
- `dashboard-web/app/layout.tsx` — mount `<PipelineButton />`
- `dashboard-web/package.json` — add `google-auth-library`

---

## Shared / Deployment

- `terraform apply` to provision: new IAM binding + new env vars on dashboard service
- CI/CD (`deploy.yml`) auto-deploys new dashboard image on push to main — no changes needed

---

## Verification

### Feature 1 (Sync)
1. Set `GCS_BUCKET=applyiq-data-apply-iq-495519` in `.env`
2. Run `node build-dashboard-data.mjs` locally — should end with "Synced X files to gs://..."
3. Check GCS bucket in Cloud Console: confirm `data/dashboard-offers.json` updated
4. Open the cloud dashboard — should show updated data

### Feature 2 (Run button)
1. `terraform apply` — confirm `dashboard_run_developer` binding appears in IAM
2. Deploy new dashboard image via push to main
3. Open cloud dashboard, click "Run Pipeline"
4. Button transitions: `Starting...` → `Scanning...` → `Evaluating...` → `Formatting...`
5. Cloud Run console shows new execution in progress
6. On completion, offers table reloads automatically
7. "Last run: just now" appears in header
8. Refresh page — "Last run" time restored from localStorage + API
