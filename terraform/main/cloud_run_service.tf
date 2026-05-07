# Cloud Run service for the Next.js dashboard
resource "google_cloud_run_v2_service" "dashboard" {
  name     = "applyiq-dashboard"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    max_instance_request_concurrency = 80
    timeout                          = "300s"
    service_account                  = google_service_account.dashboard_sa.email

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }

    containers {
      # Placeholder image — replaced by GitHub Actions on first push to main
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      env {
        name  = "DATA_ROOT"
        value = "/mnt/data"
      }

      ports {
        container_port = 8080
      }
    }
  }

  # After initial deploy, GitHub Actions owns image updates — prevent TF drift
  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }

  depends_on = [google_project_service.cloudrun]
}

# IAM binding to allow unauthenticated access (gated by Cloud IAP separately)
resource "google_cloud_run_v2_service_iam_member" "dashboard_public" {
  project  = var.project_id
  location = google_cloud_run_v2_service.dashboard.location
  name     = google_cloud_run_v2_service.dashboard.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
