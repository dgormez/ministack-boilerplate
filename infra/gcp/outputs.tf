output "service_url" {
  description = "Public URL of the Cloud Run service"
  value       = google_cloud_run_v2_service.api.uri
}

output "artifact_registry_repo" {
  description = "Docker registry prefix to use in image tags"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/ministack"
}
