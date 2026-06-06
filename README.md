# MiniStack — Expo + ASP.NET Core Boilerplate

A production-ready monorepo starter for shipping React Native apps backed by a .NET API. Clone, configure, and ship in a day.

**Stack:** Expo SDK 54 · NativeWind v4 · Zustand · expo-sqlite · ASP.NET Core 10 Minimal API · EF Core · Supabase PostgreSQL · Azure App Service · EAS Build

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-dgormez-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/dgormez)

---

## What's included

- **Mobile** — Expo managed workflow, TypeScript strict mode, Expo Router file-based navigation, NativeWind v4 for styling, Zustand state management, expo-sqlite local persistence with offline support, incremental sync, JWT auth with auto-refresh, Sentry crash reporting
- **Backend** — ASP.NET Core 10 Minimal API, EF Core + Supabase PostgreSQL, JWT auth (register / login / refresh / logout / delete account), CRUD endpoints, Scalar API UI with Bearer auth, health check endpoint
- **CI/CD** — GitHub Actions for Azure backend deploy + EAS production builds
- **Demo app** — a working Notes app that proves end-to-end connectivity

---

## 5-minute quick start

> **Before you start:** work through [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) to fill in every placeholder. Steps below assume that's done.

1. **Clone and install**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ministack.git
   cd ministack/mobile && npm install
   ```

2. **Start the backend**
   ```bash
   cd backend/MiniStack.Api
   dotnet run
   # API + Scalar UI: http://localhost:5001/scalar/v1
   ```

3. **Set your LAN IP in `.env`**
   ```bash
   # macOS
   ipconfig getifaddr en0
   # Edit mobile/.env → EXPO_PUBLIC_API_BASE_URL=http://<your-ip>:5001
   ```

4. **Start the mobile app**
   ```bash
   cd mobile
   npx expo start
   ```

5. **Register an account** in the app — the Notes demo should sync end-to-end.

---

## Prerequisites

- Node 20+ and npm
- .NET 10 SDK
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- A [Supabase](https://supabase.com) project (free tier works)
- An [Azure](https://portal.azure.com) App Service (F1 free tier works)
- A [Sentry](https://sentry.io) project — React Native (optional but recommended)

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/ministack.git
cd ministack/mobile && npm install
```

### 2. Configure the backend

Copy and edit `appsettings.json`:

```bash
cd backend/MiniStack.Api
cp ../../backend/.env.example .env   # reference only — see appsettings.json
```

Edit `appsettings.json` (or set environment variables in Azure):

| Key | Where to find it |
|-----|-----------------|
| `ConnectionStrings:DefaultConnection` | Supabase → Project Settings → Database → Connection string (URI mode, append `?sslmode=require`) |
| `Jwt:Secret` | Run `openssl rand -base64 32` |
| `Jwt:Issuer` / `Jwt:Audience` | Keep defaults or rename to match your app |

Run locally:

```bash
cd backend/MiniStack.Api
dotnet run
# Scalar API UI: http://localhost:5000/scalar/v1
```

EF Core will auto-migrate on first run in Development.

### 3. Configure the mobile app

```bash
cd mobile
cp .env.example .env
```

Edit `.env`:

```
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:5000
EXPO_PUBLIC_SENTRY_DSN=https://...  # optional
```

> **Finding your LAN IP:** `ipconfig` (Windows) or `ifconfig | grep inet` (macOS/Linux). The emulator won't reach `localhost` — use your machine's actual LAN address.

Update `app.json`:

- `ios.bundleIdentifier` and `android.package` → your own reverse-domain identifier
- `extra.eas.projectId` → from `eas init` (run once after installing EAS CLI)
- `plugins[@sentry/react-native/expo]` → your Sentry org/project slugs

Start the app:

```bash
npx expo start
```

### 4. Deploy the backend to Azure

1. Create an Azure App Service (Linux, .NET 10)
2. Add your GitHub secrets:
   - `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` — from a service principal with Contributor access
   - `AZURE_APP_NAME` — your App Service name
3. Push to `main` — the workflow triggers automatically

Set environment variables in Azure → App Service → Configuration → Application settings (same keys as `.env.example`).

Run migrations after first deploy:

```bash
dotnet ef database update --project backend/MiniStack.Api
```

### 5. Configure EAS Build

```bash
cd mobile
eas login
eas init       # links your project, writes projectId to app.json
eas build --platform all --profile preview  # first test build
```

Add `EXPO_TOKEN` to your GitHub repository secrets for the CI workflow.

---

## Project structure

```
ministack/
├── mobile/
│   ├── app/
│   │   ├── _layout.tsx          # root layout — bootstrap + auth guard
│   │   ├── (auth)/              # login & register screens
│   │   ├── (tabs)/              # main tab navigation
│   │   └── note/                # add/edit note modals
│   ├── components/
│   ├── hooks/useSync.ts         # incremental background sync
│   ├── services/
│   │   ├── api.ts               # HTTP client with JWT auto-refresh
│   │   ├── auth.ts              # register / login / logout / session restore
│   │   └── localDb.ts           # SQLite persistence
│   ├── store/useStore.ts        # Zustand global state
│   └── types/index.ts
├── backend/
│   └── MiniStack.Api/
│       ├── Endpoints/           # AuthEndpoints, NoteEndpoints
│       ├── Models/              # User, Note
│       ├── Data/AppDbContext.cs
│       ├── Services/JwtService.cs
│       └── Program.cs
└── .github/workflows/
    ├── deploy-backend.yml
    └── eas-build.yml
```

---

## Adding a new entity (replace Notes with your domain)

**Backend:**
1. Add a model in `Models/`
2. Add a `DbSet<>` in `AppDbContext`
3. Add configuration in `OnModelCreating`
4. Create a new `Endpoints/YourEntityEndpoints.cs` following `NoteEndpoints.cs` as a template
5. Register it in `Program.cs`: `app.MapYourEntityEndpoints();`
6. Run `dotnet ef migrations add AddYourEntity && dotnet ef database update`

**Mobile:**
1. Add the TypeScript interface in `types/index.ts`
2. Add SQLite table in `services/localDb.ts`
3. Add API functions in `services/api.ts`
4. Add state slice in `store/useStore.ts`
5. Add screens under `app/`

---

## Auth flow

```
App opens
  └─ tryRestoreSession()
       ├─ Online: POST /api/auth/refresh → fresh access token → show tabs
       ├─ Offline: use cached userId/email → show tabs (sync fails silently)
       └─ No refresh token / token invalid → redirect to /(auth)/login

Login / Register
  └─ POST /api/auth/login|register
       └─ Receive { accessToken, refreshToken, user }
            ├─ accessToken → Zustand (in memory)
            ├─ refreshToken → expo-secure-store
            └─ userId, email → SQLite config table

API request
  └─ Authorization: Bearer <accessToken>
       └─ On 401 → POST /api/auth/refresh → retry once → or SESSION_EXPIRED
```

---

## Environment variable reference

### Backend (`appsettings.json` / Azure App Settings)

| Variable | Description |
|----------|-------------|
| `ConnectionStrings:DefaultConnection` | Supabase PostgreSQL connection string |
| `Jwt:Secret` | Random 32+ char secret for signing tokens |
| `Jwt:Issuer` | Token issuer claim (default: `MiniStack`) |
| `Jwt:Audience` | Token audience claim (default: `MiniStackApp`) |
| `Jwt:AccessTokenExpiryMinutes` | Access token lifetime (default: `15`) |
| `Jwt:RefreshTokenExpiryDays` | Refresh token lifetime (default: `30`) |

### Mobile (`.env`)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_BASE_URL` | Base URL of your backend |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN (optional) |

---

## License

See [LICENSE](./LICENSE). Each purchase grants a single-app commercial license.
