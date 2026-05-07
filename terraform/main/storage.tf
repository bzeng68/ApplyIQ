# GCS bucket for storing evaluation data
resource "google_storage_bucket" "data" {
  name          = "applyiq-data-${var.project_id}"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true
  versioning {
    enabled = true
  }

  # Delete non-current versions after 90 days to save storage
  lifecycle_rule {
    condition {
      num_newer_versions = 2
      days_since_noncurrent_time = 90
    }
    action {
      type = "Delete"
    }
  }
}
