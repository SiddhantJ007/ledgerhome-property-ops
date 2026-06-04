create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'tenant')),
  tenant_id uuid references tenants(id) on delete set null,
  display_name text not null default '',
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_role_tenant_check check (
    (role = 'admin') or (role = 'tenant' and tenant_id is not null)
  )
);

create unique index if not exists user_profiles_tenant_id_idx
  on user_profiles (tenant_id)
  where tenant_id is not null;

grant select, update on table user_profiles to authenticated;
grant select, insert, update on table neighborhoods to authenticated;
grant select, insert, update on table properties to authenticated;
grant select, insert, update on table property_images to authenticated;
grant select, insert, update on table units to authenticated;
grant select, insert, update on table tenants to authenticated;
grant select, insert, update on table tenant_profiles to authenticated;
grant select, insert, update on table leases to authenticated;
grant select, insert, update on table documents to authenticated;
grant select, insert, update on table maintenance_requests to authenticated;
grant select, insert, update on table maintenance_updates to authenticated;
grant select, insert, update on table maintenance_images to authenticated;
grant select, insert, update on table rent_charges to authenticated;
grant select, insert, update on table rent_payments to authenticated;
grant select, insert, update on table contact_requests to authenticated;
grant select, insert, update on table notifications to authenticated;

create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.app_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.user_profiles
  where id = auth.uid()
  limit 1
$$;

alter table user_profiles enable row level security;
alter table neighborhoods enable row level security;
alter table properties enable row level security;
alter table property_images enable row level security;
alter table units enable row level security;
alter table tenants enable row level security;
alter table tenant_profiles enable row level security;
alter table leases enable row level security;
alter table documents enable row level security;
alter table maintenance_requests enable row level security;
alter table maintenance_updates enable row level security;
alter table maintenance_images enable row level security;
alter table rent_charges enable row level security;
alter table rent_payments enable row level security;
alter table contact_requests enable row level security;
alter table notifications enable row level security;

drop policy if exists "user profiles self select" on user_profiles;
create policy "user profiles self select"
on user_profiles
for select
to authenticated
using (id = auth.uid() or public.app_role() = 'admin');

drop policy if exists "user profiles self update" on user_profiles;
create policy "user profiles self update"
on user_profiles
for update
to authenticated
using (id = auth.uid() or public.app_role() = 'admin')
with check (id = auth.uid() or public.app_role() = 'admin');

drop policy if exists "admin neighborhoods manage" on neighborhoods;
create policy "admin neighborhoods manage" on neighborhoods for all to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "admin properties manage" on properties;
create policy "admin properties manage" on properties for all to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "admin property images manage" on property_images;
create policy "admin property images manage" on property_images for all to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "admin units manage" on units;
create policy "admin units manage" on units for all to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "admin tenants manage" on tenants;
create policy "admin tenants manage" on tenants for all to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "admin tenant profiles manage" on tenant_profiles;
create policy "admin tenant profiles manage" on tenant_profiles for all to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "admin leases manage" on leases;
create policy "admin leases manage" on leases for all to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "admin documents manage" on documents;
create policy "admin documents manage" on documents for all to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "admin maintenance requests manage" on maintenance_requests;
create policy "admin maintenance requests manage" on maintenance_requests for all to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "admin maintenance updates manage" on maintenance_updates;
create policy "admin maintenance updates manage" on maintenance_updates for all to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "admin maintenance images manage" on maintenance_images;
create policy "admin maintenance images manage" on maintenance_images for all to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "admin rent charges manage" on rent_charges;
create policy "admin rent charges manage" on rent_charges for all to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "admin rent payments manage" on rent_payments;
create policy "admin rent payments manage" on rent_payments for all to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "admin contact requests manage" on contact_requests;
create policy "admin contact requests manage" on contact_requests for all to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "admin notifications manage" on notifications;
create policy "admin notifications manage" on notifications for all to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "tenant neighborhoods read own" on neighborhoods;
create policy "tenant neighborhoods read own"
on neighborhoods
for select
to authenticated
using (
  exists (
    select 1
    from properties p
    join units u on u.property_id = p.id
    where p.neighborhood_id = neighborhoods.id
      and u.tenant_id = public.app_tenant_id()
  )
);

drop policy if exists "tenant properties read own" on properties;
create policy "tenant properties read own"
on properties
for select
to authenticated
using (
  exists (
    select 1
    from units u
    where u.property_id = properties.id
      and u.tenant_id = public.app_tenant_id()
  )
);

drop policy if exists "tenant property images read own" on property_images;
create policy "tenant property images read own"
on property_images
for select
to authenticated
using (
  exists (
    select 1
    from properties p
    join units u on u.property_id = p.id
    where p.id = property_images.property_id
      and u.tenant_id = public.app_tenant_id()
  )
);

drop policy if exists "tenant units read own" on units;
create policy "tenant units read own"
on units
for select
to authenticated
using (tenant_id = public.app_tenant_id());

drop policy if exists "tenant record read own" on tenants;
create policy "tenant record read own"
on tenants
for select
to authenticated
using (id = public.app_tenant_id());

drop policy if exists "tenant profile read own" on tenant_profiles;
create policy "tenant profile read own"
on tenant_profiles
for select
to authenticated
using (tenant_id = public.app_tenant_id());

drop policy if exists "tenant leases read own" on leases;
create policy "tenant leases read own"
on leases
for select
to authenticated
using (tenant_id = public.app_tenant_id());

drop policy if exists "tenant documents read own" on documents;
create policy "tenant documents read own"
on documents
for select
to authenticated
using (tenant_id = public.app_tenant_id());

drop policy if exists "tenant rent charges read own" on rent_charges;
create policy "tenant rent charges read own"
on rent_charges
for select
to authenticated
using (tenant_id = public.app_tenant_id());

drop policy if exists "tenant rent payments read own" on rent_payments;
create policy "tenant rent payments read own"
on rent_payments
for select
to authenticated
using (tenant_id = public.app_tenant_id());

drop policy if exists "tenant maintenance requests read own" on maintenance_requests;
create policy "tenant maintenance requests read own"
on maintenance_requests
for select
to authenticated
using (tenant_id = public.app_tenant_id());

drop policy if exists "tenant maintenance requests insert own" on maintenance_requests;
create policy "tenant maintenance requests insert own"
on maintenance_requests
for insert
to authenticated
with check (tenant_id = public.app_tenant_id());

drop policy if exists "tenant maintenance updates read own" on maintenance_updates;
create policy "tenant maintenance updates read own"
on maintenance_updates
for select
to authenticated
using (
  exists (
    select 1
    from maintenance_requests mr
    where mr.id = maintenance_updates.request_id
      and mr.tenant_id = public.app_tenant_id()
  )
);

drop policy if exists "tenant maintenance updates insert own" on maintenance_updates;
create policy "tenant maintenance updates insert own"
on maintenance_updates
for insert
to authenticated
with check (
  exists (
    select 1
    from maintenance_requests mr
    where mr.id = maintenance_updates.request_id
      and mr.tenant_id = public.app_tenant_id()
  )
);

drop policy if exists "tenant maintenance images read own" on maintenance_images;
create policy "tenant maintenance images read own"
on maintenance_images
for select
to authenticated
using (
  exists (
    select 1
    from maintenance_requests mr
    where mr.id = maintenance_images.request_id
      and mr.tenant_id = public.app_tenant_id()
  )
);

drop policy if exists "tenant maintenance images insert own" on maintenance_images;
create policy "tenant maintenance images insert own"
on maintenance_images
for insert
to authenticated
with check (
  exists (
    select 1
    from maintenance_requests mr
    where mr.id = maintenance_images.request_id
      and mr.tenant_id = public.app_tenant_id()
  )
);

drop policy if exists "tenant contact requests read own" on contact_requests;
create policy "tenant contact requests read own"
on contact_requests
for select
to authenticated
using (tenant_id = public.app_tenant_id());

drop policy if exists "tenant contact requests insert own" on contact_requests;
create policy "tenant contact requests insert own"
on contact_requests
for insert
to authenticated
with check (tenant_id = public.app_tenant_id() and sender_role = 'tenant');

drop policy if exists "tenant notifications read own" on notifications;
create policy "tenant notifications read own"
on notifications
for select
to authenticated
using (tenant_id = public.app_tenant_id());

drop policy if exists "prototype maintenance images select" on storage.objects;
drop policy if exists "maintenance images authenticated select" on storage.objects;
create policy "maintenance images authenticated select"
on storage.objects
for select
to authenticated
using (bucket_id = 'maintenance-images');

drop policy if exists "prototype maintenance images insert" on storage.objects;
drop policy if exists "maintenance images authenticated insert" on storage.objects;
create policy "maintenance images authenticated insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'maintenance-images');

drop policy if exists "lease documents select" on storage.objects;
drop policy if exists "lease documents authenticated select" on storage.objects;
create policy "lease documents authenticated select"
on storage.objects
for select
to authenticated
using (bucket_id = 'lease-documents');

drop policy if exists "lease documents insert" on storage.objects;
drop policy if exists "lease documents authenticated insert" on storage.objects;
create policy "lease documents authenticated insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'lease-documents');
