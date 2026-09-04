# Karishma AI — System Architecture

This document describes the actual architecture of the Karishma AI application based on repository inspection.

---

## High-Level Architecture Diagram

```
GitHub
   ↓ (Automated Deploy)
Render
   ↓
Karishma Backend (Express in server.ts / dist/server.cjs)
   ├── OpenRouter (Nemotron 340B candidate models - Default)
   ├── Gemini (@google/genai fallback)
   ├── GLM (Optional primary via Z.ai OpenAI-compatible endpoint)
   ├── Pollinations (Keyless last-resort fallback)
   ├── Brevo (Transactional Email OTP via IPv4)
   └── Supabase
        ├── auth_otps (Durable OTP & password-reset store)
        ├── users (Account records & bcrypt credentials)
        └── conversations / messages (Persistent chat history)
             ↑
        ┌────┴────┐
        │         │
     Web App     Android APK
 (Browser SPA)  (Capacitor 8)
```

---

## Component Details

### 1. Frontend Entry Point
- **Root HTML**: `index.html` loads the Vite module root `/src/main.tsx`.
- **Application Root**: `src/main.tsx` mounts `<App />` from `src/App.tsx` wrapped in `<React.StrictMode>`.
- **Primary UI**: `src/App.tsx` contains the comprehensive chat experience, sidebar drawer, settings modal, theme panel, model selector, audio TTS controls, and message rendering.

### 2. Backend Entry Point
- **Source**: `server.ts` is the single main entry point for the backend.
- **Production Bundle**: Bundled via esbuild (`npm run build`) to `dist/server.cjs` with `--platform=node --packages=external`.
- **Execution**: Run with `node dist/server.cjs` (listening on port `8080` in production or `3000` locally).

### 3. API Communication
- Client communicates with the backend via JSON REST endpoints under `/api/*`:
  - `POST /api/chat`: Primary AI chat generation.
  - `GET /api/health`: Health probe reporting backend readiness and provider configuration flags.
  - `POST /api/auth/request-otp`: Sends verification OTP via Brevo.
  - `POST /api/auth/verify-otp`: Validates OTP and registers account.
  - `POST /api/auth/login`: Authenticates with email and password.
  - `GET/POST/DELETE /api/history/*`: Manages Supabase conversation sessions.
  - `POST /api/generate-image`: Image synthesis via Gemini or Pollinations.
  - `POST /api/tts`: Audio voice synthesis.

### 4. Authentication Flow
- **Guest Mode**: Default unauthenticated mode. Uses a local UUID generated and stored in `localStorage`. Chat history is saved locally.
- **Email/Password Mode**:
  1. User enters name, email, and password.
  2. Client calls `/api/auth/request-otp`.
  3. Server hashes password with `bcryptjs` and generates a 6-digit OTP.
  4. Server sends code to email via Brevo and stores hashed OTP in Supabase `auth_otps` table.
  5. User submits OTP to `/api/auth/verify-otp`.
  6. Server verifies OTP, creates user record in `users`, and issues authentication token.

### 5. OTP Flow
- Outbound delivery via Brevo transactional email (`https://api.brevo.com/v3/smtp/email`).
- Process forces IPv4 DNS resolution (`dns.setDefaultResultOrder("ipv4first")`) to maintain stable IP egress.
- Codes are stored as bcrypt hashes in `public.auth_otps` with an expiration timestamp and attempt limit.
- If Supabase `auth_otps` is unavailable, server falls back to an in-memory `Map` (`server/otpStore.ts`).

### 6. Database Flow
- **Supabase**: Primary persistent data store configured in `server/supabaseHistory.ts` and `server/otpStore.ts`.
  - Service-role key is required to bypass RLS policies on `users`, `conversations`, `messages`, and `auth_otps`.
- **Firestore (Legacy Fallback)**: `server.ts` and `src/lib/firebase.ts` retain Firestore lookup fallback for accounts and real-time subscription.
- **Local In-Memory / LocalStorage**: In-memory `Map` stores serve as fallback during local development when credentials are not present.

### 7. AI Request Flow
When a user sends a prompt to `/api/chat`:
1. **Hosted-Key Guard**: Checks origin (allowing only the web app origin and Capacitor mobile app) unless caller supplies their own BYOK key.
2. **Rate Limiting**: Checks IP bucket limits.
3. **Provider Dispatch**:
   - **Step 0**: GLM (`glm-4.6` via Z.ai OpenAI-compatible API) if `GLM_API_KEY` is present and message is text-only.
   - **Step 1**: OpenRouter (`nvidia/nemotron-4-340b-instruct` or candidate models) via OpenAI SDK if `OPENROUTER_API_KEY` is present.
   - **Step 2**: Google Gemini via `@google/genai` if `GEMINI_API_KEY` is present.
   - **Step 3**: Pollinations (keyless AI tier) if all previous providers fail or lack keys.
4. **Secret Sanitization**: All responses and error messages are filtered through `sanitizeSecrets()`.

### 8. Web Deployment Flow
- Managed via Render Blueprint (`render.yaml`).
- Triggered by pushes to the `main` branch on GitHub.
- Docker builds the image using multi-stage `Dockerfile`:
  - Stage 1 (`build`): Runs `npm install` and `npm run build` (Vite SPA build + esbuild server bundle).
  - Stage 2 (`runtime`): Copies `dist/` and production dependencies, starts `node dist/server.cjs` on port `8080`.
- Render validates deployment using `/api/health`.

### 9. APK / Mobile Connection
- Built using Capacitor 8 (`capacitor.config.ts`).
- Android source directory located in `android/`.
- Reads `VITE_API_BASE` from `.env.android` (`https://karishma-ai-chatbot.onrender.com`) at build time.
- WebView executes the React application and routes all `/api/*` network requests to the production Render host.

---

## Important Environment Variables

> [!NOTE]
> All keys and credentials must be stored strictly in server environment variables. Never commit or expose values.

| Variable Name | Component | Purpose |
|---|---|---|
| `NODE_ENV` | Server | Runtime mode (`production` vs `development`) |
| `PORT` | Server | Port the Express server listens on (default `8080` in Docker) |
| `OPENROUTER_API_KEY` | AI System | API key for OpenRouter models (Nemotron primary) |
| `GEMINI_API_KEY` | AI System | API key for Google Gemini fallback and multimodal operations |
| `GLM_API_KEY` | AI System | Optional API key for GLM primary chat provider |
| `GLM_BASE_URL` | AI System | Custom base URL for GLM provider |
| `GLM_MODEL` | AI System | Model identifier for GLM provider |
| `BREVO_API_KEY` | Auth / OTP | API key for Brevo transactional email delivery |
| `BREVO_SENDER_EMAIL` | Auth / OTP | Sender email address for OTP delivery |
| `SUPABASE_URL` | Database | REST / PostgreSQL endpoint for Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Database | Privileged key for server-side database operations |
| `APP_URL` | Server | Public URL of the app for OpenRouter referer header |
| `POLLINATIONS_API_KEY` | AI System | Optional key for enhanced Pollinations tier |
| `VITE_API_BASE` | Android APK | Public HTTPS URL of the backend for Capacitor WebView |
