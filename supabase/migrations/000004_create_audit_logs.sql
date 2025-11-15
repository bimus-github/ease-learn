-- Create audit_logs table for tracking authentication and security events
-- Used for monitoring, forensics, and compliance

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists audit_logs_tenant_id_idx on audit_logs (tenant_id) where tenant_id is not null;
create index if not exists audit_logs_actor_id_idx on audit_logs (actor_id) where actor_id is not null;
create index if not exists audit_logs_action_idx on audit_logs (action);
create index if not exists audit_logs_created_at_idx on audit_logs (created_at);
-- Composite index for tenant-based queries
create index if not exists audit_logs_tenant_created_idx on audit_logs (tenant_id, created_at) where tenant_id is not null;
-- Composite index for actor-based queries
create index if not exists audit_logs_actor_created_idx on audit_logs (actor_id, created_at) where actor_id is not null;
-- Index for resource lookups
create index if not exists audit_logs_resource_idx on audit_logs (resource_type, resource_id) where resource_type is not null and resource_id is not null;

-- Comments
comment on table audit_logs is 'Audit log for tracking authentication events, security actions, and system changes';
comment on column audit_logs.tenant_id is 'Tenant organization ID (nullable for platform-level events)';
comment on column audit_logs.actor_id is 'User ID who performed the action (nullable for system events)';
comment on column audit_logs.action is 'Action type (e.g., telegram_login_attempt, telegram_login_success, telegram_login_failure)';
comment on column audit_logs.resource_type is 'Type of resource affected (e.g., login_nonce, user, tenant)';
comment on column audit_logs.resource_id is 'ID of the resource affected';
comment on column audit_logs.payload is 'JSONB object containing flexible metadata (IP, user agent, error details, etc.)';
comment on column audit_logs.created_at is 'Timestamp when the event occurred';

