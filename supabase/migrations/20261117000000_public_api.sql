-- C3.3 — Public REST API support tables
-- api_keys: stores hashed API keys with workspace ownership
-- api_rate_limits: sliding window rate-limit log (auto-pruned by TTL)

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  name text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_keys_workspace_id_idx on api_keys (workspace_id);
create index if not exists api_keys_key_hash_idx on api_keys (key_hash);

-- Rate limit log — rows older than 1 minute are irrelevant but cleaned lazily
create table if not exists api_rate_limits (
  id bigserial primary key,
  key_id uuid not null references api_keys(id) on delete cascade,
  requested_at timestamptz not null default now()
);

create index if not exists api_rate_limits_key_requested_idx on api_rate_limits (key_id, requested_at);

-- Auto-prune rows older than 5 minutes (keeps table small)
create or replace function prune_api_rate_limits() returns trigger language plpgsql as $$
begin
  delete from api_rate_limits where requested_at < now() - interval '5 minutes';
  return new;
end;
$$;

drop trigger if exists trg_prune_api_rate_limits on api_rate_limits;
create trigger trg_prune_api_rate_limits
  after insert on api_rate_limits
  for each statement execute function prune_api_rate_limits();

-- RLS: workspace members can read their own keys (key_hash is never exposed)
alter table api_keys enable row level security;
alter table api_rate_limits enable row level security;

-- Service role bypasses RLS (Edge Function uses service role)
-- No end-user RLS policies needed here since the UI reads via service API
