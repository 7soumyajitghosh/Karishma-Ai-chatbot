# Karishma → Web + Android APK

One backend serves both clients. The APK is the **same** React app from `src/`,
built by Vite and loaded in the device WebView — there is no second UI and no
second AI implementation.

```
   Web browser ─┐
                ├─→  Render (Express server.ts)  ─→  OpenRouter → Nemotron
   Android APK ─┘          │                     └─→  Supabase (users, chats, OTP)
                           └─→  Brevo (OTP email)
```

Every secret lives in Render environment variables. The APK contains exactly one
piece of backend config: the public HTTPS URL.

Steps 1–3 must be done in order — the APK needs the backend URL, and the backend
needs its database, before either can work.

Everything here runs on your Windows machine. I could not run the build in my
sandbox: no npm registry access, JDK 11 only, no Android SDK.

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

## 1. Create the database tables

Open your Supabase project → **SQL Editor**, paste the whole of
`supabase/schema.sql`, and run it. It is idempotent (`CREATE TABLE IF NOT
EXISTS`), so re-running it is safe.

That script creates five things:

- `users`, `conversations`, `messages` — the chat data layer
- `auth_otps` — pending signup / password-reset codes
- `increment_otp_attempts()` — an atomic counter so two simultaneous OTP guesses
  cannot both read `attempts = 4`

`auth_otps` matters more than it looks. OTPs used to live in a `Map` in the Node
process, so a Render free instance going to sleep silently discarded every
pending signup. Skipping this step leaves signup working right up until the
server restarts, then breaking with "No pending verification found".

Do **not** add RLS policies to `auth_otps`. It is deliberately RLS-on with zero
policies, which denies everyone except the service-role key.

---

## 2. Deploy the backend to Render

`render.yaml` is a Blueprint — Render reads it and provisions the service for
you. It builds the existing `Dockerfile`, so `server.ts` is not rewritten or
duplicated.

```powershell
git add -A
git commit -m "Render deploy + Supabase OTP store"
git push
```

Then in the Render dashboard: **New → Blueprint → pick this repo → Apply**.

Render will prompt for every variable marked `sync: false`. Paste them in:

| Variable | Where it comes from |
|---|---|
| `OPENROUTER_API_KEY` | openrouter.ai → Keys |
| `GEMINI_API_KEY` | aistudio.google.com → API keys |
| `BREVO_API_KEY` | Brevo → SMTP & API → API keys |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` |
| `POLLINATIONS_API_KEY` | optional; leave blank for the keyless tier |

`NODE_ENV`, `PORT`, `BREVO_SENDER_EMAIL` and `APP_URL` are already set in
`render.yaml` and need no input.

**Leave `SELF_REPAIR_TOKEN` unset.** While it is unset, `/api/self-repair/*` and
`/api/test/*` return 404 on the public URL. Those routes have no auth of their
own: self-repair drives an LLM that rewrites `server.ts` and ships source code
to a third-party API, and `/api/test/*` creates real user rows on every call.
Set it only for a deliberate debugging window, then delete it again.

### Verify the deploy before touching the APK

The first build takes 5–8 minutes. When it goes live, open:

```
https://<your-service>.onrender.com/api/health
```

You should get something like:

```json
{"status":"ok","env":"production","otpStore":"supabase",
 "configured":{"supabase":true,"brevo":true,"openrouter":true,"gemini":true},
 "devEndpoints":"disabled"}
```

Read it carefully — it reports booleans only, never a key or a URL:

- `otpStore` must be `"supabase"`. If it says `"memory"`, step 1 or the two
  Supabase variables did not take, and pending signups will not survive a
  restart.
- `configured.openrouter: false` means chat falls through to Gemini, then to
  Pollinations, then to a polite "providers not configured" message.
- `devEndpoints` must be `"disabled"` on a public URL.

That same URL is the Render health check, so a cold Supabase connection can
never fail a deploy.

**Free-tier behaviour that looks like a bug:** the instance sleeps after 15
minutes idle, and the next request waits ~1 minute for a cold start. The first
login or first message after a quiet period will feel hung. It is not — and
because OTPs are now in Supabase, nothing is lost across that sleep. Do not raise
the instance count above one: the rate limiter still keeps its state in process
memory, so a second instance would let each caller through twice.

---

## 3. Point the APK at that backend

`.env.android` already contains:

```
VITE_API_BASE=https://karishma-ai.onrender.com
```

Render derives that hostname from the service name in `render.yaml`. If
`karishma-ai` was already taken in your workspace, Render appended a suffix —
copy the real URL from the top of the service page and replace the value. No
trailing slash.

This file is read **only** by `npm run build:android`. The web build still emits
relative `/api/...` URLs, so browser behaviour is unchanged.

Only public values belong in it. It is compiled into the APK, which anyone can
unzip.

---

## 4. Build the APK

```powershell
cd "D:\Karishma 1\karishma git hub\Karishma-Ai-chatbot"
npm install
npm run build:android
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

Output: `android\app\build\outputs\apk\debug\app-debug.apk`

Notes on that sequence:

- **Do not run `npx cap add android`.** The `android/` project already exists
  with `com.karishma.ai` as its namespace and applicationId. `cap add` would
  overwrite it.
- `build:android` must run **before** `cap sync`, because sync copies whatever is
  currently in `dist-android/` into the Android assets.
- `webDir` is `dist-android`, not `dist`, and that is deliberate: the web build
  writes the bundled Express backend to `dist/server.cjs`, and anything inside
  `webDir` gets packaged into the APK. Pointing at `dist` would ship the whole
  server bundle inside the app.

Steps 4 onward are the only ones you repeat after a code change:

```powershell
npm run sync:android      # build:android + cap sync android
cd android; .\gradlew.bat assembleDebug
```

---

## 5. Install on the phone

```powershell
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

If this fails with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, the old native Kotlin
app is still installed under the same package name (`com.karishma.ai`, kept
deliberately so this is an upgrade rather than a second icon):

```powershell
adb uninstall com.karishma.ai
```

---

## 6. Debugging on device

Connect the phone and open `chrome://inspect` in desktop Chrome for the app's
full DevTools console (`webContentsDebuggingEnabled: true` in
`capacitor.config.ts` — set it to `false` for a Play Store release).

If `/api` calls fail, the first thing to check in that console is:

```js
localStorage.getItem('karishma_api_base')   // runtime override, if any
```

`src/lib/native.ts` logs an explicit error at startup when no backend URL is
configured. To repoint an already-installed APK without rebuilding:

```js
localStorage.setItem('karishma_api_base', 'https://other-backend');
location.reload();
```

A CORS failure in that console means the WebView origin is not on the allowlist.
The APK's origin is `https://localhost` (from `androidScheme: 'https'`), which is
allowed in `server.ts`. The web app is served by the same Express process from
`dist/`, so it is same-origin and needs no CORS entry at all.

---

## Optional cleanup

Neither of these breaks the build; both are leftovers.

`android/app/src/**/java/com/getcapacitor/myapp/` holds three template files
(`MainActivity.java`, `ExampleUnitTest.java`, `ExampleInstrumentedTest.java`)
from the Capacitor scaffold. The real activity is
`android/app/src/main/java/com/karishma/ai/MainActivity.java`, which is what
`AndroidManifest.xml` points at. The `getcapacitor` copies are unreferenced dead
code — safe to delete.

`android-kotlin-gutted-20260903/`, `android-kotlin-old/` and
`android-native-legacy/` are the previous hand-written native app. Nothing in the
build references them. They are kept only as a fallback; delete them once you are
happy with the Capacitor APK.

---

## What each file contributes

| File | Role |
|---|---|
| `render.yaml` | Render Blueprint: Docker service, health check, env var list |
| `Dockerfile` | builds web + server, runs `node dist/server.cjs` |
| `supabase/schema.sql` | users, conversations, messages, `auth_otps` |
| `server/otpStore.ts` | durable OTP store with an in-memory dev fallback |
| `server/supabaseHistory.ts` | conversation + message + user persistence |
| `capacitor.config.ts` | appId, `webDir: 'dist-android'`, `androidScheme: 'https'` |
| `src/lib/native.ts` | no-ops in a browser; in the APK rewrites `/api/...` onto `VITE_API_BASE`, wires the Android back button, syncs the status bar |
| `.env.android` | the one public value the APK needs |




