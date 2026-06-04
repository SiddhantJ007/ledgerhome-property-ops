create table if not exists user_workspaces (
  id uuid primary key references user_profiles(id) on delete cascade,
  title text not null default 'Workspace',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on table user_workspaces to authenticated;

alter table user_workspaces enable row level security;

drop policy if exists "user workspaces self select" on user_workspaces;
create policy "user workspaces self select"
on user_workspaces
for select
to authenticated
using (id = auth.uid());

drop policy if exists "user workspaces self insert" on user_workspaces;
create policy "user workspaces self insert"
on user_workspaces
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "user workspaces self update" on user_workspaces;
create policy "user workspaces self update"
on user_workspaces
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
