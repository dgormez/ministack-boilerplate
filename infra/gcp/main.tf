terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_artifact_registry_repository" "api" {
  location      = var.region
  repository_id = "ministack"
  format        = "DOCKER"
}

resource "google_cloud_run_v2_service" "api" {
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = var.image

      ports {
        container_port = 8080
      }

      env {
        name  = "ConnectionStrings__DefaultConnection"
        value = var.db_connection_string
      }
      env {
        name  = "Jwt__Secret"
        value = var.jwt_secret
      }
      env {
        name  = "Jwt__Issuer"
        value = var.jwt_issuer
      }
      env {
        name  = "Jwt__Audience"
        value = var.jwt_audience
      }
      env {
        name  = "Jwt__AccessTokenExpiryMinutes"
        value = "15"
      }
      env {
        name  = "Jwt__RefreshTokenExpiryDays"
        value = "30"
      }
    }
  }

  depends_on = [google_artifact_registry_repository.api]
}

# Allow unauthenticated (public) access — matches current CORS policy
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  project  = google_cloud_run_v2_service.api.project
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
