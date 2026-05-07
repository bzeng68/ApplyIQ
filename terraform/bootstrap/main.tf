terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_id" {
  type = string
  description = "GCP project ID"
}

variable "org_id" {
  type = string
  description = "GCP organization ID"
}

provider "google" {
  project = var.project_id
  region  = "us-east1"
}

# Create the GCS bucket for Terraform state
resource "google_storage_bucket" "terraform_state" {
  name          = "applyiq-terraform-state-${var.project_id}"
  location      = "US"
  force_destroy = false

  uniform_bucket_level_access = true
  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 5
    }
    action {
      type = "Delete"
    }
  }
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "storage.googleapis.com",
    "cloudscheduler.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "iap.googleapis.com",
    "compute.googleapis.com",
  ])

  service            = each.value
  disable_on_destroy = false
}

output "terraform_state_bucket" {
  value       = google_storage_bucket.terraform_state.name
  description = "Name of the GCS bucket for Terraform state"
}

output "project_id" {
  value       = var.project_id
  description = "GCP project ID"
}
