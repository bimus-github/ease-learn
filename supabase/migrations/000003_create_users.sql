-- Create user role enum
create type user_role as enum (
  'teacher',
  'student',
  'platform_admin'
);

-- Create user status enum
create type user_status as enum (
  'active',
  'suspended',
  'deleted',
  'pending_verification'
);

-- Create users table (extends Supabase auth.users)
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  
  -- Core identification
  role user_role not null,
  tenant_id uuid references tenants(id) on delete set null,
  
  -- Telegram integration (for students)
  telegram_user_id bigint,
  telegram_username text,
  
  -- Status & lifecycle
  status user_status not null default 'active',
  suspended_at timestamptz,
  suspended_reason text,
  deleted_at timestamptz,
  email_verified boolean not null default false,
  email_verified_at timestamptz,
  
  -- Authentication & security
  mfa_enabled boolean not null default false,
  mfa_enabled_at timestamptz,
  last_login_at timestamptz,
  
  -- Profile (JSONB for flexible structure)
  profile jsonb not null default '{}'::jsonb,
  display_name text,
  avatar_url text,
  phone_number text,
  bio text,
  
  -- Preferences (JSONB)
  notification_preferences jsonb not null default '{
    "email_enabled": true,
    "telegram_enabled": true,
    "course_updates": true,
    "announcements": true,
    "quiz_results": true,
    "enrollment_notifications": true
  }'::jsonb,
  
  -- Student-specific (cached counts)
  enrollment_count integer not null default 0,
  completed_courses_count integer not null default 0,
  total_watch_time_seconds bigint not null default 0,
  last_activity_at timestamptz,
  
  -- Teacher-specific
  tenant_owner_id uuid references tenants(id) on delete set null,
  invite_token text,
  invite_token_expires_at timestamptz,
  
  -- Metadata
  metadata jsonb not null default '{}'::jsonb,
  admin_notes text,
  tags text[] not null default '{}',
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Constraints
  constraint telegram_username_format check (
    telegram_username is null or telegram_username ~ '^@?[a-zA-Z0-9_]{5,32}$'
  ),
  constraint display_name_length check (
    display_name is null or length(display_name) <= 100
  ),
  constraint bio_length check (
    bio is null or length(bio) <= 500
  ),
  constraint phone_number_format check (
    phone_number is null or phone_number ~ '^\+?[1-9]\d{1,14}$'
  ),
  constraint avatar_url_format check (
    avatar_url is null or avatar_url ~ '^https?://.+'
  ),
  constraint enrollment_count_nonnegative check (
    enrollment_count >= 0
  ),
  constraint completed_courses_count_nonnegative check (
    completed_courses_count >= 0
  ),
  constraint total_watch_time_seconds_nonnegative check (
    total_watch_time_seconds >= 0
  ),
  constraint telegram_user_id_positive check (
    telegram_user_id is null or telegram_user_id > 0
  )
);

-- Indexes for users table
create index if not exists users_tenant_id_idx on users (tenant_id) where tenant_id is not null;
-- Unique index for telegram_user_id per tenant (partial unique index)
create unique index if not exists users_unique_telegram_user_per_tenant 
  on users (telegram_user_id, tenant_id) 
  where telegram_user_id is not null and tenant_id is not null;
create index if not exists users_role_idx on users (role);
create index if not exists users_status_idx on users (status);
create index if not exists users_telegram_user_id_idx on users (telegram_user_id) where telegram_user_id is not null;
create index if not exists users_telegram_username_idx on users (telegram_username) where telegram_username is not null;
create index if not exists users_tenant_owner_id_idx on users (tenant_owner_id) where tenant_owner_id is not null;
create index if not exists users_invite_token_idx on users (invite_token) where invite_token is not null;
create index if not exists users_email_verified_idx on users (email_verified) where email_verified = false;
create index if not exists users_created_at_idx on users (created_at);
create index if not exists users_deleted_at_idx on users (deleted_at) where deleted_at is not null;
create index if not exists users_last_activity_at_idx on users (last_activity_at) where last_activity_at is not null;
-- Composite index for tenant + role queries
create index if not exists users_tenant_role_idx on users (tenant_id, role) where tenant_id is not null;
-- Composite index for student activity tracking
create index if not exists users_tenant_status_idx on users (tenant_id, status) where tenant_id is not null and role = 'student';
-- GIN index for tags array searches
create index if not exists users_tags_idx on users using gin (tags);
-- GIN index for JSONB profile searches
create index if not exists users_profile_idx on users using gin (profile);
-- GIN index for JSONB metadata searches
create index if not exists users_metadata_idx on users using gin (metadata);

-- Trigger to update updated_at timestamp
create or replace function update_users_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at_trigger
  before update on users
  for each row
  execute function update_users_updated_at();

-- Trigger to sync email_verified from auth.users
create or replace function sync_user_email_verified()
returns trigger as $$
begin
  -- Update users.email_verified when auth.users.email_confirmed_at changes
  if (old.email_confirmed_at is null and new.email_confirmed_at is not null) then
    update users
    set email_verified = true,
        email_verified_at = new.email_confirmed_at
    where id = new.id;
  elsif (old.email_confirmed_at is not null and new.email_confirmed_at is null) then
    update users
    set email_verified = false,
        email_verified_at = null
    where id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Note: This trigger would need to be created on auth.users, which requires superuser privileges
-- For now, this is documented here but may need to be set up via Supabase dashboard or admin API
-- create trigger sync_email_verified_trigger
--   after update on auth.users
--   for each row
--   when (old.email_confirmed_at is distinct from new.email_confirmed_at)
--   execute function sync_user_email_verified();

-- Comments on table and columns
comment on table users is 'Platform users extending Supabase auth.users with role, tenant, and profile data';
comment on column users.id is 'References auth.users(id) - primary key from Supabase auth';
comment on column users.role is 'User role: teacher, student, or platform_admin';
comment on column users.tenant_id is 'Reference to tenant organization (nullable for platform_admin)';
comment on column users.telegram_user_id is 'Telegram user ID for student authentication via Telegram';
comment on column users.telegram_username is 'Telegram username (format: @username or username)';
comment on column users.status is 'User account status';
comment on column users.profile is 'JSONB object containing flexible profile data (display_name, avatar_url, phone_number, bio, company, website, social_links)';
comment on column users.notification_preferences is 'JSONB object containing user notification preferences';
comment on column users.enrollment_count is 'Cached count of course enrollments (denormalized for performance)';
comment on column users.completed_courses_count is 'Cached count of completed courses (denormalized for performance)';
comment on column users.total_watch_time_seconds is 'Cached total watch time in seconds (denormalized for performance)';
comment on column users.tenant_owner_id is 'Reference to tenant owned by this teacher user';
comment on column users.invite_token is 'Token for teacher invitation flow';
comment on column users.metadata is 'Flexible key-value storage for additional user data';
comment on column users.tags is 'Array of tags for categorizing/filtering users';

