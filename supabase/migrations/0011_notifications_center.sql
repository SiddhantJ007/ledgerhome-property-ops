alter table notifications
  alter column tenant_id drop not null;

alter table notifications
  add column if not exists user_profile_id uuid references user_profiles(id) on delete cascade,
  add column if not exists role_target text check (role_target in ('admin', 'tenant')),
  add column if not exists priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  add column if not exists route_target text,
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists dismissed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update notifications
set
  role_target = coalesce(role_target, 'tenant'),
  priority = coalesce(priority, 'normal'),
  updated_at = coalesce(updated_at, created_at)
where role_target is null or updated_at is null or priority is null;

create index if not exists notifications_role_target_idx on notifications (role_target);
create index if not exists notifications_user_profile_id_idx on notifications (user_profile_id);
create index if not exists notifications_read_at_idx on notifications (read_at);
create index if not exists notifications_dismissed_at_idx on notifications (dismissed_at);

drop policy if exists "tenant notifications update own" on notifications;
create policy "tenant notifications update own"
on notifications
for update
to authenticated
using (tenant_id = public.app_tenant_id())
with check (tenant_id = public.app_tenant_id());

create or replace function public.enqueue_contact_request_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.sender_role = 'tenant' then
    insert into public.notifications (
      tenant_id,
      role_target,
      type,
      title,
      body,
      priority,
      action_label,
      route_target,
      entity_type,
      entity_id
    )
    values
      (
        new.tenant_id,
        'tenant',
        'message',
        concat('Inquiry sent: ', new.subject),
        'Your inquiry was sent to the property management team.',
        'low',
        'Open contact thread',
        '/(tenant)/contact-admin',
        'contact_request',
        new.id::text
      ),
      (
        new.tenant_id,
        'admin',
        'message',
        concat('New resident inquiry: ', new.subject),
        new.message,
        'high',
        'Open tenant record',
        concat('/tenants/', new.tenant_id::text),
        'contact_request',
        new.id::text
      );
  end if;

  if tg_op = 'UPDATE'
    and new.admin_reply is not null
    and (
      old.admin_reply is distinct from new.admin_reply
      or old.responded_at is distinct from new.responded_at
    ) then
    insert into public.notifications (
      tenant_id,
      role_target,
      type,
      title,
      body,
      priority,
      action_label,
      route_target,
      entity_type,
      entity_id
    )
    values (
      new.tenant_id,
      'tenant',
      'message',
      concat('Reply received: ', new.subject),
      new.admin_reply,
      'normal',
      'Open contact thread',
      '/(tenant)/contact-admin',
      'contact_request',
      new.id::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists contact_request_notifications_trigger on contact_requests;
create trigger contact_request_notifications_trigger
after insert or update on contact_requests
for each row
execute function public.enqueue_contact_request_notifications();
