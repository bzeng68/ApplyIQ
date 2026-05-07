# Cloud Deploy Plan — ApplyIQ on GCP (Terraform)

## Context

The ApplyIQ pipeline (scan → evaluate → dashboard) currently runs locally:
- `scan.mjs` discovers new postings every time it's run manually
- `batch/batch-runner.sh` calls the local `claude` CLI (Claude Max subscription) to evaluate each offer
- The Next.js dashboard at `dashboard-web/` reads files directly from the local filesystem (`../data/*`, `../reports/*`)

This is brittle: scans happen ad-hoc, evaluation depends on a local CLI subscription, the dashboard is only viewable on the dev machine. The goal is to lift everything into GCP so that:
1. A daily 5pm EST job auto-discovers + evaluates new postings, and pushes results to shared storage
2. The dashboard runs on Cloud Run (scales to zero), gated by Cloud IAP, shareable with a Google-account allowlist
3. All infra is reproducible with Terraform, state stored remotely with locking

**Outcome:** Wake up each day to a fresh dashboard with new evaluations, zero manual effort. Friends can be added to the IAP allowlist with one Terraform line.

---

## Architecture Overview

```
                    ┌──────────────────────────┐
                    │  Cloud Scheduler (cron)  │
                    │  daily 17:00 America/    │
                    │  New_York (DST-aware)    │
                    └────────────┬─────────────┘
                                 │ HTTPS POST + OIDC token
                                 ▼
                    ┌──────────────────────────┐
                    │  Cloud Run Job: pipeline │
                    │  (scan + evaluate)       │
                    │  - Node 20 + Anthropic   │
                    │    SDK                   │
                    │  - 2 vCPU, 2 GiB         │
                    │  - 60-min timeout        │
                    └────────────┬─────────────┘
                                 │ read/write
                                 ▼
                    ┌──────────────────────────┐
                    │  GCS bucket              │
                    │  applyiq-data-<proj>     │
                    │  /reports/, /data/jds/,  │
                    │  /batch/, /data/*.json   │
                    │  /data/*.tsv             │
                    └────────────┬─────────────┘
                                 │ gcsfuse mount @ /mnt/data
                                 ▼
┌────────┐  IAP   ┌──────────────────────────────────┐
│ Browser│───────▶│  Cloud Run Service: dashboard    │
│ (you + │        │  - Next.js 14 (standalone build) │
│ friends)│       │  - 1 vCPU, 512 MiB, min=0,max=1  │
└────────┘        │  - gcsfuse sidecar to GCS bucket │
                  └──────────────────────────────────┘
                                 ▲
                                 │ pulls image
                                 │
                  ┌──────────────────────────────────┐
                  │ Artifact Registry (Docker)       │
                  │ - dashboard:<git-sha>            │
                  │ - pipeline:<git-sha>             │
                  └──────────────────────────────────┘
                                 ▲
                                 │ build & push
                                 │
                  ┌──────────────────────────────────┐
                  │ GitHub Actions                   │
                  │ - On push to main:               │
                  │   build → push → deploy revision │
                  └──────────────────────────────────┘

Secret Manager:
  - anthropic-api-key  (used by pipeline job)
```

---

## Decisions (from clarifying Q&A)

| Decision | Choice | Why |
|---|---|---|
| Eval engine in cloud | **Anthropic API SDK** with `ANTHROPIC_API_KEY` in Secret Manager | `claude` CLI doesn't run in containers; SDK is the supported path. ~$5–15/mo expected. |
| Dashboard data access | **GCS bucket mounted via gcsfuse** | Minimal change to `lib/data.ts` (still reads `../data/*`); Cloud Run 2nd gen supports gcsfuse sidecar natively. |
| Auth | **Cloud IAP allowlist** of Google accounts | Free for <50 users; you can add friends by appending an email to a Terraform list. |
| Daily pipeline scope | **Scan + evaluate new postings**, then rebuild dashboard JSON | Fully automated; dashboard always reflects yesterday's market. |
| Anthropic API key | **Stored in Secret Manager**, mounted as env var into the pipeline job only | Dashboard never sees the key. |
| Terraform state | **GCS bucket with state locking** (separate bootstrap bucket) | Survives laptop loss; safe for multi-machine applies. |
| Region | **us-east1** (South Carolina) | Lowest latency for EST. All required services available. |
| Container build | **GitHub Actions** → Artifact Registry on push to `main` | Auto-deploy on merge; no manual `gcloud` ceremony. |
| Data seeding | **`null_resource` + `local-exec gsutil rsync`** on first apply | One-shot migration of existing reports/JDs/state into GCS. |
| Domain | **Default `*.run.app` URL** | No DNS. Custom domain can be added later if shared widely. |
| Scaling | **Dashboard:** min=0, max=1 (scale-to-zero, ~3–5s cold start). **Pipeline job:** runs once per schedule, exits cleanly. | User accepted short startup time. Minimum cost. |

---

## Repository Layout (new files)

```
ApplyIQ/
  terraform/                          # NEW — all IaC lives here
    bootstrap/                        # Run ONCE manually to create TF state bucket
      main.tf                         # Creates GCS bucket for terraform state + APIs
      README.md                       # "Run `terraform apply` here once before main/"
    main/                             # The actual infra (run after bootstrap)
      providers.tf                    # google + google-beta providers, backend "gcs"
      variables.tf                    # project_id, region, iap_allowlist[], etc.
      versions.tf                     # TF + provider version pins
      apis.tf                         # Enable required GCP APIs
      iam.tf                          # Service accounts: pipeline-sa, dashboard-sa, scheduler-sa, WIF
      secrets.tf                      # Secret Manager: anthropic-api-key
      storage.tf                      # GCS bucket applyiq-data + lifecycle rules
      artifact_registry.tf            # Docker registry for images
      cloud_run_service.tf            # Dashboard service (with gcsfuse mount)
      cloud_run_job.tf                # Pipeline job (scan + evaluate)
      scheduler.tf                    # Cloud Scheduler — daily 17:00 America/New_York trigger
      iap.tf                          # IAP gate on dashboard + email allowlist
      seed.tf                         # null_resource: rsync local data → GCS on first apply
      outputs.tf                      # Dashboard URL, bucket name, image registry
      terraform.tfvars.example        # Template for project_id, allowlist, etc.
    .gitignore                        # ignore .terraform/, *.tfstate*, terraform.tfvars

  docker/                             # NEW — container definitions
    dashboard.Dockerfile              # Next.js standalone build
    pipeline.Dockerfile               # Node 20 + Playwright + jq for the scan/eval job

  scripts/                            # NEW — entrypoints called inside containers
    pipeline-entrypoint.sh            # Runs: scan.mjs → evaluate-new.mjs → build-dashboard-data.mjs
    evaluate-new.mjs                  # NEW — replaces batch-runner.sh; uses Anthropic SDK

  .github/workflows/
    deploy.yml                        # NEW — on push to main: build + push to AR + deploy
    test.yml                          # EXISTING — leave as-is

  planning/
    cloud-deploy.md                   # THIS PLAN

  dashboard-web/lib/
    data.ts                           # MODIFIED — add DATA_ROOT env var fallback
```

---

## Critical Code Changes (outside Terraform)

### 1. `scripts/evaluate-new.mjs` (new — replaces `batch-runner.sh` for cloud)

Self-contained Node script that:
1. Reads `batch/batch-state.tsv` from GCS-mounted path to find offers with `status != 'completed'` OR missing report
2. For each:
   - Fetches JD via Playwright (or HTTP) to `data/jds/{id}.txt`
   - Renders `batch/batch-prompt.md` with `{{URL}}`, `{{JD_FILE}}`, `{{REPORT_NUM}}`, `{{ID}}`, `{{DATE}}` placeholders
   - Calls Anthropic API (Claude Sonnet 4.6) with:
     - System prompt = rendered `batch-prompt.md`
     - User message = "Evaluate this offer."
     - Tools: file reads (`cv.md`, `article-digest.md`, `modes/_profile.md`)
   - Writes report to `reports/{num}-{slug}-{date}.md`
   - Updates `batch/batch-state.tsv` row (status, score, completed_at)
3. Concurrency: process up to 4 offers in parallel (Promise.all batches)
4. After loop: invoke `build-dashboard-data.mjs` to refresh `data/dashboard-offers.json`

**Why a new script:** `batch-runner.sh` shells out to `claude -p`, which doesn't exist in the container. The new script uses `@anthropic-ai/sdk` directly with the same prompt and produces identical output files.

### 2. `dashboard-web/lib/data.ts` (modified)

Replace the hardcoded `path.resolve(process.cwd(), '..')` with:

```ts
const ROOT = process.env.DATA_ROOT
  ? path.resolve(process.env.DATA_ROOT)
  : path.resolve(process.cwd(), '..');
```

In Cloud Run, `DATA_ROOT=/mnt/data` (the gcsfuse mount). Locally, `DATA_ROOT` is unset and behavior is unchanged.

### 3. `dashboard-web/next.config.js` (modified)

Add `output: 'standalone'` so `next build` produces a self-contained server bundle for the Docker image.

### 4. `docker/dashboard.Dockerfile`

```dockerfile
FROM node:20-slim AS deps
WORKDIR /app
COPY dashboard-web/package*.json ./
RUN npm ci

FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY dashboard-web/ ./
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production DATA_ROOT=/mnt/data PORT=8080
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 8080
CMD ["node", "server.js"]
```

### 5. `docker/pipeline.Dockerfile`

```dockerfile
FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y curl jq && \
    npm install -g playwright@latest && \
    npx playwright install --with-deps chromium
COPY package*.json ./
RUN npm ci --omit=dev && \
    npm install @anthropic-ai/sdk @google-cloud/storage
COPY . ./
ENTRYPOINT ["bash", "scripts/pipeline-entrypoint.sh"]
```

### 6. `scripts/pipeline-entrypoint.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
export DATA_ROOT=/mnt/data
cd /app
node scan.mjs
node scripts/evaluate-new.mjs
node build-dashboard-data.mjs
echo "Pipeline complete: $(date -u +%FT%TZ)"
```

### 7. `.github/workflows/deploy.yml`

On push to `main`:
1. Auth to GCP via Workload Identity Federation (no static keys)
2. `gcloud builds submit` for each Dockerfile → tagged `<service>:${{github.sha}}` and `:latest` in Artifact Registry
3. `gcloud run services update applyiq-dashboard --image=...` to roll out new revision
4. `gcloud run jobs update applyiq-pipeline --image=...`

---

## Terraform Resource Inventory

| Resource | File | Purpose |
|---|---|---|
| `google_project_service` (Cloud Run, IAP, Scheduler, Artifact Registry, Secret Manager, Cloud Build, IAM) | `apis.tf` | Enable required APIs |
| `google_service_account` (`pipeline-sa`, `dashboard-sa`, `scheduler-sa`, `github-actions-sa`) | `iam.tf` | Per-component identities |
| `google_iam_workload_identity_pool` + `_provider` | `iam.tf` | GitHub Actions auth via OIDC (no static keys) |
| `google_project_iam_member` bindings | `iam.tf` | `pipeline-sa` → Storage Object Admin on bucket + Secret Accessor on api-key. `dashboard-sa` → Storage Object Viewer on bucket. `scheduler-sa` → Cloud Run Invoker on job. |
| `google_secret_manager_secret` + `_version` | `secrets.tf` | `anthropic-api-key` (value supplied via `var.anthropic_api_key`) |
| `google_storage_bucket` (`applyiq-data-<proj>`) | `storage.tf` | Single-region us-east1, versioning on, 90-day non-current cleanup |
| `google_artifact_registry_repository` (Docker) | `artifact_registry.tf` | Holds `dashboard` and `pipeline` images |
| `google_cloud_run_v2_service` (`applyiq-dashboard`) | `cloud_run_service.tf` | Min=0, max=1, IAP-gated, gcsfuse volume mount at `/mnt/data`, env `DATA_ROOT=/mnt/data` |
| `google_cloud_run_v2_job` (`applyiq-pipeline`) | `cloud_run_job.tf` | 2 vCPU / 2 GiB, 60-min timeout, gcsfuse mount, env `ANTHROPIC_API_KEY` from secret, max retries=1 |
| `google_cloud_scheduler_job` | `scheduler.tf` | Cron `0 17 * * *`, time_zone `America/New_York` (DST-aware). Target = Cloud Run Job execution endpoint with OIDC auth as `scheduler-sa`. |
| `google_iap_brand` + `google_iap_client` + `google_iap_web_iam_member` (one per email in `var.iap_allowlist`) | `iap.tf` | Brand requires manual one-time OAuth consent screen confirmation; clients + bindings are TF-managed |
| `null_resource.seed_data` (`triggers = { run_once = "true" }`) | `seed.tf` | `local-exec`: `gsutil -m rsync -r ./reports gs://${bucket}/reports` (and same for `data/` + `batch/`). Runs once. |
| `terraform_remote_state` backend `gcs` | `providers.tf` | State in bootstrap bucket, prefix `applyiq/main` |

---

## Variables (`variables.tf`)

```hcl
variable "project_id"          { type = string }
variable "region"              { type = string  default = "us-east1" }
variable "anthropic_api_key"   { type = string  sensitive = true }
variable "iap_allowlist"       { type = list(string)  default = ["zeng.br@northeastern.edu"] }
variable "schedule_cron"       { type = string  default = "0 17 * * *" }
variable "schedule_timezone"   { type = string  default = "America/New_York" }
variable "github_repo"         { type = string  default = "bzeng68/ApplyIQ" }
```

---

## Implementation Order

### Phase 1 — Bootstrap (one-time, manual)
1. `gcloud auth application-default login`
2. `gcloud projects create applyiq-<your-suffix>` (or use existing GCP project tied to Northeastern email)
3. Apply Northeastern Education credits (if eligible) at https://edu.google.com
4. `cd terraform/bootstrap && terraform init && terraform apply` — creates the state bucket + enables core APIs
5. Copy `terraform/main/terraform.tfvars.example` → `terraform.tfvars`, fill in `project_id`, `anthropic_api_key`, `iap_allowlist`

### Phase 2 — Code changes (PR #1: containerize)
1. Add `output: 'standalone'` to `dashboard-web/next.config.js`
2. Add `DATA_ROOT` env support in `dashboard-web/lib/data.ts`
3. Write `scripts/evaluate-new.mjs` (Anthropic SDK port of `batch-runner.sh`)
4. Write `scripts/pipeline-entrypoint.sh`
5. Write `docker/dashboard.Dockerfile` and `docker/pipeline.Dockerfile`
6. Run both locally with `docker build` + `docker run --env DATA_ROOT=/tmp/data` to verify

### Phase 3 — Terraform main (PR #2: infra)
1. Write all `terraform/main/*.tf` files per inventory above
2. `terraform init` (uses bootstrap bucket as backend)
3. `terraform plan` — sanity check
4. `terraform apply` — creates everything; `null_resource.seed_data` populates the bucket from local `reports/`, `data/`, `batch/`
5. **One manual step:** in Cloud Console, configure the OAuth consent screen for the IAP brand. Set support email + scope.

### Phase 4 — GitHub Actions (PR #3: CI/CD)
1. Configure Workload Identity Federation: `terraform/main/iam.tf` already creates the WIF pool + provider; copy outputs into GitHub repo secrets (`GCP_WIF_PROVIDER`, `GCP_SA_EMAIL`, `GCP_PROJECT_ID`, `GCP_REGION`)
2. Add `.github/workflows/deploy.yml`
3. Push a no-op commit to verify the workflow builds + pushes images and deploys new revisions

### Phase 5 — Verification
1. Visit Cloud Run service URL → IAP login → see dashboard
2. Check that data populated correctly (60+ reports, 130+ offers in pending/skipped tabs)
3. Trigger the Cloud Run Job once manually: `gcloud run jobs execute applyiq-pipeline --region=us-east1` → wait → check that a new offer's report appears in the bucket
4. Wait for the next 5pm EST → confirm Cloud Scheduler executed the job (Cloud Logging)
5. Add a friend's email to `iap_allowlist`, `terraform apply`, share URL, confirm they can sign in

---

## Cost Estimate (monthly, after free tier)

| Service | Usage | Monthly cost |
|---|---|---|
| Cloud Run (dashboard) | scale-to-zero, ~10 wake-ups/day, ~5 min active | ~$0–1 |
| Cloud Run Job (pipeline) | 1 run/day × ~10 min × 2 vCPU / 2 GiB | ~$1–2 |
| GCS storage | ~10 MB | <$0.01 |
| GCS egress | minimal (private to Cloud Run) | <$0.10 |
| Cloud Scheduler | 1 job × 30 free/month | $0 |
| Secret Manager | 1 secret, low access | $0–0.06 |
| Artifact Registry | ~500 MB | ~$0.05 |
| IAP | <50 users | $0 |
| **GCP subtotal** | | **~$1–4 / month** |
| **Anthropic API** | ~5–10 new offers/day × $0.05 | **~$5–15 / month** |
| **Total** | | **~$6–19 / month** |

Northeastern $300 GCP credits cover the GCP portion for ~5 years at this rate. Anthropic API is independent.

---

## Verification End-to-End

After full deploy, run these checks:

```bash
# 1. Dashboard loads with IAP
open "$(terraform output -raw dashboard_url)"
# Expected: Google sign-in → dashboard with all 129 offers

# 2. Pipeline can run on demand
gcloud run jobs execute applyiq-pipeline --region=us-east1 --wait
# Expected: exit code 0, logs show scan + evaluate + build complete

# 3. Bucket has fresh artifacts
gsutil ls gs://applyiq-data-<proj>/reports/ | wc -l
# Expected: ≥130 files (existing + any new)

# 4. Scheduler is armed
gcloud scheduler jobs describe applyiq-pipeline-daily --location=us-east1 --format='value(state)'
# Expected: ENABLED

# 5. New IAP member can access
# Append email to iap_allowlist, terraform apply, share URL with that user → they sign in successfully
```

---

## Rollback / Cleanup

- **Disable scheduler temporarily:** `gcloud scheduler jobs pause applyiq-pipeline-daily --location=us-east1`
- **Pause dashboard:** set `min_instance_count=0, max_instance_count=0` and `terraform apply` (or simply remove IAP allowlist to deny everyone)
- **Full teardown:** `cd terraform/main && terraform destroy` removes all Cloud Run, GCS, IAP, Scheduler, Secret Manager, Artifact Registry resources. Bootstrap bucket persists (small cost) until separately destroyed.
- **Data preservation:** Before destroy, `gsutil -m rsync -r gs://applyiq-data-<proj>/ ./backups/` preserves all reports.

---

## Open Items / Manual Steps Required

These can't be fully automated by Terraform and need a one-time human step:

1. **OAuth Consent Screen for IAP brand:** Cloud Console → APIs & Services → OAuth consent screen → External, fill in support email, save. Required ONCE before IAP works.
2. **GitHub Workload Identity Federation:** Terraform creates the WIF pool, but you must paste the `wif_provider` and `sa_email` outputs into your GitHub repo secrets (Settings → Secrets → Actions).
3. **Anthropic API key procurement:** Get key from https://console.anthropic.com → set spend limit ($25 recommended cap) → paste into `terraform.tfvars` (`anthropic_api_key`). Never commit `terraform.tfvars`.
4. **First scan seed:** If the bucket starts empty, the first pipeline run might process 100+ offers in one shot. The `null_resource.seed_data` step avoids this by uploading existing local artifacts up front.

---

## Critical Files to Modify (summary)

| File | Type | Change |
|---|---|---|
| `dashboard-web/next.config.js` | modify | Add `output: 'standalone'` |
| `dashboard-web/lib/data.ts` | modify | Honor `DATA_ROOT` env var |
| `scripts/evaluate-new.mjs` | new | Anthropic SDK eval worker (replaces `batch-runner.sh` for cloud) |
| `scripts/pipeline-entrypoint.sh` | new | Container entrypoint: scan → eval → build |
| `docker/dashboard.Dockerfile` | new | Next.js standalone container |
| `docker/pipeline.Dockerfile` | new | Node + Playwright + Anthropic SDK |
| `terraform/bootstrap/*` | new | One-time TF state bucket setup |
| `terraform/main/*` | new | Full infra (~13 .tf files per inventory) |
| `.github/workflows/deploy.yml` | new | Build + push + deploy on push to main |
| `.gitignore` | modify | Add `terraform/**/.terraform/`, `terraform/**/*.tfstate*`, `terraform/**/terraform.tfvars` |

---

## Reused Existing Code

- `scan.mjs` — runs unchanged in container
- `build-dashboard-data.mjs` — runs unchanged
- `batch/batch-prompt.md` — read by `evaluate-new.mjs` as the system prompt template
- `dashboard-web/*` — runs unchanged except for the two small modifications above
- `cv.md`, `modes/_profile.md`, `article-digest.md`, `portals.yml`, `config/profile.yml` — all read inside the container from the gcsfuse mount; baked into the bucket on first apply

No need to rewrite the dashboard or core pipeline logic — only the eval worker (because of the `claude` CLI gap) and a single env-var aware path resolution.
