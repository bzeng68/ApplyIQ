variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  default     = "us-east1"
  description = "GCP region for all resources"
}

variable "anthropic_api_key" {
  type        = string
  sensitive   = true
  description = "Anthropic API key for Claude evaluations"
}

variable "iap_allowlist" {
  type        = list(string)
  default     = ["zeng.br@northeastern.edu"]
  description = "Email addresses allowed to access the dashboard via Cloud IAP"
}

variable "schedule_cron" {
  type        = string
  default     = "30 16 * * *"
  description = "Cron expression for daily pipeline job (4:30pm EST — 30 min after local pipeline at 4pm)"
}

variable "schedule_timezone" {
  type        = string
  default     = "America/New_York"
  description = "Timezone for Cloud Scheduler"
}

variable "github_repo" {
  type        = string
  default     = "bzeng68/ApplyIQ"
  description = "GitHub repository for CI/CD"
}
