# Karishma AI — Master Project Roadmap

This is the permanent MASTER ROADMAP for the Karishma AI project. It documents the current status of all major subsystems based strictly on the code present in this repository.

---

## Intended Architecture

```
GitHub
   ↓
Render
   ↓
Karishma Backend
   ├── OpenRouter → Nemotron (Primary AI)
   ├── Gemini → Fallback
   ├── Brevo → OTP Email
   └── Supabase
        ├── OTP
        ├── User/Data
        └── Conversation History
             ↑
        ┌────┴────┐
        │         │
       WEB       APK
```

---

## Subsystem Status

### 1. Core Architecture
- [x] ✅ **Express Backend Service** (`server.ts`): Single-file unified server providing `/api/*` routes and static SPA hosting from `dist/`.
- [x] ✅ **TypeScript & Esbuild Toolchain**: Dual build pipeline (`vite build` + `esbuild server.ts --bundle --platform=node --format=cjs`) building to `dist/`.
- [x] ✅ **Hosted-Key Guard & Security**: Validates request origins and protects backend provider credits from unauthorized third-party spending.
- [x] ✅ **Secret Sanitization**: `sanitizeSecrets()` redacts environment keys and tokens from server responses and error logs.
- [x] ✅ **Repository Secret Sanitization**: Removed all hardcoded credentials (`AIzaSy...`, `sb_publishable_...`) from version control.

### 2. AI System
- [x] ✅ **OpenRouter Integration**: OpenAI SDK configured with candidate models prioritizing Nemotron (`nvidia/nemotron-4-340b-instruct`) as the primary AI model.
- [x] ✅ **Gemini Fallback**: Integrated via `@google/genai` with fallback support for text, multimodal, and image generation.
- [x] ✅ **GLM Provider Support**: Optional primary provider via Z.ai OpenAI-compatible endpoint when `GLM_API_KEY` is configured.
- [x] ✅ **Pollinations Fallback**: Keyless tier fallback for chat and image generation when all keyed providers are unavailable.
- [x] ✅ **Server-Side Key Isolation**: Frontend does not require or accept user API keys; server handles all provider credentials securely.
- [ ] 🔄 **Provider Status Reporting**: `GET /api/health` reports status flags for all configured providers to the frontend settings modal.

### 3. Authentication & OTP
- [x] ✅ **Guest Mode**: Allows immediate chat usage without requiring authentication or redirecting to the login screen.
- [x] ✅ **Email & Password Authentication**: Full signup and signin flows with bcrypt password hashing.
- [x] ✅ **Brevo Email OTP**: Outbound transactional email delivery for 6-digit verification codes using `@getbrevo/brevo` or HTTPS API.
- [x] ✅ **IPv4 DNS Stabilization**: `dns.setDefaultResultOrder("ipv4first")` configured to prevent dynamic IPv6 rotation issues with Brevo API.
- [ ] ⚠️ **Durable Supabase OTP Store**: `server/otpStore.ts` is implemented for `public.auth_otps`, but requires the SQL migration to be executed in the Supabase project dashboard. Falls back to in-memory store if the table is missing.

### 4. Database & Conversation History
- [x] ✅ **Supabase Data Layer**: Client and server integration for `users`, `conversations`, and `messages` tables.
- [x] ✅ **Supabase Service Role Access**: Backend strictly uses service-role credentials to access RLS-protected tables.
- [ ] 🔄 **Legacy Firestore Support**: Firestore fallback remains in `server.ts` and `src/lib/firebase.ts` for account lookup and real-time conversation sync.
- [ ] ⚠️ **Browser Firebase Auth Cleanup**: When `apiKey` is empty in `firebase-applet-config.json`, client `getAuth()` triggers an `auth/invalid-api-key` error in the browser console.

### 5. Web App
- [x] ✅ **React 19 & Tailwind 4 Frontend**: Complete responsive chat interface in `src/App.tsx`.
- [x] ✅ **Session & Chat Management**: Multiple conversation sessions, local persistence via localStorage, search, and message history.
- [x] ✅ **Audio TTS & Banglish Normalization**: Voice synthesis with Banglish phonetic normalization support in `src/utils/banglishVoiceNormalizer.ts`.
- [x] ✅ **Error Boundary & Resilience**: `ErrorBoundary` and `selfHealingSystem` wrapper to handle rendering or runtime network anomalies.
- [ ] 🔄 **Bundle Size Optimization**: Vite production build produces chunks over 500 kB; dynamic imports and code splitting recommended.

### 6. Render Production Deployment
- [x] ✅ **Render Blueprint** (`render.yaml`): Multi-stage Docker deployment configuration targeting the Singapore region on the free plan.
- [x] ✅ **Dockerfile**: Multi-stage Node 22 slim container building Vite and esbuild, running production on port 8080.
- [x] ✅ **Health Check Endpoint**: Configured at `/api/health` to verify container readiness before routing traffic.
- [x] ✅ **GitHub Actions CI** (`.github/workflows/ci.yml`): Node 22 CI pipeline verifying `npm run lint` and `npm run build` on push and PR.

### 7. APK / Android
- [x] ✅ **Capacitor 8 Configuration** (`capacitor.config.ts`): App ID `com.karishma.ai` targeting the `android/` project.
- [x] ✅ **Dynamic Backend URL**: `.env.android` sets `VITE_API_BASE=https://karishma-ai-chatbot.onrender.com` so the APK connects to the deployed Render backend.
- [x] ✅ **Capacitor Native Plugins**: App, Status Bar, Keyboard, and Toast plugins integrated.
- [ ] ⬜ **Final APK Compilation & Verification**: Assemble and test debug APK (`npm run apk:debug`) against the deployed production backend.

### 8. Code & Dependency Cleanup
- [x] ✅ **Tracked Backup Removal**: Untracked legacy backup files (`src/App.tsx.backup*`, `server_backup.ts`, `.self_repair_backups/`).
- [ ] 🔄 **Root Scripts & Scratch Audit**: Dozens of historical patch scripts (`patch_*.py`, `fix_*.py`) and text snapshots in root remain to be safely archived or removed.
- [ ] 🔄 **Unused Dependency Pruning**: Evaluate and prune unreferenced dependencies (e.g. `@cloudflare/containers`).
- [ ] 🔄 **Deprecate Unused Firebase Code**: Fully transition conversation history and user storage to Supabase so obsolete client Firebase calls can be eliminated safely.

### 9. Final Testing
- [x] ✅ **Build & Lint Verification**: `tsc --noEmit` and `npm run build` passing with zero errors.
- [x] ✅ **Secret Scan Verification**: Verified zero API keys committed in git-tracked files.
- [ ] ⬜ **End-to-End Web Production Test**: Verify chat completion, guest mode, and authentication flows on the deployed Render instance.
- [ ] ⬜ **End-to-End Android APK Test**: Verify connectivity and conversation sync on a physical Android device.
