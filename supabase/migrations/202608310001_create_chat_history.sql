create table if not exists public.conversations (
  id text primary key,
  user_id text not null,
  title text not null default 'Chat',
  mode text not null default 'default',
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

create table if not exists public.messages (
  conversation_id text not null references public.conversations(id) on delete cascade,
  id text not null,
  role text not null check (role in ('user', 'assistant', 'system', 'model')),
  content text not null,
  client_timestamp text,
  is_encrypted boolean not null default false,
  citations jsonb,
  created_at timestamptz not null default now(),
  primary key (conversation_id, id)
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
