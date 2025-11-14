-- Create tenant status enum
create type tenant_status as enum (
  'active',
  'suspended',
  'archived',
  'trial'
);

-- Create plan type enum
create type plan_type as enum (
  'free',
  'trial',
  'paid',
  'enterprise'
);

-- Create subscription status enum
create type subscription_status as enum (
  'active',
  'cancelled',
  'past_due',
  'trialing'
);

-- Create tenants table
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  subdomain text not null unique,
  custom_domain text,
  teacher_owner_id uuid not null references auth.users(id) on delete restrict,
  status tenant_status not null default 'active',
  suspended_at timestamptz,
  suspended_reason text,
  deleted_at timestamptz,
  
  -- Branding & customization (JSONB)
  branding jsonb not null default '{}'::jsonb,
  
  -- Subscription & billing
  plan_type plan_type not null default 'free',
  subscription_status subscription_status,
  trial_ends_at timestamptz,
  billing_email text,
  stripe_customer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  
  -- Limits & quotas
  max_students integer,
  max_courses integer,
  max_storage_gb integer,
  
  -- Analytics (cached counts)
  last_active_at timestamptz,
  total_students_count integer not null default 0,
  total_courses_count integer not null default 0,
  storage_used_bytes bigint not null default 0,
  
  -- Metadata
  metadata jsonb not null default '{}'::jsonb,
  admin_notes text,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Constraints
  constraint subdomain_format check (
    subdomain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
  ),
  constraint custom_domain_format check (
    custom_domain is null or custom_domain ~ '^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$'
  ),
  constraint billing_email_format check (
    billing_email is null or billing_email ~ '^[^@]+@[^@]+\.[^@]+$'
  ),
  constraint max_students_positive check (
    max_students is null or max_students > 0
  ),
  constraint max_courses_positive check (
    max_courses is null or max_courses > 0
  ),
  constraint max_storage_gb_positive check (
    max_storage_gb is null or max_storage_gb > 0
  ),
  constraint total_students_count_nonnegative check (
    total_students_count >= 0
  ),
  constraint total_courses_count_nonnegative check (
    total_courses_count >= 0
  ),
  constraint storage_used_bytes_nonnegative check (
    storage_used_bytes >= 0
  )
);

-- Indexes for tenants table
create index if not exists tenants_subdomain_idx on tenants (subdomain);
create index if not exists tenants_custom_domain_idx on tenants (custom_domain) where custom_domain is not null;
create index if not exists tenants_teacher_owner_id_idx on tenants (teacher_owner_id);
create index if not exists tenants_status_idx on tenants (status);
create index if not exists tenants_plan_type_idx on tenants (plan_type);
create index if not exists tenants_subscription_status_idx on tenants (subscription_status) where subscription_status is not null;
create index if not exists tenants_created_at_idx on tenants (created_at);
create index if not exists tenants_deleted_at_idx on tenants (deleted_at) where deleted_at is not null;

-- Trigger to update updated_at timestamp
create or replace function update_tenants_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tenants_updated_at_trigger
  before update on tenants
  for each row
  execute function update_tenants_updated_at();

-- Comment on table
comment on table tenants is 'Multi-tenant organizations/workspaces in the platform';
comment on column tenants.subdomain is 'Unique subdomain identifier (lowercase alphanumeric with hyphens)';
comment on column tenants.custom_domain is 'Optional custom domain for the tenant';
comment on column tenants.teacher_owner_id is 'Reference to the teacher user who owns this tenant';
comment on column tenants.branding is 'JSONB object containing logo, name, description, and entry_content';
comment on column tenants.metadata is 'Flexible key-value storage for additional tenant data';
comment on column tenants.total_students_count is 'Cached count of total students (denormalized for performance)';
comment on column tenants.total_courses_count is 'Cached count of total courses (denormalized for performance)';
comment on column tenants.storage_used_bytes is 'Cached count of storage used in bytes (denormalized for performance)';

