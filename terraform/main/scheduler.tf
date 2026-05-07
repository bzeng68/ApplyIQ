# Cloud Scheduler job to trigger the pipeline daily
resource "google_cloud_scheduler_job" "pipeline_daily" {
  name             = "applyiq-pipeline-daily"
  description      = "Daily job to scan and evaluate job offers"
  schedule         = var.schedule_cron
  time_zone        = var.schedule_timezone
  attempt_deadline = "1800s"
  region           = var.region

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/projects/${var.project_id}/locations/${var.region}/jobs/${google_cloud_run_v2_job.pipeline.name}:run"

    oidc_token {
      service_account_email = google_service_account.scheduler_sa.email
    }
  }

  depends_on = [google_project_service.cloudscheduler]
}
