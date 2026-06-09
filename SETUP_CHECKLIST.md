# Setup Checklist

Replace every placeholder below before running `dotnet run` or `expo start`.

---

## `mobile/app.json`

- [ ] `ios.bundleIdentifier` — `com.dgit.ministack` (×1)  
  Your reverse-domain app ID, e.g. `com.acme.myapp`. Must match what you register in App Store Connect.

- [ ] `android.package` — `com.dgit.ministack` (×1)  
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

---

## Google Sign In

### 1. Create OAuth credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Create **three** clients:

   | Type | Required field |
   |---|---|
   | **iOS** | Bundle ID: your `ios.bundleIdentifier` (e.g. `com.acme.myapp`) |
   | **Android** | Package name + SHA-1 fingerprint (`cd android && ./gradlew signingReport`) |
   | **Web** | No extra fields — used for server-side token validation |

### 2. Add client IDs to the mobile app

In `mobile/.env`:
```
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

### 3. Add allowed client IDs to the backend

In `backend/MiniStack.Api/appsettings.json` → `Google.AllowedClientIds`, list all three client IDs.  
For GCP deployments, they are also set as env vars in `.github/workflows/deploy-gcp.yml`.

### 4. Rebuild the native app

```bash
cd mobile && npx expo prebuild --clean --platform ios && npx expo run:ios
```

> **Note:** Google Sign In uses a web-based OAuth flow (`expo-auth-session`) — no Google Sign-In SDK needed. It works in both Expo Go (via auth proxy) and native builds (via reverse client ID URL scheme).

---

## Apple Sign In

> **Requirements:** Apple Developer account ($99/yr). Does **not** work in Expo Go — requires a native build (`expo run:ios` or EAS Build).

### 1. Register your App ID

1. [developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers & Profiles → Identifiers → +**
2. Select **App IDs** → **App** → Continue
3. Set **Bundle ID** (Explicit) to match `ios.bundleIdentifier` in `app.config.js`
4. Under **Capabilities**, enable **Sign In with Apple**
5. Register

### 2. Update the backend bundle ID

In `backend/MiniStack.Api/appsettings.json`:
```json
"Apple": {
  "BundleId": "com.acme.myapp"
}
```
The backend verifies Apple's identity token using this as the expected `aud` claim.

### 3. Build

```bash
cd mobile && npx expo prebuild --clean --platform ios && npx expo run:ios
```

EAS Build automatically creates a provisioning profile with the Sign In with Apple entitlement when it detects `com.apple.developer.applesignin` in the entitlements — no manual profile management needed.

### 4. Test on simulator

Sign into an Apple ID in the simulator first:  
**Simulator → Settings → Sign in to iPhone**

The Apple Sign In button only renders on iOS (`Platform.OS === "ios"`) and only when `isAvailableAsync()` returns true.

---

## Password Reset

No external setup required. Configure an SMTP provider in `backend/.env`:

```
Email__SmtpHost=smtp.sendgrid.net
Email__SmtpPort=587
Email__FromAddress=noreply@yourapp.com
Email__Username=apikey
Email__Password=YOUR_SENDGRID_API_KEY
```

In development (no SMTP configured), the reset link is logged to the console instead of sent by email.
