# GCP Cloud Run — One-time Setup Guide

Follow these steps once per new GCP project. After this, every deploy is automatic via GitHub Actions.

## Prerequisites

- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed
- A GCP project with billing enabled
- Terraform installed: `brew tap hashicorp/tap && brew install hashicorp/tap/terraform`

---

## Values you need before starting

| Placeholder | Where to find it |
|---|---|
| `YOUR_PROJECT_ID` | GCP console top bar (e.g. `my-project-123`) |
| `YOUR_PROJECT_NUMBER` | Output of the `gcloud projects describe` command below |
| `YOUR_REGION` | Your chosen region (e.g. `us-central1`) |
| `YOUR_GITHUB_USERNAME` | Your GitHub username |
| `YOUR_REPO_NAME` | Your GitHub repo name |

---

## Phase 1 — GCP IAM setup

**Log in and set your project:**
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

**Get your project number** (copy the output — needed later):
```bash
gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)"
```

**Enable required APIs:**
```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com iamcredentials.googleapis.com
```

**Create a service account for GitHub Actions:**
```bash
gcloud iam service-accounts create github-actions --display-name="GitHub Actions"
```

**Grant it the roles it needs:**
```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

**Grant actAs on the default Compute service account** (required for Cloud Run deployment):
```bash
gcloud iam service-accounts add-iam-policy-binding \
  YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

**Set up Workload Identity Federation** (keyless auth — no JSON key needed):
```bash
gcloud iam workload-identity-pools create "github" \
  --location="global" \
  --display-name="GitHub Actions Pool"

gcloud iam workload-identity-pools providers create-oidc "github-actions" \
  --location="global" \
  --workload-identity-pool="github" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="attribute.repository == 'YOUR_GITHUB_USERNAME/YOUR_REPO_NAME'"
```

> **Note:** The `--attribute-condition` flag is required by GCP. Without it the command errors. It locks the provider to your specific repo so no other GitHub repo can impersonate your service account.

```bash
gcloud iam service-accounts add-iam-policy-binding \
  github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME"
```

---

## Phase 2 — Terraform

**Authenticate gcloud for Terraform:**
```bash
gcloud auth application-default login
```

**Create `infra/gcp/terraform.tfvars`** (this file is gitignored — never commit it):
```hcl
project_id           = "YOUR_PROJECT_ID"
region               = "YOUR_REGION"
image                = "YOUR_REGION-docker.pkg.dev/YOUR_PROJECT_ID/ministack/api:latest"
db_connection_string = "YOUR_DB_CONNECTION_STRING"
jwt_secret           = "YOUR_JWT_SECRET"
```

Generate a JWT secret with: `openssl rand -base64 32`

**Run Terraform:**
```bash
cd infra/gcp
terraform init
terraform plan
terraform apply
```

> **Note:** The first `terraform apply` will fail on the Cloud Run service because no Docker image exists yet. Fix: temporarily set `image = "us-docker.pkg.dev/cloudrun/container/hello:latest"` in `terraform.tfvars`, run `terraform apply` to create the service with a placeholder, then revert the image value back to your real registry path. GitHub Actions will push the real image and replace the placeholder on its first run.

Copy the outputs after apply — you'll need them for the next step:
```
service_url            = "https://ministack-api-xxxx-uc.a.run.app"
artifact_registry_repo = "YOUR_REGION-docker.pkg.dev/YOUR_PROJECT_ID/ministack"
```

---

## Phase 3 — GitHub secrets

Go to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|---|---|
| `GCP_PROJECT_ID` | `YOUR_PROJECT_ID` |
| `GCP_REGION` | `YOUR_REGION` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-actions` |
| `GCP_SERVICE_ACCOUNT` | `github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com` |
| `DB_CONNECTION_STRING` | your database connection string |
| `JWT_SECRET` | your JWT secret |

---

## Phase 4 — First deploy

Push any change to a file inside `backend/` on the `master` branch. The `Deploy backend to GCP Cloud Run` workflow will trigger automatically and your API will be live at the `service_url` from the Terraform output.

---

## Subsequent deploys

No action needed — every push to `master` that touches `backend/**` triggers an automatic deploy. Terraform is only needed again if the infrastructure itself changes (new env var, different region, etc.).
