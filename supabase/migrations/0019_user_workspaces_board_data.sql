alter table if exists user_workspaces
  add column if not exists data jsonb not null default '{}'::jsonb;
