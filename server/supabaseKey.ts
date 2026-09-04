/**
 * One place that decides which Supabase credentials the server uses.
 *
 * Every table this server touches -- users, conversations, messages, auth_otps --
 * has RLS enabled and is reachable only by the service role (see
 * supabase/schema.sql: service-role-only policies, plus an explicit
 * `REVOKE ALL ON public.auth_otps FROM anon, authenticated`).
 *
 * So an anon / publishable key cannot read or write any of them. That matters
 * because the env lists in otpStore.ts and supabaseHistory.ts used to fall back
 * to SUPABASE_ANON_KEY and SUPABASE_PUBLISHABLE_KEY. With one of those set, the
 * "is Supabase configured" checks returned true and /api/health reported
 * `otpStore: "supabase"`, while in reality every query failed with "permission
 * denied", getOtp() turned that into null, and the user was told "No pending
 * verification found" for a code that had been stored correctly.
 *
 * Publishable keys are therefore no longer accepted, and a key of the wrong
 * shape is reported once at boot rather than as a per-request mystery.
 */

export interface SupabaseCredentials {
  url?: string;
  key?: string;
}

export function readSupabaseCredentials(): SupabaseCredentials {
  return {
    url:
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL,
    // Deliberately no anon/publishable fallback -- see the note above.
    key:
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY,
  };
}

export function hasSupabaseCredentials(): boolean {
  const { url, key } = readSupabaseCredentials();
  return Boolean(url && key);
}

/**
 * Best-effort shape check. Returns false only when the key is *recognisably*
 * a browser-safe key, so an unfamiliar format is allowed through and left to
 * fail loudly at request time rather than being blocked here.
 */
export function looksLikeServiceRoleKey(key: string): boolean {
  if (!key) return false;
  if (key.startsWith("sb_secret_")) return true;
  if (key.startsWith("sb_publishable_")) return false;

  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      if (typeof payload?.role === "string") {
        return payload.role === "service_role";
      }
    } catch {
      // Unparseable JWT: not our business to reject it.
    }
  }
  return true;
}

/** Logs once when the configured key cannot possibly satisfy the RLS policies. */
export function warnIfNotServiceRoleKey(key: string, source: string): void {
  if (looksLikeServiceRoleKey(key)) return;
  console.error(
    `[${source}] The configured Supabase key looks like a publishable/anon key. ` +
      "Every table this server uses is service-role-only under RLS, so reads and writes will " +
      "fail with permission errors. Use the service_role key from " +
      "Supabase -> Settings -> API as SUPABASE_SERVICE_ROLE_KEY."
  );
}
