-- Tenant invite infrastructure to support email-based onboarding links.
-- Captures lifecycle state, metadata, and auditing fields.

-- Enum for invite status values keeps state transitions constrained.
create type tenant_invite_status as enum (
  'pending',
  'claimed',
  'revoked',
  'expired'
);

create table if not exists tenant_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  status tenant_invite_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '7 days'),
  issued_by uuid not null references auth.users(id) on delete restrict,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint email_format check (
    email ~ '^[^@]+@[^@]+\.[^@]+$'
  ),
  constraint expires_future check (
    expires_at > created_at
  ),
  constraint claimed_requires_pending check (
    status <> 'claimed' or claimed_at is not null
  )
);

create index if not exists tenant_invites_status_idx on tenant_invites (status);
create index if not exists tenant_invites_expiry_idx on tenant_invites (expires_at) where status = 'pending';

create or replace function update_tenant_invites_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tenant_invites_updated_at_trigger
  before update on tenant_invites
  for each row
  execute function update_tenant_invites_updated_at();

comment on table tenant_invites is 'Platform-level invites that provision new tenant workspaces via emailed links.';
comment on column tenant_invites.email is 'Recipient email address receiving the invite link.';
comment on column tenant_invites.token_hash is 'SHA-256 token hash; raw token only exists in email.';
comment on column tenant_invites.metadata is 'JSONB bag for plan defaults, suggested subdomain, notes.';
comment on column tenant_invites.expires_at is 'Timestamp after which the invite is considered invalid.';
comment on column tenant_invites.issued_by is 'Admin user who generated the invite.';
comment on column tenant_invites.claimed_at is 'When the invite was redeemed and tenant created.';

