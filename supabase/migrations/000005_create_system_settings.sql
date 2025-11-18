-- Create system_settings table for platform-wide configuration
-- Used for storing system settings, feature flags, and branding defaults

create table if not exists system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for updated_at to support queries by modification time
create index if not exists system_settings_updated_at_idx on system_settings (updated_at);

-- Comments
comment on table system_settings is 'Platform-wide system settings, feature flags, and branding defaults';
comment on column system_settings.key is 'Unique key identifying the setting group (e.g., system_config, feature_flags, branding_defaults)';
comment on column system_settings.value is 'JSONB object containing the actual settings data';
comment on column system_settings.created_at is 'Timestamp when the setting was first created';
comment on column system_settings.updated_at is 'Timestamp when the setting was last updated';

-- Function to automatically update updated_at timestamp
create or replace function update_system_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at on row updates
create trigger update_system_settings_updated_at_trigger
  before update on system_settings
  for each row
  execute function update_system_settings_updated_at();

