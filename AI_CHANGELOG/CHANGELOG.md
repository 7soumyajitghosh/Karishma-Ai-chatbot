# Karishma AI — Modification Changelog

This changelog records all meaningful modifications made by AI agents working on the Karishma AI codebase.

---

## 2026-09-04

Agent/Task: Fix Browser White-Screen Crash (Firebase Auth Invalid API Key)
Files Modified:
- `src/lib/firebase.ts`
What Changed:
Wrapped `getAuth(app)` in a safe initialization helper `createAuthSafely()` that returns `null` when `apiKey` is empty or unconfigured. Guarded `ensureFirebaseAuth()` and `handleFirestoreError()` against `null` auth references.
Why:
When `apiKey: ""` was set in `firebase-applet-config.json`, evaluating `getAuth(app)` at module scope threw an uncaught `Firebase: Error (auth/invalid-api-key)` exception during bundle execution in the browser. This halted script execution before React mounted into `<div id="root"></div>`, producing a completely blank white screen.
Problem Solved:
Completely eliminated the browser white screen. The React chat application now loads, mounts, and renders immediately.
Verification:
Tested `npm run build` and verified the new production bundle (`index-BduTomBB.js`) is served cleanly on `http://localhost:3000` with HTTP 200.

---

## 2026-09-04

Agent/Task: Initialize AI_CHANGELOG Documentation System
Files Modified:
- `AI_CHANGELOG/ROADMAP.md`
- `AI_CHANGELOG/CURRENT_STATE.md`
- `AI_CHANGELOG/CHANGELOG.md`
- `AI_CHANGELOG/AGENT_RULES.md`
- `AI_CHANGELOG/ARCHITECTURE.md`
What Changed:
Created permanent memory documentation suite outlining current project architecture, roadmap, state, agent guidelines, and known issues.
Why:
Ensure all future AI agents have accurate context, understand non-negotiable architectural rules, and do not break functionality.
Problem Solved:
Prevents regressions, duplicate work, and accidental removal of critical configurations.
Verification:
Files created and checked against actual repository contents.

---

## 2026-09-04

Agent/Task: Sanitize Exposed API Keys, Clean Backups, Fix CI, and Install Strix
Files Modified:
- `firebase-applet-config.json`
- `src/lib/firebase.ts`
- `server.ts`
- `utils/supabase/client.ts`
- `utils/supabase/middleware.ts`
- `utils/supabase/server.ts`
- `.gitignore`
- `package.json`
- `.github/workflows/ci.yml` (replaced `deno.yml`)
What Changed:
Removed hardcoded Google API key from `firebase-applet-config.json` and fallback tokens from Supabase utility files. Configured dynamic runtime env var loading for Firebase. Untracked backup files (`src/App.tsx.backup*`, `server_backup.ts`, `.self_repair_backups/`). Replaced incompatible Deno CI workflow with Node 22 build/lint CI. Added Strix security scanner CLI to PATH and npm scripts.
Why:
Prevent credential leakage, resolve scanner warnings, fix broken CI pipeline, and provide security scanning capabilities.
Problem Solved:
Eliminated repository secret leaks, stopped failing Deno CI builds, and enabled Strix scanner.
Verification:
Secret scanner verified 0 exposed secrets across 343 tracked files. `npm run lint` and `npm run build` completed with exit code 0. `strix --version` confirmed 1.5.3.

---

## 2026-09-04

Agent/Task: Migrate AI Provider Keys Server-Side, Add GLM, and Fix Render Deployment
Files Modified:
- `server.ts`
- `src/App.tsx`
- `render.yaml`
- `docs/ai-memory/*`
What Changed:
Moved all AI provider key handling strictly to backend environment variables. Added GLM as an optional primary chat provider via OpenAI-compatible endpoint. Removed manual API key input fields from the user settings modal and replaced with a read-only provider status indicator fed by `GET /api/health`. Restored `firebase-applet-config.json` module import to resolve Render build failure.
Why:
Improve security by never requiring or storing user API keys in browser localStorage, add model flexibility, and repair the production build.
Problem Solved:
Prevented client key leakage and resolved Render build failure caused by missing imported config.
Verification:
`npm run build` succeeded; `GET /api/health` confirmed reporting provider statuses.
