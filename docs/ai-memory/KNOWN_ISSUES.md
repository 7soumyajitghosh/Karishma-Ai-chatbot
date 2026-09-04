# KNOWN_ISSUES

- **Local `.env` has empty values** for `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `BREVO_API_KEY`
  (lines present but blank). Real keys exist only in Render env vars. Local chat tests therefore
  exercise the no-key fallback path; provider-success paths are verified against production.
- **Brevo egress IP**: Brevo requires the server's outbound IPv4 to be authorized
  (https://app.brevo.com/security/authorised_ips). Render's egress IP can change; if OTP emails fail,
  check `/api/auth/brevo-status` and authorize the reported IP.
- **Free-tier cold starts**: Render free instance spins down after 15 min idle; first request waits
  ~1 min. Not an error.
- **Supabase `public.auth_otps`** table must exist (migration `supabase/migrations/202609040001_create_auth_otps.sql`);
  otherwise OTP store falls back to memory and a warning appears in the boot log.
- **GLM is inert until `GLM_API_KEY` is added on Render** (optional; fallback order handles its absence).
