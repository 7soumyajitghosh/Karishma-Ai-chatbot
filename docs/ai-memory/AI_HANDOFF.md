# AI_HANDOFF — read this first

Karishma is a React (Vite) chat app with the Express backend in `server.ts` (single file, ~2800 lines).
One container serves both: `GET /api/*` → Express, `GET /*` → built `dist/` SPA. Deployed on Render
(free, Docker runtime) via `render.yaml` blueprint + `Dockerfile`. Build = `vite build` + `esbuild server.ts`.

## Non-negotiable rules
- AI provider keys are SERVER-side only (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`, optional `GLM_API_KEY`).
  Never in `NEXT_PUBLIC_*`/`VITE_*` vars, never returned by an API, never printed in logs.
- The frontend never requires the user to enter an API key. Settings shows provider status only
  (booleans from `GET /api/health`).
- `firebase-applet-config.json` (repo root) is a Firebase *web* config — public by design, NOT a secret.
  It MUST stay committed: `server.ts` and `src/lib/firebase.ts` import it. Deleting it breaks the build
  (this caused the 2026-09-04 Render outage).
- Do not rename Render env vars. Do not break Guest Mode, OTP auth, Brevo, or Supabase flows.

## Key map
- Chat route: `POST /api/chat` in `server.ts`. Provider order: GLM (if `GLM_API_KEY`) → OpenRouter
  (default Nemotron) → Gemini (or first if a Gemini model is requested) → Pollinations (keyless).
- Frontend chat client: `src/lib/selfHealing.ts` (`selfHealChatCall`). Main UI: `src/App.tsx`.
- Health/config probe: `GET /api/health` — booleans only, safe to open in a browser.
- Hosted-key guard: `/api/chat`, `/api/tts`, `/api/generate-image`, `/api/transform-illustration`
  require a trusted Origin (web app itself or Capacitor WebView) unless the caller supplies their own key.
- `docs/ai-memory/*.md` — project memory. Update CHANGELOG/AI_TASK_LOG when you change things.
