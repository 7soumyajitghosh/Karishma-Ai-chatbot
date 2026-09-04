# ENVIRONMENT

All provider/infra secrets are SERVER-side Render env vars (dashboard or render.yaml `sync: false`).
Never commit them; never prefix them with `NEXT_PUBLIC_`/`VITE_`.

| Variable | Required | Used for |
|---|---|---|
| `GEMINI_API_KEY` | yes (chat/image fallback) | Google Gemini via `@google/genai` (server.ts) |
| `OPENROUTER_API_KEY` | yes (default chat path) | OpenRouter via OpenAI SDK (server.ts) |
| `GLM_API_KEY` | optional | GLM primary provider (Z.ai). Absent = skipped cleanly |
| `GLM_BASE_URL` | optional | Default `https://api.z.ai/api/paas/v4` |
| `GLM_MODEL` | optional | Default `glm-4.6` |
| `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` | yes (OTP email) | Brevo transactional email |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | yes | Chat history, users, durable OTP store |
| `APP_URL` | recommended | Public URL; used for OpenRouter referer + hosted-key guard |
| `POLLINATIONS_API_KEY` | optional | Higher-quality image gen; absent = keyless tier |
| `NODE_ENV` / `PORT` | set by blueprint | `production` / `8080` |
| `SELF_REPAIR_TOKEN` | leave UNSET | Unset = dev-only routes return 404 in production |

Frontend build vars: only `VITE_API_BASE` (Android APK, `.env.android`, public URL — never a secret).

Verify at runtime: `GET /api/health` → `configured.{glm,openrouter,gemini,...}` booleans. No key values
are ever returned, logged, or echoed (`sanitizeSecrets()` in server.ts).
