# Multiple Profiles

**Date:** 2026-05-07

## Why

The single-profile layout puts all data flat in one namespace. Adding a second person (or second job-search persona) would intermix scan histories, evaluation queues, and reports — breaking evaluation quality and dashboard clarity.

## Design

Each profile gets a fully isolated GCS subtree. The pipeline iterates all profiles in a single Cloud Run job. The dashboard shows a profile dropdown that is hidden when only one profile exists.

### Local layout

```
profiles/
  {name}/
    cv.md                    ← gitignored
    portals.yml              ← gitignored
    modes/_profile.md        ← gitignored
    config/profile.yml       ← gitignored
    article-digest.md        ← gitignored, optional
    batch/
      batch-input.tsv        ← gitignored, user-managed eval queue
```

Run `node sync-to-gcs.mjs` (or `node build-dashboard-data.mjs` with GCS_BUCKET set) to push all profiles to GCS before the first cloud pipeline run.

### GCS layout

```
profiles/
  {name}/
    user-config/cv.md
    user-config/portals.yml
    user-config/_profile.md
    user-config/profile.yml
    user-config/article-digest.md   (optional)
    data/dashboard-offers.json
    data/scan-history.tsv
    data/pipeline.md
    data/ui-state.json
    data/jds/
    batch/batch-input.tsv
    batch/batch-state.tsv
    batch/tracker-additions/
    reports/*.md
```

The legacy flat paths (`data/`, `reports/`, `batch/`, `user-config/`) remain in GCS for backward compat but are unused once `profiles/` is populated.

### Pipeline

`scripts/pipeline-entrypoint.sh` loops over every `profiles/*/` directory in the FUSE mount, copies user-config files to `/app/`, sets `DATA_ROOT` to that profile's directory, then runs `scan.mjs → evaluate-new.mjs → build-dashboard-data.mjs`. Each profile runs sequentially; data never crosses between profiles.

### Dashboard

`lib/data.ts` resolves all paths via `profilePaths(profile)` — a helper that constructs paths under `{BASE_ROOT}/profiles/{name}/`. `listProfiles()` lists subdirectories. All API routes accept a `?profile=` query param (or `profile` in the POST body for state mutations). A `ProfileContext` provides `activeProfile` to the whole app; `ProfileSelector` renders a `<select>` only when 2+ profiles exist.

## Files Changed

| File | Change |
|------|--------|
| `.gitignore` | Added `profiles/*/` ignore rules |
| `sync-to-gcs.mjs` | Replaced flat `USER_CONFIG_FILES` with `syncProfiles()` iterating `profiles/` |
| `scripts/pipeline-entrypoint.sh` | Replaced single-profile restore with per-profile loop |
| `dashboard-web/lib/data.ts` | All functions accept `profile: string`; added `listProfiles()` |
| `dashboard-web/app/api/profiles/route.ts` | New — returns `listProfiles()` |
| `dashboard-web/app/api/offers/route.ts` | Added `?profile=` param |
| `dashboard-web/app/api/offers/[id]/done/route.ts` | Added `profile` from body |
| `dashboard-web/app/api/offers/[id]/skip/route.ts` | Added `profile` from body |
| `dashboard-web/app/api/reports/[num]/route.ts` | Added `?profile=` param |
| `dashboard-web/app/api/jds/[id]/route.ts` | Added `?profile=` param |
| `dashboard-web/lib/profile-context.tsx` | New — React context for active profile |
| `dashboard-web/components/ProfileSelector.tsx` | New — dropdown, hidden when ≤1 profile |
| `dashboard-web/components/OffersTable.tsx` | Reads profile from context; passes to all API calls |
| `dashboard-web/components/JDModal.tsx` | Passes `?profile=` to `/api/jds/` |
| `dashboard-web/components/ReportPanel.tsx` | Passes `?profile=` to `/api/reports/` |
| `dashboard-web/app/layout.tsx` | Wraps with `ProfileProvider`; mounts `ProfileSelector` |
| `docs/SETUP.md` | Added "Multiple Profiles" section |
