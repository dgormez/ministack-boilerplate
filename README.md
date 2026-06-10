# MiniStack — Expo + ASP.NET Core Boilerplate

A production-ready monorepo starter for shipping React Native apps backed by a .NET API. Skip the boilerplate, own the stack.

**Stack:** Expo SDK 54 · NativeWind v4 · Zustand · expo-sqlite · ASP.NET Core 10 · EF Core · Supabase PostgreSQL · GCP Cloud Run · EAS Build

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-dgormez-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/dgormez)

---

## Why MiniStack?

Most React Native starters use a JavaScript backend. MiniStack is built for .NET developers who want a mobile app without switching ecosystems.

| What's included | Notes |
|---|---|
| Email / Google / Apple sign-in | All three wired up end-to-end |
| JWT auth with silent refresh | Access token in memory, refresh token in SecureStore |
| Password reset via email | SMTP — works with SendGrid, Mailgun, etc. |
| Local SQLite + API sync | Offline-first with incremental background sync |
| Push notifications | expo-notifications + Expo push service |
| Notes demo app | Proves the full stack works before you touch anything |
| Scalar API UI | Interactive docs at `/scalar/v1` with Bearer auth |
| GCP Cloud Run deploy | Docker-based, GitHub Actions workflow included |
| EAS Build CI | App Store + Play Store builds on push |
| Sentry crash reporting | Pre-wired, just add your DSN |

---

## Prerequisites

- Node 20+ and npm
- .NET 10 SDK
- Expo CLI — `npm install -g expo-cli`
- EAS CLI — `npm install -g eas-cli`
- [Supabase](https://supabase.com) project (free tier works)
- [GCP](https://console.cloud.google.com) project (for production deploy)
- [Sentry](https://sentry.io) project — React Native (optional)

---

## Quick start

> **Before you start:** work through [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) to fill in every placeholder. The steps below assume that's done.

### 1. Clone, rename, and install

```bash
git clone https://github.com/YOUR_USERNAME/ministack.git
cd ministack
bash init.sh          # renames everything to your app in one step
cd mobile && npm install
```

### 2. Start the backend

```bash
cd backend/MiniStack.Api
dotnet run
# API + Scalar UI → http://localhost:5001/scalar/v1
```

EF Core auto-migrates on first run in Development mode.

### 3. Point the mobile app at your machine

```bash
# macOS — find your LAN IP
ipconfig getifaddr en0

# Edit mobile/.env
EXPO_PUBLIC_API_BASE_URL=http://<your-ip>:5001
```

> The simulator/device can't reach `localhost` — you need your machine's actual LAN IP.

### 4. Start the mobile app

```bash
cd mobile
npx expo start
```

Press `i` to open in the iOS simulator, `a` for Android. Register an account — the Notes demo should sync end-to-end.

---

## Deploy to production

### Backend — GCP Cloud Run

See [SETUP_CHECKLIST.md → GCP Deployment](./SETUP_CHECKLIST.md#gcp-deployment) for the one-time GCP setup (service account, Workload Identity, Artifact Registry).

Once the GitHub secrets are set, push to `main` and the `deploy-gcp.yml` workflow handles the rest.

**Important:** EF Core never auto-migrates in production. After every schema change, generate the SQL and run it in Supabase:

```bash
dotnet ef migrations script <FromMigration> <ToMigration> \
  --project backend/MiniStack.Api \
  --output migration.sql
# Then paste migration.sql into Supabase Dashboard → SQL Editor
```

### Mobile — EAS Build

```bash
cd mobile
eas login
eas init          # links project, writes projectId to app.json
eas build --platform all --profile preview   # first test build
```

Add `EXPO_TOKEN` to your GitHub repository secrets to enable the EAS CI workflow.

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
│   │   └── localDb.ts           # SQLite persistence (web: no-op shim)
│   ├── store/useStore.ts        # Zustand global state
│   └── types/index.ts
├── backend/
│   └── MiniStack.Api/
│       ├── Endpoints/           # AuthEndpoints.cs, NoteEndpoints.cs
│       ├── Models/              # User.cs, Note.cs
│       ├── Data/AppDbContext.cs
│       ├── Services/JwtService.cs
│       └── Program.cs
├── infra/gcp/                   # Terraform for GCP infrastructure (optional)
└── .github/workflows/
    ├── deploy-gcp.yml           # Backend → GCP Cloud Run on push to main
    ├── deploy-backend.yml       # Backend → Azure App Service (alternative)
    └── eas-build.yml            # Mobile → EAS Build
```

---

## Replacing Notes with your own domain

**Backend:**
1. Add a model in `Models/`
2. Add a `DbSet<>` in `AppDbContext` and configure it in `OnModelCreating`
3. Add `Endpoints/YourEntityEndpoints.cs` — use `NoteEndpoints.cs` as the template
4. Register it in `Program.cs`: `app.MapYourEntityEndpoints();`
5. `dotnet ef migrations add AddYourEntity` — then run the generated SQL in Supabase

**Mobile:**
1. Add the TypeScript type in `types/index.ts`
2. Add the SQLite table in `services/localDb.ts`
3. Add API functions in `services/api.ts`
4. Add state to `store/useStore.ts`
5. Add screens under `app/`

---

## Auth flow

```
App opens
  └─ tryRestoreSession()
       ├─ Online  → POST /api/auth/refresh → fresh access token → tabs
       ├─ Offline → cached userId/email → tabs (sync fails silently)
       └─ No token / expired → /(auth)/login

Login / Register
  └─ POST /api/auth/login|register
       └─ { accessToken, refreshToken, user }
            ├─ accessToken   → Zustand (in-memory only)
            ├─ refreshToken  → expo-secure-store
            └─ userId, email → SQLite config table

API request
  └─ Authorization: Bearer <accessToken>
       └─ 401 → POST /api/auth/refresh → retry once → or SESSION_EXPIRED
```

---

## Environment variable reference

### Backend (`appsettings.json` / Cloud Run env vars)

| Key | Description |
|-----|-------------|
| `ConnectionStrings:DefaultConnection` | Supabase PostgreSQL connection string |
| `Jwt:Secret` | Random 32+ char secret (`openssl rand -base64 32`) |
| `Jwt:Issuer` | Token issuer claim (default: `MiniStack`) |
| `Jwt:Audience` | Token audience claim (default: `MiniStackApp`) |
| `Jwt:AccessTokenExpiryMinutes` | Default: `15` |
| `Jwt:RefreshTokenExpiryDays` | Default: `30` |
| `Apple:BundleId` | Your iOS bundle identifier |
| `Google:AllowedClientIds` | Array of all three Google OAuth client IDs |
| `Email:SmtpHost` / `Email:Password` | SMTP credentials for password reset |

### Mobile (`mobile/.env`)

| Key | Description |
|-----|-------------|
| `EXPO_PUBLIC_API_BASE_URL` | Backend URL (LAN IP for dev, Cloud Run URL for prod) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth iOS client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android client ID |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth Web client ID |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN (optional) |

---

## License

See [LICENSE](./LICENSE). Each purchase grants a single-app commercial license.
