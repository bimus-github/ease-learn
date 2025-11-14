-- Create login_nonces table for Telegram authentication flow
-- Stores nonces for student login handshakes with tenant scoping, session tokens, and rate limiting

create table if not exists login_nonces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nonce text not null unique,
  redirect_path text,
  telegram_user_id bigint,
  expires_at timestamptz not null default now() + interval '2 minutes',
  consumed_at timestamptz,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Session tokens stored after Telegram approval
  session_access_token text,
  session_refresh_token text,
  session_expires_at timestamptz,
  session_token_type text,
  -- Client IP for rate limiting
  client_ip text
);

-- Indexes for performance
create index if not exists login_nonces_tenant_idx on login_nonces (tenant_id);
create index if not exists login_nonces_expires_idx on login_nonces (expires_at);
-- Composite index for rate limiting queries (only unconsumed nonces)
create index if not exists login_nonces_client_ip_idx 
on login_nonces (tenant_id, client_ip, inserted_at)
where consumed_at is null;
