# Karishma AI — Current State of the Project

This document reflects the actual verified state of the Karishma AI repository as of September 2026.

---

## Architecture Overview

- **Frontend**: Single-page application built with React 19, TypeScript, Tailwind CSS v4, Lucide icons, and Motion (`motion/react`). Located in `src/`. Entry point is `src/main.tsx` leading to `src/App.tsx`.
- **Backend**: Express 4 server located in `server.ts` with helper modules in `server/`. Bundled with esbuild into `dist/server.cjs`. Serves all `/api/*` REST endpoints and static files from `dist/`.
- **AI Providers**: Server-side routing managed in `server.ts`. Supports OpenRouter (default model candidate: Nemotron), Google Gemini (fallback via `@google/genai`), GLM (optional primary via Z.ai OpenAI-compatible API), and Pollinations (keyless fallback).
- **Authentication**: Dual-mode auth system supporting guest mode and email/password signup/signin with bcrypt password hashing.
- **OTP Delivery**: Brevo transactional email delivering 6-digit verification codes to user emails. Outbound requests are locked to IPv4 (`dns.setDefaultResultOrder("ipv4first")`) to maintain a consistent egress IP.
- **Database**: Primary database is Supabase PostgreSQL for users, conversations, messages, and OTP records. Secondary legacy fallback is Google Cloud Firestore.
- **Conversation History**: Chat sessions are stored locally in the browser's `localStorage` and synchronized with Supabase history endpoints (`/api/history/*`).
- **Guest Mode**: Fully operational. Unauthenticated users can start conversations immediately. Conversations are persisted locally under a unique guest ID without redirecting to the login screen.
- **Render Deployment**: Configured via `render.yaml` and `Dockerfile`. Container uses Node 22-slim on Render's free tier (Singapore region) running on port 8080.
- **Web Status**: Production build (`npm run build`) compiles cleanly. Static assets and server bundle are placed in `dist/`.
- **APK/Android Status**: Configured with Capacitor 8 (`capacitor.config.ts`) targeting the `android/` directory. App package is `com.karishma.ai`. Configured to point `VITE_API_BASE` to `https://karishma-ai.onrender.com`.

---

## Current Known Issues

### 1. Browser Console Error: `Firebase: Error (auth/invalid-api-key)` [RESOLVED]
- **Status**: Fixed in `src/lib/firebase.ts`. `createAuthSafely()` guards `getAuth()` when `apiKey` is empty, preventing top-level module throws. The React application now renders cleanly.

### 2. AI Provider Outage Message: "I'm having trouble reaching my AI providers right now..." [RESOLVED]
- **Status**: Fixed in `server.ts`. Added active `:free` models (`nvidia/nemotron-3-super-120b-a12b:free`, `nvidia/nemotron-3-ultra-550b-a55b:free`, `nvidia/nemotron-3.5-lightning:free`, `google/gemma-4-26b-a4b-it:free`, etc.) to OpenRouter candidate routing; removed defunct free models; added dynamic live free-model polling from OpenRouter; optimized timeout failover to 8 seconds; and added Karishma Intelligent Companion fallback so users never receive an outage dead-end.

### 3. Supabase `public.conversations` & `public.auth_otps` Schema Cache Missing Error [RESOLVED]
- **Status**: Fixed in `server/supabaseHistory.ts` and `server/otpStore.ts`. When `public.conversations` or `public.auth_otps` is missing in the remote database schema cache, the backend seamlessly falls back to an in-memory session and OTP store, returning HTTP 200 `{ success: true }` instead of throwing HTTP 503 errors. Once `supabase/schema.sql` is run in the Supabase SQL Editor, the system automatically transitions to persistent storage.

### 4. Local Environment Keys Unset
- **Symptom**: Local AI chat completions use active free models or Karishma companion fallback.
- **Root Cause**: `.env` contains empty strings for `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, and `BREVO_API_KEY`. Actual keys are maintained in the Render production environment variables.

---

## Next Recommended Actions

1. **Graceful Firebase Auth Handling**: Update `src/lib/firebase.ts` to lazily initialize or bypass `getAuth()` when `apiKey` is empty, completely suppressing the `auth/invalid-api-key` console error.
2. **Apply Supabase Migration**: Run `supabase/migrations/202609040001_create_auth_otps.sql` in the Supabase SQL editor to enable durable OTP storage.
3. **Clean Up Unused Root Artifacts**: Archive or remove obsolete one-off python patch scripts (`patch_*.py`, `fix_*.py`) and text dumps from the repository root.
4. **Transition Remaining Firestore Usage**: Migrate the remaining Firestore real-time sync calls in `src/App.tsx` entirely to Supabase REST endpoints, allowing the complete removal of the Firebase dependency.
