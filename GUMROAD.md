# Gumroad Product Listing — MiniStack

---

## Headline

**Ship a React Native app with a real .NET backend — today.**

---

## Subheadline

MiniStack is a production-ready monorepo starter that pairs Expo SDK 54 with an ASP.NET Core 10 Minimal API — JWT auth, offline sync, and CI/CD wired up out of the box. Built for developers who want a typed, scalable backend without touching Firebase or Supabase SDKs.

---

## What's included

**Mobile (Expo SDK 54)**
- Expo Router file-based navigation (typed routes)
- NativeWind v4 (Tailwind CSS for React Native)
- Zustand global state
- expo-sqlite local persistence with incremental background sync
- JWT auth with silent token refresh (access + refresh token pair)
- Sentry crash reporting (configured, optional)
- Full TypeScript strict mode

**Backend (ASP.NET Core 10)**
- Minimal API — no controllers, no boilerplate
- EF Core + Supabase PostgreSQL
- Auth endpoints: register, login, refresh, logout, delete account
- CRUD endpoints (Notes demo, swap for your domain)
- Scalar API UI with Bearer auth pre-configured
- Health check endpoint
- Auto-migration on startup in Development

**Infrastructure**
- GitHub Actions: Azure App Service deploy on push
- GitHub Actions: EAS production build on push
- `scripts/check-setup.sh` — verifies your local toolchain before first run

**Demo app**
- Working Notes app that proves the full stack end-to-end (create, edit, delete, offline read, sync on reconnect)

---

## Who it's for

- **Indie developers** who know React Native but want a proper backend without learning a new cloud platform — if you've used C# or .NET before, you're home.
- **Freelancers** building client MVPs who need auth, a database, and a deployable API on day one, not day five.
- **Side-project builders** who are tired of Firebase pricing surprises and want a stack they fully own and can host for ~$0/month on Azure free tier.

---

## What you'll need

- .NET 10 SDK
- Node 20+ and npm
- A free [Supabase](https://supabase.com) account (PostgreSQL database)
- A free [Azure](https://portal.azure.com) App Service (F1 tier)
- [EAS CLI](https://docs.expo.dev/eas/) for builds (free Expo account)
- Sentry account — optional, already wired up

---

## What makes this different

Most React Native starters on Gumroad and Lemon Squeezy pair Expo with a JavaScript backend (Express, Hapi) or go fully serverless (Firebase, Supabase client SDK). MiniStack gives you a **real, statically-typed HTTP API in C#** that you own, version, and deploy like any production service.

That means:
- No vendor lock-in to a BaaS SDK — swap Supabase for any PostgreSQL database by changing one connection string
- EF Core migrations — your schema is code, not a dashboard click
- Auth lives in your API — tokens are signed with your secret, not issued by a third-party service
- .NET 10 Minimal API is fast, small, and well-documented — not a niche framework

If your background is .NET, this is the Expo starter you've been waiting for. If you're JavaScript-first and want to learn .NET, the codebase is deliberately minimal (~600 lines of C# total).

---

## Suggested price

**$29 USD**

Comparable starters on Gumroad:
- Expo + Supabase starters: $15–$39
- Expo + Express starters: $19–$49
- Full-stack Next.js starters: $29–$79

$29 sits at the low end for a full-stack starter that includes CI/CD, auth, offline sync, and a working demo app. You could go $39 if you add a short demo video. Avoid going below $19 — it signals low quality and attracts more support requests relative to revenue.

---

## Suggested Gumroad tags

`react-native`, `expo`, `boilerplate`, `dotnet`, `asp.net`, `mobile`, `starter`, `typescript`, `jwt-auth`, `azure`, `supabase`, `indie-hacker`, `template`, `full-stack`
