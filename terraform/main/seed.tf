# Seed local data into the GCS bucket on first apply
resource "null_resource" "seed_data" {
  provisioner "local-exec" {
    command = <<-EOT
      set -e
      BUCKET="gs://${google_storage_bucket.data.name}"
      
      # Sync reports directory
      if [ -d "${path.module}/../../reports" ]; then
        echo "Syncing reports to GCS..."
        gsutil -m rsync -r -d "${path.module}/../../reports" "$BUCKET/reports" || true
      fi
      
      # Sync JDs
      if [ -d "${path.module}/../../data/jds" ]; then
        echo "Syncing JDs to GCS..."
        gsutil -m rsync -r "${path.module}/../../data/jds" "$BUCKET/data/jds" || true
      fi
      
      # Sync batch state files
      if [ -f "${path.module}/../../batch/batch-state.tsv" ]; then
        echo "Syncing batch state..."
        gsutil cp "${path.module}/../../batch/batch-state.tsv" "$BUCKET/batch/" || true
      fi
      if [ -f "${path.module}/../../batch/batch-input.tsv" ]; then
        gsutil cp "${path.module}/../../batch/batch-input.tsv" "$BUCKET/batch/" || true
      fi
      
      # Sync dashboard data
      if [ -f "${path.module}/../../data/dashboard-offers.json" ]; then
        echo "Syncing dashboard data..."
        gsutil cp "${path.module}/../../data/dashboard-offers.json" "$BUCKET/data/" || true
      fi
      if [ -f "${path.module}/../../data/scan-history.tsv" ]; then
        gsutil cp "${path.module}/../../data/scan-history.tsv" "$BUCKET/data/" || true
      fi
      
      echo "Data seeding complete"
    EOT
  }

  depends_on = [google_storage_bucket.data]

  triggers = {
    bucket_name = google_storage_bucket.data.name
  }
}
