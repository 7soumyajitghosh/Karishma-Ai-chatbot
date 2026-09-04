# NEXT_STEPS

1. **(Owner, Render dashboard)** Confirm `GEMINI_API_KEY` and `OPENROUTER_API_KEY` values are set and
   non-empty. Optionally add `GLM_API_KEY` (plus `GLM_BASE_URL`/`GLM_MODEL` if non-default) to make GLM
   the primary provider. Verify with `GET /api/health` → `configured.*` should be `true`.
2. If OpenRouter returns 402 (insufficient credits), either top up or rely on Gemini/GLM fallback;
   check Render logs for the classified error category, not just "out of credits".
3. Consider trimming the 1.1 MB main JS bundle (code-split `src/App.tsx`) — build warns about chunk size.
4. Remaining root-level clutter (dozens of one-off `patch_*.py` / `test_*.cjs` scripts, `.backup` files)
   could be archived into `scripts/archive/` — cosmetic, no urgency.
5. Keep `docs/ai-memory/` updated: CHANGELOG + AI_TASK_LOG on every meaningful change; KNOWN_ISSUES as
   they are found/resolved.
