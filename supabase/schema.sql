-- Supabase Database Schema for Karishma AI Chatbot
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT,
  session_tokens JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);

-- 2. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Chat',
  mode TEXT NOT NULL DEFAULT 'default',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying a user's conversations ordered by last update
CREATE INDEX IF NOT EXISTS conversations_user_updated_idx
  ON public.conversations (user_id, updated_at DESC);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  conversation_id TEXT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'model')),
  content TEXT NOT NULL,
  client_timestamp TEXT,
  is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  citations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, id)
);

-- Index for fetching messages for a conversation in chronological order
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at ASC);

-- 4. Security: Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. Service Role Policies (Backend operations using SUPABASE_SERVICE_ROLE_KEY)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Service role full access on users'
  ) THEN
    CREATE POLICY "Service role full access on users"
      ON public.users FOR ALL
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Service role full access on conversations'
  ) THEN
    CREATE POLICY "Service role full access on conversations"
      ON public.conversations FOR ALL
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Service role full access on messages'
  ) THEN
    CREATE POLICY "Service role full access on messages"
      ON public.messages FOR ALL
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;
END $$;

-- 6. Pending OTP / password-reset codes
--
-- Replaces the in-memory Map that used to hold these in the Node process, which
-- lost every pending signup on restart, redeploy, or idle sleep.
-- Full commentary in supabase/migrations/202609040001_create_auth_otps.sql.
CREATE TABLE IF NOT EXISTS public.auth_otps (
  email              TEXT PRIMARY KEY,
  hashed_otp         TEXT NOT NULL,
  expires_at         TIMESTAMPTZ NOT NULL,
  resend_at          TIMESTAMPTZ NOT NULL,
  attempts           INTEGER NOT NULL DEFAULT 0,
  -- NULL marks a password-reset flow; an object marks a pending signup.
  pending_user       JSONB,
  verified_for_reset BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_otps_expires_at_idx
  ON public.auth_otps (expires_at);

-- Atomic attempt counter, so two simultaneous guesses cannot both see attempts = 4.
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

-- RLS on with NO policies: only the service-role key (backend only) can touch it.
-- Unlike the tables above, this one must never be readable by anon/authenticated --
-- it holds bcrypt hashes and pending signup payloads.
ALTER TABLE public.auth_otps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_otps FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_otp_attempts(TEXT) FROM anon, authenticated;
