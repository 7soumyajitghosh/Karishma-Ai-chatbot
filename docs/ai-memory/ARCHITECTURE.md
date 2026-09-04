# ARCHITECTURE

```
Browser / Android WebView
  │  POST /api/chat  (no API keys from client)
  ▼
Express (server.ts)
  ├─ hosted-key guard (trusted Origin or caller-supplied BYOK header)
  ├─ rate limit (per-IP buckets)
  ▼ provider order:
  ├─ 0. GLM          (OpenAI SDK → GLM_BASE_URL, default https://api.z.ai/api/paas/v4, model GLM_MODEL/glm-4.6)
  │     skipped if a Gemini model was explicitly requested or message has an image attachment
  ├─ 1. OpenRouter   (OpenAI SDK, model candidates via getOpenRouterCandidateModels)
  ├─ 2. Gemini       (@google/genai, generateChatWithGemini)
  └─ 3. Pollinations (keyless, last resort)
```

- `resolveApiKeys()` (server.ts): caller-supplied key (header `x-gemini-api-key` / `x-openrouter-api-key`
  or body field) overrides env key; falls back to `GEMINI_API_KEY` / `OPENROUTER_API_KEY` env vars.
- `retryApiCall()`: classifies errors (auth / credits / rate limit / timeout) — never prints key material
  (`sanitizeSecrets()` redacts env keys from any logged or returned string).
- `GET /api/health`: `{ configured: { supabase, brevo, glm, openrouter, gemini } }` — booleans only.
- Frontend: `src/lib/selfHealing.ts` wraps chat/image calls with model fallback + logging.
  Settings → "AI Provider Status" reads `/api/health`. No API-key inputs anywhere in the UI.
- Dev-only routes (`/api/self-repair/*`, `/api/test/*`) are 404-gated in production (see `devOnlyGate`).
