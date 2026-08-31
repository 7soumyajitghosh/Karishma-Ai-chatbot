# Karishma → Android APK

The APK runs **the existing web app**, unchanged. Capacitor bundles the real
`dist/` build (same React code, same CSS, same Tailwind classes) and loads it in
the device WebView. There is no second UI anywhere.

Everything below runs on your Windows machine. I could not run it here: this
sandbox has no npm registry access, JDK 11 only, and no Android SDK.

---

## 0. Prerequisites (one time)

| Need | Why | Check |
|---|---|---|
| Node 22+ | Capacitor 8 requires it | `node -v` |
| JDK 21 | Capacitor 8's Gradle plugin requires it | `java -version` |
| Android Studio + SDK 35 | builds the APK | Studio → SDK Manager |

In Android Studio: **File → Settings → Build, Execution, Deployment → Build
Tools → Gradle → Gradle JDK = 21**. A JDK 17 or 11 setting is the single most
common cause of a failed first build.

---

## 1. Deploy the backend to Cloudflare (do this first)

The APK cannot talk to `localhost:3000`, so the Express server needs a public
HTTPS URL. We deploy it as a **Cloudflare Container** — it runs the SAME
`server.ts` (via the existing `Dockerfile`), so the backend is not rewritten.

Requirements: a **Workers paid plan** (Containers are not on the free tier) and
**Docker running locally** (Wrangler builds the image on your machine and pushes
it). `wrangler.jsonc` and `cloudflare/worker.js` are already in the project.

```powershell
npx wrangler login
npx wrangler deploy
```

`wrangler deploy` uploads the Worker, then builds and pushes the Docker image
and starts the container. Your URL is `https://karishma.<your-subdomain>.workers.dev`.

Set the same secrets the server reads locally from `.env` (each becomes an
environment variable inside the container):

```powershell
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put BREVO_API_KEY
npx wrangler secret put BREVO_SENDER_EMAIL
npx wrangler secret put APP_URL
```

Verify: `https://karishma.<your-subdomain>.workers.dev/api/health` must return
`{"status":"ok"}`.

Two notes, neither of which affects the app's behaviour:

- `db.json` writes are ephemeral (the container filesystem resets). Accounts
  already live in Firestore, which is the real source of truth.
- The self-repair engine writes source files; those writes don't persist across
  container restarts. It stays functional, just not persistent.

---

## 2. Point the APK at that backend

Open `.env.android` and fill in the URL from step 1, no trailing slash:

```
VITE_API_BASE=https://karishma.<your-subdomain>.workers.dev
```

This file is read **only** by the Android build. `npm run build` for the web
still produces relative `/api/...` URLs exactly as before.

---

## 3. Install dependencies and generate the Android project

```powershell
cd "D:\Karishma 1\karishma-1"
npm install
npm run build:android
npx cap add android
npx cap sync android
```

`cap add android` creates a fresh `android/` folder. Your previous native
Kotlin app was moved to `android-native-legacy/` — nothing was deleted.

`npm run build:android` must run **before** `cap add`/`cap sync`, because
Capacitor copies whatever is currently in `dist/` into the Android assets.

---

## 4. Build the APK

```powershell
npx cap open android
```

In Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**.

Or from the command line:

```powershell
cd android
.\gradlew assembleDebug
```

Output: `android\app\build\outputs\apk\debug\app-debug.apk`

---

## 5. Install on the phone

```powershell
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

**If this fails with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`**, the old native
Kotlin app is still installed under the same package name (`com.karishma.ai`,
kept deliberately so this is an upgrade, not a second icon). Uninstall it first:

```powershell
adb uninstall com.karishma.ai
```

---

## 6. After any code change

```powershell
npm run sync:android    # build:android + cap sync android
```

Then rebuild in Android Studio. You never need to touch `android/` by hand — it
is generated output and can be deleted and recreated at any time.

---

## Debugging on device

Connect the phone, open `chrome://inspect` in desktop Chrome, and you get the
full DevTools console for the app (`webContentsDebuggingEnabled: true` is set in
`capacitor.config.ts`).

To repoint an already-installed APK at a different backend without rebuilding,
run this in that console:

```js
localStorage.setItem('karishma_api_base', 'https://other-backend');
location.reload();
```

---

## What was added, and why

| File | Change |
|---|---|
| `capacitor.config.ts` | new — appId, `webDir: 'dist'`, `androidScheme: 'https'`, native keyboard resize |
| `src/lib/native.ts` | new — no-ops in a browser; rewrites `/api/...` onto `VITE_API_BASE`, wires the Android back button, syncs the status bar to the app's theme |
| `src/vite-env.d.ts` | new — types for `import.meta.env.VITE_API_BASE` |
| `.env.android` | new — the hosted backend URL |
| `Dockerfile`, `.dockerignore`, `.gcloudignore` | new — Cloud Run deploy |
| `src/main.tsx` | one import added, first line |
| `index.html` | `viewport-fit=cover` + `theme-color` |
| `src/index.css` | appended block, every rule scoped to `html.capacitor-native` |
| `src/App.tsx` | one additive `useEffect` for the Android back button |
| `server.ts` | `PORT` from env; CORS allowing only the Capacitor origins |
| `package.json` | Capacitor deps + `build:android` / `sync:android` / `open:android` |

No existing UI, colour, font, spacing, component or API call site was changed.


