insert into user_profiles (id, role, tenant_id, display_name, email)
select
  auth_user.id,
  'admin',
  null,
  'Demo Portfolio Admin',
  auth_user.email
from auth.users as auth_user
where auth_user.email = 'admin@example.com'
on conflict (id) do update
set
  role = excluded.role,
  tenant_id = excluded.tenant_id,
  display_name = excluded.display_name,
  email = excluded.email,
  updated_at = now();

insert into user_profiles (id, role, tenant_id, display_name, email)
select
  auth_user.id,
  'tenant',
  tenant_record.id,
  tenant_record.full_name,
  auth_user.email
from auth.users as auth_user
join tenants as tenant_record
  on tenant_record.full_name = 'Casey Harper'
where auth_user.email = 'tenant@example.com'
on conflict (id) do update
set
  role = excluded.role,
  tenant_id = excluded.tenant_id,
  display_name = excluded.display_name,
  email = excluded.email,
  updated_at = now();
