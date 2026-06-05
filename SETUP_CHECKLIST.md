# Setup Checklist

Replace every placeholder below before running `dotnet run` or `expo start`.

---

## `mobile/app.json`

- [ ] `ios.bundleIdentifier` — `com.yourcompany.ministack` (×1)  
  Your reverse-domain app ID, e.g. `com.acme.myapp`. Must match what you register in App Store Connect.

- [ ] `android.package` — `com.yourcompany.ministack` (×1)  
  Same reverse-domain ID used for your Google Play listing.

- [ ] `plugins[@sentry/react-native/expo].organization` — `YOUR_SENTRY_ORG`  
  Sentry → Settings → Organization → slug (the short name in your Sentry URL).

- [ ] `plugins[@sentry/react-native/expo].project` — `YOUR_SENTRY_PROJECT`  
  Sentry → Projects → your project → Settings → slug.

- [ ] `extra.eas.projectId` — `YOUR_EAS_PROJECT_ID` (×2, also in `updates.url`)  
  Run `eas init` once inside `mobile/` — it writes the UUID automatically.

---

## `backend/MiniStack.Api/appsettings.json`

- [ ] `ConnectionStrings.DefaultConnection` — `YOUR_SUPABASE_HOST`, `YOUR_PROJECT_REF`, `YOUR_SUPABASE_PASSWORD`  
  Supabase → Project Settings → Database → Connection string. Use the direct (non-pooler) URI and replace the three placeholders. Append `?sslmode=require` if not already present.

- [ ] `Jwt.Secret` — `REPLACE_WITH_A_RANDOM_32_CHAR_SECRET`  
  Generate with: `openssl rand -base64 32`

---

## `mobile/.env`

Copy `.env.example` → `.env`, then set:

- [ ] `EXPO_PUBLIC_API_BASE_URL` — e.g. `http://192.168.0.x:5001`  
  Your machine's LAN IP + port. Find it with `ipconfig getifaddr en0` (macOS) or `ipconfig` (Windows).

- [ ] `EXPO_PUBLIC_SENTRY_DSN` — optional  
  Sentry → Project → Settings → Client Keys → DSN.

---

## `README.md`

- [ ] Clone URL — `YOUR_USERNAME`  
  Replace with your actual GitHub username after forking/pushing the repo.
