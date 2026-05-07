# Cloud Run job for the evaluation pipeline
resource "google_cloud_run_v2_job" "pipeline" {
  name     = "applyiq-pipeline"
  location = var.region

  template {
    template {
      timeout         = "3600s"
      service_account = google_service_account.pipeline_sa.email
      max_retries     = 1

      containers {
        # Placeholder image — replaced by GitHub Actions on first push to main
        image = "us-docker.pkg.dev/cloudrun/container/hello"

        env {
          name  = "GCS_BUCKET"
          value = google_storage_bucket.data.name
        }

        env {
          name = "ANTHROPIC_API_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.anthropic_api_key.secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  # After initial deploy, GitHub Actions owns image updates
  lifecycle {
    ignore_changes = [template[0].template[0].containers[0].image]
  }

  depends_on = [
    google_project_service.cloudrun,
    google_secret_manager_secret_version.anthropic_api_key_version,
  ]
}
