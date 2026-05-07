# Artifact Registry repository for Docker images
resource "google_artifact_registry_repository" "applyiq" {
  location      = var.region
  repository_id = "applyiq"
  description   = "Docker repository for ApplyIQ dashboard and pipeline images"
  format        = "DOCKER"
}
