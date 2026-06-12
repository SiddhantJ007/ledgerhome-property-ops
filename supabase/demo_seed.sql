-- LedgerHome recruiter demo seed
-- Run this only against a dedicated demo Supabase project.
-- Required auth users:
--   demo-admin@ledgerhome-demo.com
--   alex.carter@ledgerhome-demo.com

begin;

-- Stable ids for a predictable demo dataset.
drop table if exists demo_ids;
create temporary table demo_ids on commit drop as
select
  '11111111-1111-1111-1111-111111111111'::uuid as neighborhood_id,
  '22222222-2222-2222-2222-222222222222'::uuid as property_id,
  '33333333-3333-3333-3333-333333333331'::uuid as occupied_unit_id,
  '33333333-3333-3333-3333-333333333332'::uuid as vacant_unit_id,
  '44444444-4444-4444-4444-444444444444'::uuid as tenant_id,
  '55555555-5555-5555-5555-555555555555'::uuid as tenant_profile_id,
  '66666666-6666-6666-6666-666666666666'::uuid as lease_id,
  '77777777-7777-7777-7777-777777777771'::uuid as rent_charge_id,
  '88888888-8888-8888-8888-888888888881'::uuid as rent_payment_id,
  '99999999-9999-9999-9999-999999999991'::uuid as maintenance_request_id,
  '99999999-9999-9999-9999-999999999992'::uuid as maintenance_update_id,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid as document_id,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid as tenant_notification_1,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid as tenant_notification_2,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid as admin_notification_1;

drop table if exists auth_refs;
create temporary table auth_refs on commit drop as
select
  (select id from auth.users where email = 'demo-admin@ledgerhome-demo.com' limit 1) as admin_user_id,
  (select id from auth.users where email = 'alex.carter@ledgerhome-demo.com' limit 1) as tenant_user_id;
insert into neighborhoods (id, state_code, name, city, note, is_active)
select neighborhood_id, 'TX', 'North Loop', 'Austin', 'Fake recruiter demo neighborhood.', true
from demo_ids
on conflict (id) do update
set state_code = excluded.state_code,
    name = excluded.name,
    city = excluded.city,
    note = excluded.note,
    is_active = excluded.is_active;

insert into properties (id, neighborhood_id, name, address, status, note, cover_image_url)
select property_id, neighborhood_id, 'Harbor View Apartments', '100 Demo Street, Austin, TX', 'active', 'Fake recruiter demo property.', null
from demo_ids
on conflict (id) do update
set neighborhood_id = excluded.neighborhood_id,
    name = excluded.name,
    address = excluded.address,
    status = excluded.status,
    note = excluded.note,
    cover_image_url = excluded.cover_image_url;

insert into units (id, property_id, label, bedrooms, bathrooms, monthly_rent, occupancy_status, tenant_id)
select occupied_unit_id, property_id, 'Unit 2A', 2, 1, 1850, 'occupied', null
from demo_ids
on conflict (id) do update
set property_id = excluded.property_id,
    label = excluded.label,
    bedrooms = excluded.bedrooms,
    bathrooms = excluded.bathrooms,
    monthly_rent = excluded.monthly_rent,
    occupancy_status = excluded.occupancy_status,
    tenant_id = excluded.tenant_id;

insert into units (id, property_id, label, bedrooms, bathrooms, monthly_rent, occupancy_status, tenant_id)
select vacant_unit_id, property_id, 'Unit 3B', 1, 1, 1650, 'vacant', null
from demo_ids
on conflict (id) do update
set property_id = excluded.property_id,
    label = excluded.label,
    bedrooms = excluded.bedrooms,
    bathrooms = excluded.bathrooms,
    monthly_rent = excluded.monthly_rent,
    occupancy_status = excluded.occupancy_status,
    tenant_id = excluded.tenant_id;

insert into tenants (id, unit_id, full_name, email, phone, move_in_date, lease_end_date, status)
select tenant_id, occupied_unit_id, 'Alex Carter', 'alex.carter@ledgerhome-demo.com', '(555) 010-2200', date '2026-01-15', date '2027-01-14', 'active'
from demo_ids
on conflict (id) do update
set unit_id = excluded.unit_id,
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    move_in_date = excluded.move_in_date,
    lease_end_date = excluded.lease_end_date,
    status = excluded.status;

insert into tenant_profiles (id, tenant_id, preferred_contact_method, emergency_contact_name, emergency_contact_phone, avatar_url, notes)
select tenant_profile_id, tenant_id, 'email', 'Jordan Carter', '(555) 010-2201', null, 'Fake demo tenant profile.'
from demo_ids
on conflict (id) do update
set tenant_id = excluded.tenant_id,
    preferred_contact_method = excluded.preferred_contact_method,
    emergency_contact_name = excluded.emergency_contact_name,
    emergency_contact_phone = excluded.emergency_contact_phone,
    avatar_url = excluded.avatar_url,
    notes = excluded.notes;

insert into leases (id, tenant_id, property_id, unit_id, start_date, end_date, renewal_date, monthly_rent, security_deposit, status, signed_document_id)
select lease_id, tenant_id, property_id, occupied_unit_id, date '2026-01-15', date '2027-01-14', date '2026-12-01', 1850, 1850, 'active', null
from demo_ids
on conflict (id) do update
set tenant_id = excluded.tenant_id,
    property_id = excluded.property_id,
    unit_id = excluded.unit_id,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    renewal_date = excluded.renewal_date,
    monthly_rent = excluded.monthly_rent,
    security_deposit = excluded.security_deposit,
    status = excluded.status,
    signed_document_id = excluded.signed_document_id;

insert into rent_charges (
  id, tenant_id, property_id, unit_id, charge_type, description, period_start, period_end, due_date, month_label,
  expected_amount, collected_amount, prior_balance_amount, status, last_payment_date
)
select rent_charge_id, tenant_id, property_id, occupied_unit_id, 'rent', 'Monthly rent', date '2026-06-01', date '2026-06-30', date '2026-06-01', 'June 2026',
       1850, 900, 0, 'partial', date '2026-06-03'
from demo_ids
on conflict (id) do update
set tenant_id = excluded.tenant_id,
    property_id = excluded.property_id,
    unit_id = excluded.unit_id,
    charge_type = excluded.charge_type,
    description = excluded.description,
    period_start = excluded.period_start,
    period_end = excluded.period_end,
    due_date = excluded.due_date,
    month_label = excluded.month_label,
    expected_amount = excluded.expected_amount,
    collected_amount = excluded.collected_amount,
    prior_balance_amount = excluded.prior_balance_amount,
    status = excluded.status,
    last_payment_date = excluded.last_payment_date;

insert into rent_payments (
  id, charge_id, tenant_id, property_id, unit_id, amount, payment_date, method, note, status, external_reference
)
select rent_payment_id, rent_charge_id, tenant_id, property_id, occupied_unit_id, 900, date '2026-06-03', 'Resident portal', 'Demo prior payment', 'posted', 'demo-payment-001'
from demo_ids
on conflict (id) do update
set charge_id = excluded.charge_id,
    tenant_id = excluded.tenant_id,
    property_id = excluded.property_id,
    unit_id = excluded.unit_id,
    amount = excluded.amount,
    payment_date = excluded.payment_date,
    method = excluded.method,
    note = excluded.note,
    status = excluded.status,
    external_reference = excluded.external_reference;

insert into maintenance_requests (
  id, tenant_id, property_id, unit_id, title, type, priority, status, submitted_at, latest_update_at, summary
)
select maintenance_request_id, tenant_id, property_id, occupied_unit_id, 'Kitchen sink leak', 'plumbing', 'medium', 'in_progress', now() - interval '2 days', now() - interval '1 day', 'Tenant reported a slow but steady sink leak.'
from demo_ids
on conflict (id) do update
set tenant_id = excluded.tenant_id,
    property_id = excluded.property_id,
    unit_id = excluded.unit_id,
    title = excluded.title,
    type = excluded.type,
    priority = excluded.priority,
    status = excluded.status,
    submitted_at = excluded.submitted_at,
    latest_update_at = excluded.latest_update_at,
    summary = excluded.summary;

insert into maintenance_updates (
  id, request_id, status, note, updated_at, updated_by, cost
)
select maintenance_update_id, maintenance_request_id, 'in_progress', 'Plumber scheduled and tenant notified of access window.', now() - interval '1 day', 'admin', 125
from demo_ids
on conflict (id) do update
set request_id = excluded.request_id,
    status = excluded.status,
    note = excluded.note,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by,
    cost = excluded.cost;

insert into documents (
  id, tenant_id, property_id, unit_id, lease_id, category, title, file_url, status, uploaded_at
)
select document_id, tenant_id, property_id, occupied_unit_id, lease_id, 'statement', 'June 2026 rent statement', null, 'placeholder', now() - interval '3 days'
from demo_ids
on conflict (id) do update
set tenant_id = excluded.tenant_id,
    property_id = excluded.property_id,
    unit_id = excluded.unit_id,
    lease_id = excluded.lease_id,
    category = excluded.category,
    title = excluded.title,
    file_url = excluded.file_url,
    status = excluded.status,
    uploaded_at = excluded.uploaded_at;


insert into user_profiles (id, role, tenant_id, display_name, email)
select auth_refs.admin_user_id, 'admin', null, 'Demo Portfolio Admin', 'demo-admin@ledgerhome-demo.com'
from auth_refs
where auth_refs.admin_user_id is not null
on conflict (id) do update
set role = excluded.role,
    tenant_id = excluded.tenant_id,
    display_name = excluded.display_name,
    email = excluded.email,
    updated_at = now();

insert into user_profiles (id, role, tenant_id, display_name, email)
select auth_refs.tenant_user_id, 'tenant', demo_ids.tenant_id, 'Alex Carter', 'alex.carter@ledgerhome-demo.com'
from auth_refs, demo_ids
where auth_refs.tenant_user_id is not null
on conflict (id) do update
set role = excluded.role,
    tenant_id = excluded.tenant_id,
    display_name = excluded.display_name,
    email = excluded.email,
    updated_at = now();

update units
set tenant_id = demo_ids.tenant_id,
    occupancy_status = 'occupied'
from demo_ids
where units.id = demo_ids.occupied_unit_id;

-- Keep the demo seed tolerant of projects where notification-center columns
-- were not added yet or a migration partially applied.
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

insert into notifications (
  id, tenant_id, user_profile_id, role_target, type, title, body, priority, action_label, route_target, entity_type, entity_id, created_at, updated_at, read_at, dismissed_at
)
select tenant_notification_1, tenant_id, null, 'tenant', 'rent', 'Rent due soon', 'Your June rent balance still has an open amount in the demo account.', 'normal', 'Open rent details', '/(tenant)/pay-rent', 'rent_charge', rent_charge_id::text, now() - interval '12 hours', now() - interval '12 hours', null, null
from demo_ids
on conflict (id) do update
set tenant_id = excluded.tenant_id,
    user_profile_id = excluded.user_profile_id,
    role_target = excluded.role_target,
    type = excluded.type,
    title = excluded.title,
    body = excluded.body,
    priority = excluded.priority,
    action_label = excluded.action_label,
    route_target = excluded.route_target,
    entity_type = excluded.entity_type,
    entity_id = excluded.entity_id,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at,
    read_at = excluded.read_at,
    dismissed_at = excluded.dismissed_at;

insert into notifications (
  id, tenant_id, user_profile_id, role_target, type, title, body, priority, action_label, route_target, entity_type, entity_id, created_at, updated_at, read_at, dismissed_at
)
select tenant_notification_2, tenant_id, null, 'tenant', 'maintenance', 'Repair update available', 'The kitchen sink repair is now in progress.', 'low', 'Open repair details', '/(tenant)/(tabs)/maintenance', 'maintenance_request', maintenance_request_id::text, now() - interval '20 hours', now() - interval '20 hours', null, null
from demo_ids
on conflict (id) do update
set tenant_id = excluded.tenant_id,
    user_profile_id = excluded.user_profile_id,
    role_target = excluded.role_target,
    type = excluded.type,
    title = excluded.title,
    body = excluded.body,
    priority = excluded.priority,
    action_label = excluded.action_label,
    route_target = excluded.route_target,
    entity_type = excluded.entity_type,
    entity_id = excluded.entity_id,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at,
    read_at = excluded.read_at,
    dismissed_at = excluded.dismissed_at;

insert into notifications (
  id, tenant_id, user_profile_id, role_target, type, title, body, priority, action_label, route_target, entity_type, entity_id, created_at, updated_at, read_at, dismissed_at
)
select admin_notification_1, tenant_id, auth_refs.admin_user_id, 'admin', 'maintenance', 'New repair request', 'Alex Carter reported a kitchen sink leak in Unit 2A.', 'high', 'Open tenant record', '/tenants/' || tenant_id::text, 'maintenance_request', maintenance_request_id::text, now() - interval '18 hours', now() - interval '18 hours', null, null
from demo_ids, auth_refs
on conflict (id) do update
set tenant_id = excluded.tenant_id,
    user_profile_id = excluded.user_profile_id,
    role_target = excluded.role_target,
    type = excluded.type,
    title = excluded.title,
    body = excluded.body,
    priority = excluded.priority,
    action_label = excluded.action_label,
    route_target = excluded.route_target,
    entity_type = excluded.entity_type,
    entity_id = excluded.entity_id,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at,
    read_at = excluded.read_at,
    dismissed_at = excluded.dismissed_at;

commit;
