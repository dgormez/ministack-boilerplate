# Setup Checklist

Work through this top-to-bottom before running `dotnet run` or `expo start`. Every `YOUR_*` placeholder must be replaced.

---

## 1. Bundle ID / package name

Pick your reverse-domain app ID (e.g. `com.acme.myapp`) and set it in three places:

- [ ] `mobile/app.config.js` → `ios.bundleIdentifier`
- [ ] `mobile/app.config.js` → `android.package`
- [ ] `backend/MiniStack.Api/appsettings.json` → `Apple.BundleId`

Also update `App.Scheme` in `appsettings.json` to a short URL-safe name (e.g. `myapp`). This is used for deep-link callbacks.

---

## 2. Supabase database

1. Create a project at [supabase.com](https://supabase.com) (free tier works)
2. Go to **Project Settings → Database → Connection string** → switch to **URI** mode
3. Copy the URI, replace `[YOUR-PASSWORD]` with your DB password, and append `?sslmode=require`

- [ ] `backend/MiniStack.Api/appsettings.json` → `ConnectionStrings.DefaultConnection`

---

## 3. JWT secret

Generate a secret:

```bash
openssl rand -base64 32
```

- [ ] `backend/MiniStack.Api/appsettings.json` → `Jwt.Secret`

---

## 4. Mobile environment

```bash
cd mobile
cp .env.example .env
```

Find your LAN IP (the simulator/device can't reach `localhost`):

```bash
# macOS
ipconfig getifaddr en0
```

- [ ] `mobile/.env` → `EXPO_PUBLIC_API_BASE_URL=http://<your-ip>:5001`

---

## 5. Google Sign In

### Why three clients?

Each OAuth client produces an ID token whose `aud` (audience) claim equals the client ID that initiated the flow. The backend validates incoming tokens against `Google.AllowedClientIds`, so it needs to know all three:

| Client | Purpose |
|---|---|
| **iOS** | Identifies your app on iOS — `aud` in iOS tokens |
| **Android** | Identifies your app on Android — `aud` in Android tokens |
| **Web** | Used by Expo Go (can't use native clients) and as the fallback client |

**iOS-only for now?** You can skip the Android client and remove it from `AllowedClientIds`. Add it back when you're ready to ship Android.

> Note: the Android client requires your signing key's SHA-1 fingerprint, which differs between debug and release. You'll typically end up with two Android clients (one per build type).

### Create OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Create the clients you need:

   | Type | Required field |
   |---|---|
   | **iOS** | Bundle ID matching `ios.bundleIdentifier` |
   | **Android** | Package name + SHA-1 from `cd android && ./gradlew signingReport` |
   | **Web** | No extra fields |

### Wire them up

- [ ] `mobile/.env` → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- [ ] `backend/MiniStack.Api/appsettings.json` → `Google.AllowedClientIds` (list every client ID you created)

### Rebuild native

```bash
cd mobile && npx expo prebuild --clean --platform ios && npx expo run:ios
```

> Google Sign In uses `expo-auth-session` (web-based OAuth flow) — no native Google SDK needed.

---

## 6. Apple Sign In

> Requires an Apple Developer account ($99/yr). Does **not** work in Expo Go.

1. [developer.apple.com](https://developer.apple.com) → **Identifiers → +** → App IDs → App
2. Set Bundle ID to match `ios.bundleIdentifier`, enable **Sign In with Apple**, register
3. `appsettings.json` → `Apple.BundleId` — must match exactly (the backend validates the `aud` claim)

```bash
cd mobile && npx expo prebuild --clean --platform ios && npx expo run:ios
```

**Testing on simulator:** sign into an Apple ID first via **Simulator → Settings → Sign in to iPhone**.

---

## 7. Password reset (SMTP)

In development, the reset link is printed to the console — no SMTP needed. For production, add credentials to your Cloud Run environment variables (or `appsettings.json` locally):

```
Email__SmtpHost=smtp.sendgrid.net
Email__SmtpPort=587
Email__FromAddress=noreply@yourapp.com
Email__Username=apikey
Email__Password=YOUR_SENDGRID_API_KEY
```

Works with SendGrid, Mailgun, AWS SES, or any SMTP provider.

---

## 8. Sentry (optional)

1. Create a React Native project at [sentry.io](https://sentry.io)
2. Copy the DSN from **Project → Settings → Client Keys**

- [ ] `mobile/.env` → `EXPO_PUBLIC_SENTRY_DSN=https://...`
- [ ] `mobile/app.config.js` → `plugins[@sentry/react-native/expo].organization` and `.project`

---

## 9. EAS Build

```bash
cd mobile
eas login
eas init    # links your Expo account and writes projectId to app.config.js
```

- [ ] Verify `extra.eas.projectId` and `updates.url` are updated in `app.config.js`
- [ ] Add `EXPO_TOKEN` to GitHub → Settings → Secrets → Actions (for the EAS CI workflow)

---

## 10. GCP Deployment

One-time setup — run these in Cloud Shell or locally with `gcloud` installed. Replace `PROJECT_ID`, `PROJECT_NUMBER`, `REGION`, and `GITHUB_ORG/REPO_NAME`.

### Enable APIs

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com iamcredentials.googleapis.com
```

### Create service account

```bash
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

### Set up Workload Identity Federation (no JSON key needed)

```bash
gcloud iam workload-identity-pools create "github" --location="global" \
  --display-name="GitHub Actions Pool"

gcloud iam workload-identity-pools providers create-oidc "github-actions" \
  --location="global" \
  --workload-identity-pool="github" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository"

gcloud iam service-accounts add-iam-policy-binding \
  github-actions@PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/GITHUB_ORG/REPO_NAME"
```

### Create Artifact Registry repository

```bash
gcloud artifacts repositories create ministack \
  --repository-format=docker \
  --location=REGION
```

### Add GitHub secrets

Go to **GitHub → Settings → Secrets → Actions** and add:

| Secret | Value |
|--------|-------|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_REGION` | Deployment region (e.g. `us-central1`) |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-actions` |
| `GCP_SERVICE_ACCOUNT` | `github-actions@PROJECT_ID.iam.gserviceaccount.com` |
| `DB_CONNECTION_STRING` | Full Supabase connection string |
| `JWT_SECRET` | Your JWT secret (min 32 chars) |

Push to `main` — the `deploy-gcp.yml` workflow builds a Docker image and deploys to Cloud Run automatically.

### Production migrations

EF Core never auto-migrates in production. After every schema change:

```bash
dotnet ef migrations script <FromMigration> <ToMigration> \
  --project backend/MiniStack.Api \
  --output migration.sql
```

Paste `migration.sql` into **Supabase Dashboard → SQL Editor** and run it.

---

## 11. Azure Deployment (alternative to GCP)

Use this instead of section 10 if you prefer Azure. The workflow builds a Docker image, pushes it to Azure Container Registry, and deploys to Azure Container Apps — the Azure equivalent of Cloud Run.

### One-time setup

**1. Create a resource group**
```bash
az group create --name ministack-rg --location westeurope
```

**2. Create Azure Container Registry**
```bash
az acr create --name ministackregistry --resource-group ministack-rg --sku Basic
# Note the loginServer value (e.g. ministackregistry.azurecr.io)
```

**3. Create a Container Apps environment**
```bash
az containerapp env create \
  --name ministack-env \
  --resource-group ministack-rg \
  --location westeurope
```

**4. Create the Container App**
```bash
az containerapp create \
  --name ministack-api \
  --resource-group ministack-rg \
  --environment ministack-env \
  --image mcr.microsoft.com/dotnet/aspnet:10.0 \
  --target-port 8080 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 3
```

**5. Create a service principal for GitHub Actions**
```bash
az ad sp create-for-rbac --name "ministack-github-actions" \
  --role Contributor \
  --scopes /subscriptions/SUBSCRIPTION_ID/resourceGroups/ministack-rg

# Note the output: appId (client ID), password (client secret), tenant
```

**6. Grant the service principal access to ACR**
```bash
az role assignment create \
  --assignee <appId from above> \
  --role AcrPush \
  --scope $(az acr show --name ministackregistry --query id -o tsv)
```

**7. Set up Federated Identity (no client secret needed)**

In [portal.azure.com](https://portal.azure.com) → **App registrations → your app → Certificates & secrets → Federated credentials → Add**:
- Scenario: GitHub Actions
- Organisation: your GitHub org/username
- Repository: your repo name
- Entity: Branch → `master`

Then delete the client secret from step 5 — you no longer need it.

### GitHub secrets

Go to **GitHub → Settings → Secrets → Actions** and add:

| Secret | Value |
|--------|-------|
| `AZURE_CLIENT_ID` | `appId` from the service principal |
| `AZURE_TENANT_ID` | `tenant` from the service principal |
| `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID |
| `AZURE_RESOURCE_GROUP` | `ministack-rg` |
| `AZURE_CONTAINER_APP_NAME` | `ministack-api` |
| `ACR_LOGIN_SERVER` | `ministackregistry.azurecr.io` |
| `DB_CONNECTION_STRING` | Full Supabase connection string |
| `JWT_SECRET` | Your JWT secret (min 32 chars) |

Push to `master` — the `deploy-backend.yml` workflow builds the Docker image and deploys to Container Apps automatically.

### Production migrations

Same as GCP — EF Core never auto-migrates in production:

```bash
dotnet ef migrations script <FromMigration> <ToMigration> \
  --project backend/MiniStack.Api \
  --output migration.sql
```

Paste `migration.sql` into **Supabase Dashboard → SQL Editor** and run it.

---

## 12. README

- [ ] Replace `YOUR_USERNAME` in the clone URL with your GitHub username
