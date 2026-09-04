# DO_NOT_CHANGE

- **`firebase-applet-config.json`** (repo root): must stay committed. It is a Firebase *web* config
  (public identifiers, not a secret) and is imported by `server.ts` and `src/lib/firebase.ts`.
  Deleting it broke the Render build once already (2026-09-04).
- **Render env var names**: `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `GLM_API_KEY`, `BREVO_API_KEY`,
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`. Code and dashboard must stay in sync.
- **Provider fallback order & classification** in `server.ts` (`retryApiCall`,
  `getOpenRouterCandidateModels`): accurate error categories (auth/credits/rate-limit/timeout) —
  do not collapse them into "out of credits".
- **Hosted-key guard** (`isTrustedClientOrigin` + `PROVIDER_SPENDING_ROUTES`): stops anonymous
  third parties from spending the owner's provider credits. Do not weaken or bypass.
- **`sanitizeSecrets()`**: every error path that can echo provider output must pass through it.
- **Guest mode & OTP auth flows** in `src/App.tsx` and `/api/auth/*`.
- **devOnlyGate**: `/api/self-repair/*` and `/api/test/*` must stay 404-gated in production
  (keep `SELF_REPAIR_TOKEN` unset on Render).
- **Rate limits** on `/api/chat`, `/api/tts`, `/api/generate-image`, `/api/transform-illustration`,
  `/api/auth/*` — they protect a 512MB free instance.
