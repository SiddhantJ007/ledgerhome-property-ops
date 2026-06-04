create table if not exists property_charge_configs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  category text not null check (category in ('utility', 'tax')),
  title text not null,
  description text not null default '',
  allocation_method text not null check (
    allocation_method in ('property_level', 'per_unit_flat', 'per_occupied_unit', 'manual')
  ) default 'manual',
  billing_frequency text not null check (
    billing_frequency in ('monthly', 'quarterly', 'annual', 'manual')
  ) default 'monthly',
  default_amount numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_charge_configs_property_idx
  on property_charge_configs(property_id);

create index if not exists property_charge_configs_category_idx
  on property_charge_configs(category, is_active);

alter table property_charge_configs enable row level security;

drop policy if exists "admin property charge configs manage" on property_charge_configs;
create policy "admin property charge configs manage"
  on property_charge_configs
  for all
  to authenticated
  using (app_role() = 'admin')
  with check (app_role() = 'admin');

drop policy if exists "tenant property charge configs read own" on property_charge_configs;
create policy "tenant property charge configs read own"
  on property_charge_configs
  for select
  to authenticated
  using (
    exists (
      select 1
      from units
      where units.property_id = property_charge_configs.property_id
        and units.tenant_id = app_tenant_id()
    )
  );
