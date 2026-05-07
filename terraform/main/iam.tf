# Service account for the pipeline job
resource "google_service_account" "pipeline_sa" {
  account_id   = "applyiq-pipeline"
  display_name = "ApplyIQ Pipeline Service Account"
}

# Service account for the dashboard service
resource "google_service_account" "dashboard_sa" {
  account_id   = "applyiq-dashboard"
  display_name = "ApplyIQ Dashboard Service Account"
}

# Service account for Cloud Scheduler
resource "google_service_account" "scheduler_sa" {
  account_id   = "applyiq-scheduler"
  display_name = "ApplyIQ Scheduler Service Account"
}

# Allow pipeline SA to read/write GCS bucket
resource "google_storage_bucket_iam_member" "pipeline_bucket_admin" {
  bucket = google_storage_bucket.data.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.pipeline_sa.email}"
}

# Allow dashboard SA to read GCS bucket
resource "google_storage_bucket_iam_member" "dashboard_bucket_reader" {
  bucket = google_storage_bucket.data.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.dashboard_sa.email}"
}

# Allow pipeline SA to access Anthropic API key secret
resource "google_secret_manager_secret_iam_member" "pipeline_secret_accessor" {
  secret_id = google_secret_manager_secret.anthropic_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.pipeline_sa.email}"
}

# Allow dashboard SA to trigger and monitor Cloud Run pipeline jobs
resource "google_project_iam_member" "dashboard_run_developer" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.dashboard_sa.email}"
}

# Allow scheduler SA to invoke the pipeline job using the Cloud Run API
resource "google_project_iam_member" "scheduler_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.scheduler_sa.email}"
}

# ── GitHub Actions — Workload Identity Federation ──────────────────────────────

# Service account for GitHub Actions CI/CD
resource "google_service_account" "deploy_sa" {
  account_id   = "applyiq-deploy"
  display_name = "ApplyIQ GitHub Actions Deploy"
}

# Deploy SA: push images to Artifact Registry
resource "google_project_iam_member" "deploy_ar_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.deploy_sa.email}"
}

# Deploy SA: update Cloud Run service and job revisions
resource "google_project_iam_member" "deploy_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.deploy_sa.email}"
}

# Deploy SA: submit Cloud Build jobs (used by gcloud builds submit)
resource "google_project_iam_member" "deploy_cloudbuild_editor" {
  project = var.project_id
  role    = "roles/cloudbuild.builds.editor"
  member  = "serviceAccount:${google_service_account.deploy_sa.email}"
}

# Deploy SA: read GCS bucket so Cloud Build worker can pull build context
resource "google_project_iam_member" "deploy_storage_admin" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.deploy_sa.email}"
}

# Workload Identity Pool — one pool per project is enough
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  description               = "Allows GitHub Actions to authenticate to GCP without static keys"
}

# Workload Identity Provider — maps GitHub OIDC tokens to GCP identities
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub OIDC"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository == \"${var.github_repo}\""
}

# Deploy SA: act as the dashboard and pipeline service accounts during Cloud Run deploy
resource "google_service_account_iam_member" "deploy_actAs_dashboard" {
  service_account_id = google_service_account.dashboard_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deploy_sa.email}"
}

resource "google_service_account_iam_member" "deploy_actAs_pipeline" {
  service_account_id = google_service_account.pipeline_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deploy_sa.email}"
}

# Allow the GitHub repo to impersonate the deploy SA
resource "google_service_account_iam_member" "deploy_wif_binding" {
  service_account_id = google_service_account.deploy_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}
