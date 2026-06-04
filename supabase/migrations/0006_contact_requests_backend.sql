alter table if exists contact_requests
  add column if not exists category text not null default 'general'
    check (category in ('general', 'billing', 'maintenance', 'lease')),
  add column if not exists sender_role text not null default 'tenant'
    check (sender_role in ('tenant', 'admin', 'system')),
  add column if not exists admin_reply text,
  add column if not exists responded_at timestamptz;

update contact_requests
set category = 'general'
where category is null;

update contact_requests
set sender_role = 'tenant'
where sender_role is null;

create index if not exists contact_requests_property_id_idx on contact_requests (property_id);
create index if not exists contact_requests_unit_id_idx on contact_requests (unit_id);
create index if not exists contact_requests_status_idx on contact_requests (status);
create index if not exists contact_requests_sent_at_idx on contact_requests (sent_at desc);

grant select, insert, update on table contact_requests to anon, authenticated;
