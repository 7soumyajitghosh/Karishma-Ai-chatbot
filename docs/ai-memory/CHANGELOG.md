# CHANGELOG

## 2026-09-04 — Server-side provider keys, GLM primary, Render build fix
- **Fixed Render deployment failure**: restored `firebase-applet-config.json` (commit `2e2071f` deleted it
  but `server.ts:20` and `src/lib/firebase.ts:16` import it → `npm run build` failed on unresolved module).
  It is a public Firebase *web* config, not a secret; it must stay committed.
- **GLM added as optional primary provider** (`server.ts`): activates only when `GLM_API_KEY` is set in the
  server env. Env vars: `GLM_API_KEY`, optional `GLM_BASE_URL` (default `https://api.z.ai/api/paas/v4`),
  optional `GLM_MODEL` (default `glm-4.6`). Server-side only.
- **Settings UI**: removed the "Google Gemini API Key" / "OpenRouter API Key" inputs and their
  localStorage save/clear handlers (`src/App.tsx`). Replaced with an "AI Provider Status" card fed by
  `GET /api/health` (booleans only: "Server configured" / "Not configured").
- **/api/health**: now also reports `configured.glm`.
- **Error messages**: `/api/chat` exhaustion message no longer tells users to enter API keys;
  `sanitizeSecrets()` now also redacts `GLM_API_KEY`.
- **render.yaml**: added optional `GLM_API_KEY` (sync: false).
