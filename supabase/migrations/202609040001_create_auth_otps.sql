-- Durable OTP / password-reset store for Karishma AI.
--
-- Run this in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/_/sql
--
-- Replaces the in-memory Map that used to hold pending signups and password
-- resets in the Node process. That Map was lost on every restart, redeploy, and
-- idle sleep, which stranded anyone mid-signup.

-- ------------------------------------------------------------------
-- 1. Table
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_otps (
  -- One pending code per address. Always stored lowercase and trimmed.
  email              TEXT PRIMARY KEY,

  -- bcrypt hash of the 6-digit code. The plaintext code is emailed and never
  -- persisted, so a dump of this table does not yield usable codes.
  hashed_otp         TEXT NOT NULL,

  expires_at         TIMESTAMPTZ NOT NULL,

  -- Earliest time a replacement code may be requested (resend cooldown).
  resend_at          TIMESTAMPTZ NOT NULL,

  -- Failed verification attempts. The server rejects at 5.
  attempts           INTEGER NOT NULL DEFAULT 0,

  -- The signup payload awaiting verification. NULL marks a password-reset flow;
  -- server.ts branches on this being NULL, so do not default it to '{}'.
  pending_user       JSONB,

  -- Set once a reset code has been checked, so reset-password can skip re-checking.
  verified_for_reset BOOLEAN NOT NULL DEFAULT FALSE,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supports the hourly purge of stale rows.
CREATE INDEX IF NOT EXISTS auth_otps_expires_at_idx
  ON public.auth_otps (expires_at);

-- ------------------------------------------------------------------
-- 2. Atomic attempt counter
-- ------------------------------------------------------------------
-- Done in SQL rather than read-modify-write from Node so two simultaneous guesses
-- cannot both observe attempts = 4 and slip past the limit.
CREATE OR REPLACE FUNCTION public.increment_otp_attempts(p_email TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.auth_otps
     SET attempts = attempts + 1
   WHERE email = p_email
  RETURNING attempts INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

-- ------------------------------------------------------------------
-- 3. Security
-- ------------------------------------------------------------------
-- RLS on with NO policies: the table is unreachable by the anon and authenticated
-- roles. Only the service-role key (which bypasses RLS, and is held solely by the
-- backend) can read or write it. This matters more here than for other tables --
-- read access would expose bcrypt hashes and pending signup payloads.
ALTER TABLE public.auth_otps ENABLE ROW LEVEL SECURITY;

-- Make sure the client-facing roles cannot reach it even if RLS is later relaxed.
REVOKE ALL ON public.auth_otps FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_otp_attempts(TEXT) FROM anon, authenticated;
