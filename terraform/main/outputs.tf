output "project_id" {
  value       = var.project_id
  description = "GCP project ID"
}

output "region" {
  value       = var.region
  description = "GCP region"
}

output "data_bucket" {
  value       = google_storage_bucket.data.name
  description = "GCS bucket for storing evaluation data"
}

output "dashboard_service_name" {
  value       = google_cloud_run_v2_service.dashboard.name
  description = "Cloud Run service name for the dashboard"
}

output "pipeline_job_name" {
  value       = google_cloud_run_v2_job.pipeline.name
  description = "Cloud Run job name for the pipeline"
}

output "scheduler_job_name" {
  value       = google_cloud_scheduler_job.pipeline_daily.name
  description = "Cloud Scheduler job name"
}

output "wif_provider" {
  value       = google_iam_workload_identity_pool_provider.github.name
  description = "Full resource name of the WIF provider — paste as GCP_WIF_PROVIDER GitHub secret"
}

output "deploy_sa_email" {
  value       = google_service_account.deploy_sa.email
  description = "Deploy service account email — paste as GCP_SA_EMAIL GitHub secret"
}

output "dashboard_url" {
  value       = google_cloud_run_v2_service.dashboard.uri
  description = "Cloud Run dashboard URL"
}

output "instructions" {
  value = <<-EOT
    ✅ Infrastructure deployed successfully!

    📊 NEXT STEPS:

    1. **Configure OAuth Consent Screen** (manual):
       - Go to: https://console.cloud.google.com/apis/credentials/consent?project=${var.project_id}
       - Click "EDIT APP"
       - Fill in App name, user support email, and developer contact
       - Add required scopes: openid, email, profile
       - Save and return to this console

    2. **Build and push Docker images**:
       - Install Docker if not already installed
       - Run: cd /path/to/ApplyIQ && bash build-and-deploy.sh
       (Or manually: docker build -f docker/dashboard.Dockerfile -t ${var.region}-docker.pkg.dev/${var.project_id}/applyiq/dashboard:latest . && gcloud auth configure-docker && docker push ...)

    3. **Enable Cloud IAP** (one-time):
       - Go to: https://console.cloud.google.com/security/iap?project=${var.project_id}
       - Select the Cloud Run service "applyiq-dashboard"
       - Click "Add Member" and add users from the allowlist

    4. **Test the pipeline**:
       - Manual run: gcloud run jobs execute applyiq-pipeline --region=${var.region} --wait
       - Or wait for the scheduled time: ${var.schedule_cron} (${var.schedule_timezone})

    📍 DASHBOARD URL: ${google_cloud_run_v2_service.dashboard.uri}

    🔐 ARCHITECTURE:
       Cloud Scheduler (cron) → Cloud Run Job (scan+eval) → GCS bucket ← Cloud Run Service (dashboard)
       IAP: configure OAuth consent screen then re-run terraform apply

    💾 DATA BUCKET: gs://${google_storage_bucket.data.name}

    🔑 Anthropic API key stored in Secret Manager
       gcloud secrets versions access latest --secret=anthropic-api-key --project=${var.project_id}

    📝 SERVICE ACCOUNTS:
       Pipeline:  ${google_service_account.pipeline_sa.email}
       Dashboard: ${google_service_account.dashboard_sa.email}
       Scheduler: ${google_service_account.scheduler_sa.email}

    ⏭  NEXT:
       1. Build images: see docker/dashboard.Dockerfile + docker/pipeline.Dockerfile
       2. Configure OAuth consent: https://console.cloud.google.com/apis/credentials/consent?project=${var.project_id}
       3. Uncomment IAP resources in terraform/main/iap.tf and re-apply
       4. Set up GitHub Actions: .github/workflows/deploy.yml
  EOT
  description = "Deployment instructions and information"
}
