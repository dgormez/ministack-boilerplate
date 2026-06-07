variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  default     = "us-central1"
  description = "GCP region for all resources"
}

variable "service_name" {
  type    = string
  default = "ministack-api"
}

variable "image" {
  type        = string
  description = "Full Artifact Registry image URI, e.g. us-central1-docker.pkg.dev/PROJECT/ministack/api:latest"
}

variable "db_connection_string" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "jwt_issuer" {
  type    = string
  default = "MiniStack"
}

variable "jwt_audience" {
  type    = string
  default = "MiniStackApp"
}
