# ✨ Karishma

> A modern application built with a web frontend, an Express backend,
> and a deployment-ready architecture for Android and cloud
> environments.

[![Backend](https://img.shields.io/badge/Backend-Express.js-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Deployment](https://img.shields.io/badge/Deployment-Google%20Cloud%20Run-4285F4?style=for-the-badge&logo=googlecloud)](https://cloud.google.com/run)
[![Android](https://img.shields.io/badge/Android-Capacitor-119D55?style=for-the-badge&logo=capacitor)](https://capacitorjs.com/)
[![Security](https://img.shields.io/badge/Security-AES--256--GCM%20Client--Side-emerald?style=for-the-badge&logo=shield)](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)

## 🌟 Overview

**Karishma** is a full-stack conversational companion application designed to run as a responsive web app and an Android APK.

The project separates the frontend from the backend so that the application can communicate with a remotely deployed API. The backend is built with **Express** and is intended to run on **Google Cloud Run** or **Render**, while the frontend is built with **React 19** and packaged for Android using **Capacitor**.

## 🏗️ Architecture

```text
┌─────────────────────┐
│   Karishma Frontend │
│     Web / Android   │
└──────────┬──────────┘
           │
           │ HTTPS API (TLS)
           ▼
┌─────────────────────┐
│   Express Backend   │
│      server.ts      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Google Cloud Run  │
│      / Render       │
└─────────────────────┘
```

## 🔒 Security & Client-Side Encryption (E2EE)

Karishma implements **authenticated client-side encryption (AES-256-GCM)** for stored chat conversations across both the Web client and the Android APK.

### 1. Cryptographic Architecture & Flow

```text
[User Device / Browser / APK]
  │
  ├─ User inputs message
  │
  ├─ 1. Live AI Turn (Ephemeral Inference):
  │     PlainText Prompt ──(TLS/HTTPS)──> Karishma Backend ──(TLS)──> AI Provider (Nemotron/Gemini)
  │                                                                    │
  │     Response <───────(TLS/HTTPS)──── Karishma Backend <──(TLS)─────┘
  │     (Processed in RAM only; backend does NOT persist prompts to database)
  │
  └─ 2. Persistent Chat History (Zero-Knowledge Storage):
        PlainText Message + Random 96-bit IV
           │
           ▼ [Web Crypto API: AES-256-GCM + 128-bit Tag]
        Ciphertext: "enc:v1:<iv_base64>:<ciphertext_and_tag_base64>"
           │
           ▼ (HTTPS POST /api/history/save)
        Karishma Backend & Supabase Database
        (Stores ONLY ciphertext; server has zero knowledge of encryption key)
```

- **Algorithm:** AES-GCM (Galois/Counter Mode) with 256-bit symmetric keys.
- **Provider:** Standard W3C Web Crypto API (`window.crypto.subtle` / `globalThis.crypto.subtle`). Native to modern browsers, WebViews, and Node.js.
- **Nonce/IV:** A fresh 96-bit (12-byte) cryptographically secure pseudo-random initialization vector is generated for *every single message* using `crypto.getRandomValues()`. Nonces are never reused.
- **Integrity & Authenticity:** AES-GCM generates a 128-bit authentication tag. During decryption, if any part of the ciphertext or IV has been tampered with or modified, decryption automatically fails and safely rejects the payload.
- **Wire & Database Envelope:** Stored strings use a versioned envelope prefix: `enc:v1:<iv_b64>:<ciphertext_b64>`.

---

### 2. Key Generation & Key Management

- **Client-Side Generation:** Keys are generated directly on the device using `crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])`.
- **Zero-Knowledge Server:** The encryption key is **never** sent to the Express backend, Supabase, Firestore, or any remote logging facility.
- **Local Storage:** The key is serialized as raw 32-byte Base64 and saved in device-local storage isolated by user account (`karishma_e2ee_key_<userId>`).
- **Recovery & Multi-Device Sync:**
  - Users can export or view their formatted recovery key (`KARM-XXXX-XXXX-XXXX-...`) from **Settings → Privacy & Storage → Device Recovery Key**.
  - When accessing Karishma from a new device or browser, users can import their recovery key in Settings to decrypt synced historical messages.
  - If a user opens the app on an unkeyed device, encrypted messages remain safely sealed with a `[Encrypted Message — Key Required to Decrypt]` notice until the recovery key is entered.
- **Logout & Cleanup:** Logging out immediately clears in-memory cryptographic key references and user caches.

---

### 3. What the Server and Database Can and Cannot See

| Data Category | What the Server / Database Can See | What the Server / Database CANNOT See |
| :--- | :--- | :--- |
| **Stored Chat Messages** | Only encrypted ciphertext (`enc:v1:...`) and message timestamps | The plaintext content of any user or assistant messages saved in history |
| **Conversation Titles** | Generic placeholder (`"Encrypted Conversation"`) | Topics, message excerpts, or confidential discussion titles |
| **Encryption Keys** | **Nothing.** Keys never leave the client device | The raw key, recovery phrase, or derivation salt |
| **Ephemeral Live Turn** | The prompt during active inference (in-memory RAM only) | The server does not store prompts to database during `/api/chat` |
| **User Account & Metadata** | User email, hashed password, user ID, session tokens | The user's device-side private chat contents |

---

### 4. AI Provider Limitation & Boundaries (Very Important)

Like all modern LLM-based chat applications running hosted server-side models (such as Nemotron on OpenRouter, Google Gemini, or GLM):

- **Inference Requirement:** The AI model provider must receive the conversational prompt in readable text to process natural language and generate responses.
- **Ephemeral Processing:** During `/api/chat`, user prompts are transmitted over TLS to the backend and forwarded over TLS to the selected AI provider. The backend holds prompts ephemerally in RAM only to execute the API call, and does **not** log or persist prompts to the database.
- **Honest Boundary:** We do **not** claim complete zero-knowledge E2EE across external LLM model providers. What is guaranteed is:
  1. **Zero-Knowledge Storage at Rest:** Stored chat history in Supabase and cloud databases cannot be decrypted by the database administrator, host provider, or backend server.
  2. **Transport Security:** All transit is strictly protected via TLS/HTTPS.
  3. **Zero Key Transmission:** The server never receives client cryptographic keys.

---

### 5. Threat Model & What Encryption Does NOT Protect

#### What It Protects:
- Database compromises or leaks of the Supabase `messages` or `conversations` tables.
- Eavesdropping on stored conversations by cloud hosting providers or database admins.
- Tampering with ciphertext in transit or at rest (tamper-detection rejects modified payloads).
- Cross-user data leakage between separate user accounts on the server.

#### What It Does NOT Protect:
- **Compromised Client Device:** If malware, spyware, or keyloggers infect the user's phone or computer, or if unauthorized physical access is granted while unlocked.
- **Malicious Browser Extensions:** Browser extensions with permission to read page DOM can inspect rendered text in the browser.
- **AI Provider Trust:** The selected AI model provider (e.g. OpenRouter, Google, NVIDIA) processes the prompt text during generation.
- **Lost Recovery Keys:** Because the server has zero access to user keys, if a user loses their device and has not saved their recovery key (`KARM-...`), previous encrypted conversations cannot be recovered by the server administrator.

---

### 6. Dependencies, Environment Variables & Compatibility

- **Dependencies:** **Zero new npm packages.** Uses the native W3C Web Crypto API standard (`crypto.subtle`), available in all modern browsers, Android WebViews (via Capacitor `androidScheme: 'https'`), and Node.js 18+.
- **Environment Variables:** No new environment variables are needed. The server requires no encryption keys because all cryptography is client-side.
- **Backward Compatibility:** Existing unencrypted messages (stored before encryption was enabled) are loaded seamlessly without corruption or data loss. Newly saved messages are encrypted in the versioned `enc:v1:` format.
- **Automated Security Tests:** Run the cryptographic test suite anytime:
  ```bash
  npx tsx scripts/test_crypto_e2ee.ts
  ```
  Tests key generation, AES-256-GCM round-trips, random IV uniqueness, tampered ciphertext rejection, wrong-key failure, PBKDF2 derivation, and wire payload simulation.

## 🚀 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19 + TypeScript + Tailwind CSS |
| **Cryptography** | Web Crypto API (AES-256-GCM + PBKDF2) |
| **Backend** | Node.js + Express (`server.ts`) |
| **Database** | Supabase (PostgreSQL + RLS) |
| **Cloud deployment** | Google Cloud Run / Render |
| **Android packaging** | Capacitor (WebView with `https` scheme) |
| **Android build** | Gradle |
| **API configuration** | `VITE_API_BASE` |

## 📁 Project Structure

```text
Karishma/
├── android/              # Android project generated by Capacitor
├── cloudflare/           # Cloudflare deployment-related files, if used
├── dist/                 # Production build output
├── server.ts             # Express backend
├── Dockerfile            # Container configuration
├── wrangler.jsonc        # Cloudflare configuration, if used
├── package.json          # Dependencies and scripts
├── .env.android          # Android API configuration
└── README.md             # Project documentation
```

## ⚙️ Local Setup

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd Karishma
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

## 🔌 API Configuration

For the Android build, configure the backend URL in:

```text
.env.android
```

Set:

```env
VITE_API_BASE=https://YOUR-CLOUD-RUN-URL
```

**Important:** keep the Cloud Run URL without a trailing `/`.

The backend health endpoint can be checked at:

```text
https://YOUR-CLOUD-RUN-URL/api/health
```

A healthy backend should return:

```json
{
  "status": "ok"
}
```

## ☁️ Deploy Backend to Google Cloud Run

Karishma's backend is designed to be deployed to **Google Cloud Run**.

Authenticate with Google Cloud:

```bash
gcloud auth login
```

Then deploy:

```bash
gcloud run deploy karishma --source . --region asia-south1 --allow-unauthenticated
```

After deployment, use the generated Cloud Run URL as the Android app's `VITE_API_BASE`.

## 📱 Build the Android App

After the backend is deployed:

```bash
npm install
npm run build:android
```

If Capacitor has not been added yet:

```bash
npx cap add android
```

Sync the web build with Android:

```bash
npx cap sync android
```

Build the debug APK:

### Windows

```powershell
cd android
.\gradlew assembleDebug
```

The generated APK will be located at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 🔄 Recommended Deployment Flow

```text
1. Make changes
       ↓
2. Test locally
       ↓
3. Deploy backend
       ↓
4. Check /api/health
       ↓
5. Update VITE_API_BASE
       ↓
6. Build Android
       ↓
7. Sync Capacitor
       ↓
8. Generate APK
```

## 🧪 Health Check

Before building the Android app, verify that the backend is reachable:

```text
GET /api/health
```

Expected response:

```json
{
  "status": "ok"
}
```

If this endpoint does not work, fix the backend deployment before building the Android app.

## 🔐 Environment Variables

Never commit private API keys, passwords, tokens, or other secrets to GitHub.

Keep sensitive values in environment configuration and make sure files containing secrets are included in `.gitignore` where appropriate.

Example:

```env
VITE_API_BASE=https://YOUR-CLOUD-RUN-URL
```

### Supabase conversation storage

Run [supabase/migrations/202608310001_create_chat_history.sql](supabase/migrations/202608310001_create_chat_history.sql) in the Supabase SQL Editor before deploying. It creates the `conversations` and `messages` tables used by the existing `/api/history` endpoints.

For Render, open **Service → Environment** and add these server-side variables:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` must never be set as a `VITE_*` variable or added to an Android/client environment file. Render injects environment variables at container runtime; no Dockerfile secret or build argument is required.

## 🛠️ Troubleshooting

### Android app cannot connect to the backend

Check:
- `VITE_API_BASE` points to the correct Cloud Run URL.
- The URL does not end with `/`.
- The backend is actually deployed.
- `/api/health` returns `{"status":"ok"}`.
- After changing the API URL, rebuild and run `npx cap sync android`.

### Backend is not responding

Check the Cloud Run deployment and application logs, then verify the health endpoint.

### Android build fails

Try:

```bash
npm install
npm run build:android
npx cap sync android
```

Then:

```powershell
cd android
.\gradlew assembleDebug
```

## 🎯 Project Goal

Karishma is structured to make the application:
- 🌐 **Web-ready**
- 📱 **Android-ready**
- ☁️ **Cloud deployable**
- 🔌 **API-driven**
- 🔒 **Zero-knowledge encrypted storage**
- 🧩 **Easy to maintain**
- 🚀 **Ready for future improvements**

## 🤝 Contributing

Contributions, improvements, bug fixes, and ideas are welcome.

A simple contribution flow:

```text
Fork → Create Branch → Make Changes → Test → Commit → Pull Request
```

## 📄 License

Add the project's chosen license here.

---

<p align="center">
Built with ❤️ for <strong>Karishma</strong>
</p>
