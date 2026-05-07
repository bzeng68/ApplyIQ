# Identity-Aware Proxy — gates dashboard behind Google login
# OAuth consent screen must be configured first (done manually in Cloud Console)

resource "google_iap_brand" "project_brand" {
  support_email     = "bzeng68@gmail.com"
  application_title = "ApplyIQ Dashboard"
  depends_on        = [google_project_service.iap]
}

resource "google_iap_client" "dashboard_client" {
  display_name = "ApplyIQ Dashboard Client"
  brand        = google_iap_brand.project_brand.name
}

resource "google_iap_web_iam_member" "dashboard_access" {
  for_each   = toset(var.iap_allowlist)
  project    = var.project_id
  role       = "roles/iap.httpsResourceAccessor"
  member     = "user:${each.value}"
  depends_on = [google_iap_brand.project_brand, google_iap_client.dashboard_client]
}

output "iap_client_id" {
  value       = google_iap_client.dashboard_client.client_id
  description = "OAuth 2.0 Client ID for IAP"
}
