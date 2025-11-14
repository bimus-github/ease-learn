create table if not exists login_nonces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  nonce text not null unique,
  redirect_path text,
  telegram_user_id bigint,
  expires_at timestamptz not null default now() + interval '2 minutes',
  consumed_at timestamptz,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists login_nonces_tenant_idx on login_nonces (tenant_id);
create index if not exists login_nonces_expires_idx on login_nonces (expires_at);


