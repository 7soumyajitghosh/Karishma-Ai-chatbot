/**
 * Durable OTP / password-reset store.
 *
 * Replaces the process-local `Map` that used to live in server.ts. That Map lost
 * every pending signup and password reset on restart, which on a host that sleeps
 * when idle (Render free tier) or redeploys on push meant users mid-signup got
 * "No pending verification found" and had to start over. It also grew without
 * bound, keyed on attacker-supplied email addresses.
 *
 * Rows live in `public.auth_otps` (see supabase/schema.sql and
 * supabase/migrations/202609040001_create_auth_otps.sql). The table holds only
 * a bcrypt hash of the code -- never the code itself -- so a database leak does
 * not hand out valid OTPs.
 *
 * When Supabase is not configured the module falls back to an in-process Map so
 * `npm run dev` still works on a laptop with no credentials. The fallback logs
 * once so it is never mistaken for the durable path.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabaseCredentials, warnIfNotServiceRoleKey } from "./supabaseKey";

export interface OtpRecord {
  hashedOtp: string;
  /** epoch ms */
  expiresAt: number;
  /** epoch ms -- earliest time a new code may be requested */
  resendAt: number;
  attempts: number;
  /**
   * The signup payload waiting on verification, or `null` for a password reset.
   * server.ts distinguishes the two flows by checking `pendingUser !== null`,
   * so the null-vs-object distinction is load bearing.
   */
  pendingUser: any | null;
  verifiedForReset?: boolean;
}

const TABLE = "auth_otps";

/* ------------------------------------------------------------------ *
 * Client
 * ------------------------------------------------------------------ */

let client: SupabaseClient | null = null;
let warnedAboutFallback = false;

function readEnv(): { url?: string; key?: string } {
  return readSupabaseCredentials();
}

/**
 * `public.auth_otps` is RLS-on with zero policies and `REVOKE ALL ... FROM anon,
 * authenticated`, which is what keeps pending signups unreadable from the
 * browser. The consequence is that an anon / publishable key cannot read or
 * write this table at all: every call comes back "permission denied", getOtp
 * turns that into `null`, and the user sees "No pending verification found" for
 * a code that was really stored. readSupabaseCredentials() therefore no longer
 * accepts publishable keys, and server/supabaseKey.ts explains why.
 */

export function isOtpStoreDurable(): boolean {
  const { url, key } = readEnv();
  return Boolean(url && key);
}

function getClient(): SupabaseClient | null {
  if (client) return client;
  const { url, key } = readEnv();
  if (!url || !key) {
    if (!warnedAboutFallback) {
      warnedAboutFallback = true;
      console.warn(
        "[otpStore] Supabase is not configured, falling back to an in-memory OTP store. " +
          "Pending signups and password resets will be lost on restart. " +
          "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for durable storage."
      );
    }
    return null;
  }
  client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  warnIfNotServiceRoleKey(key, "otpStore");
  return client;
}

/* ------------------------------------------------------------------ *
 * In-process fallback (dev only)
 * ------------------------------------------------------------------ */

const memory = new Map<string, OtpRecord>();

/* ------------------------------------------------------------------ *
 * Row mapping
 * ------------------------------------------------------------------ */

interface OtpRow {
  email: string;
  hashed_otp: string;
  expires_at: string;
  resend_at: string;
  attempts: number;
  pending_user: any | null;
  verified_for_reset: boolean;
}

function rowToRecord(row: OtpRow): OtpRecord {
  return {
    hashedOtp: row.hashed_otp,
    expiresAt: new Date(row.expires_at).getTime(),
    resendAt: new Date(row.resend_at).getTime(),
    attempts: row.attempts ?? 0,
    pendingUser: row.pending_user ?? null,
    verifiedForReset: Boolean(row.verified_for_reset),
  };
}

function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

/* ------------------------------------------------------------------ *
 * Public API -- mirrors the old Map, but async
 * ------------------------------------------------------------------ */

export async function getOtp(emailRaw: string): Promise<OtpRecord | null> {
  const email = normalizeEmail(emailRaw);
  if (!email) return null;

  const db = getClient();
  if (!db) return memory.get(email) ?? null;

  const { data, error } = await db.from(TABLE).select("*").eq("email", email).maybeSingle();
  if (error) {
    console.error("[otpStore] getOtp failed:", error.message);
    // Surface as "no pending verification" rather than a 500 the user cannot act on.
    return null;
  }
  return data ? rowToRecord(data as OtpRow) : null;
}

export async function setOtp(emailRaw: string, record: OtpRecord): Promise<void> {
  const email = normalizeEmail(emailRaw);
  if (!email) return;

  const db = getClient();
  if (!db) {
    memory.set(email, record);
    return;
  }

  const { error } = await db.from(TABLE).upsert(
    {
      email,
      hashed_otp: record.hashedOtp,
      expires_at: new Date(record.expiresAt).toISOString(),
      resend_at: new Date(record.resendAt).toISOString(),
      attempts: record.attempts ?? 0,
      pending_user: record.pendingUser ?? null,
      verified_for_reset: Boolean(record.verifiedForReset),
      created_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );
  if (error) throw new Error(`Could not store verification code: ${error.message}`);
}

export async function deleteOtp(emailRaw: string): Promise<void> {
  const email = normalizeEmail(emailRaw);
  if (!email) return;

  const db = getClient();
  if (!db) {
    memory.delete(email);
    return;
  }

  const { error } = await db.from(TABLE).delete().eq("email", email);
  if (error) console.error("[otpStore] deleteOtp failed:", error.message);
}

/**
 * Increments the failed-attempt counter and returns the new value.
 *
 * Uses a Postgres function so the read-modify-write is atomic; two codes tried
 * at once cannot both see `attempts = 4` and slip past the limit of 5.
 */
export async function bumpOtpAttempts(emailRaw: string): Promise<number> {
  const email = normalizeEmail(emailRaw);
  if (!email) return 0;

  const db = getClient();
  if (!db) {
    const existing = memory.get(email);
    if (!existing) return 0;
    existing.attempts += 1;
    return existing.attempts;
  }

  const { data, error } = await db.rpc("increment_otp_attempts", { p_email: email });
  if (error) {
    console.error("[otpStore] bumpOtpAttempts failed:", error.message);
    // Fail closed on the counter rather than granting unlimited tries: report the
    // limit so the caller rejects and the user requests a fresh code.
    return 99;
  }
  return typeof data === "number" ? data : 0;
}

/** Marks a reset OTP as already verified, so /api/auth/reset-password can skip re-checking it. */
export async function markVerifiedForReset(emailRaw: string): Promise<void> {
  const email = normalizeEmail(emailRaw);
  if (!email) return;

  const db = getClient();
  if (!db) {
    const existing = memory.get(email);
    if (existing) existing.verifiedForReset = true;
    return;
  }

  const { error } = await db.from(TABLE).update({ verified_for_reset: true }).eq("email", email);
  if (error) throw new Error(`Could not confirm verification: ${error.message}`);
}

/**
 * Drops rows whose code expired more than an hour ago. Called on boot and hourly
 * so the table cannot be grown without bound by requesting codes for addresses
 * that are never verified.
 */
export async function purgeExpiredOtps(): Promise<number> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);

  const db = getClient();
  if (!db) {
    let removed = 0;
    for (const [email, record] of memory) {
      if (record.expiresAt < cutoff.getTime()) {
        memory.delete(email);
        removed++;
      }
    }
    return removed;
  }

  const { data, error } = await db.from(TABLE).delete().lt("expires_at", cutoff.toISOString()).select("email");
  if (error) {
    console.error("[otpStore] purgeExpiredOtps failed:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

/** Starts the hourly purge. Safe to call once at boot; returns the timer so tests can clear it. */
export function startOtpPurgeLoop(): NodeJS.Timeout {
  void purgeExpiredOtps().catch(() => {});
  const timer = setInterval(() => {
    void purgeExpiredOtps().catch(() => {});
  }, 60 * 60 * 1000);
  timer.unref?.();
  return timer;
}
