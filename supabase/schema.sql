create table if not exists neighborhoods (
  id uuid primary key default gen_random_uuid(),
  state_code text not null,
  name text not null,
  city text not null,
  note text default '',
  is_active boolean not null default true,
  unique (state_code, name)
);

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references neighborhoods(id) on delete restrict,
  name text not null,
  address text not null,
  status text not null check (status in ('active', 'inactive')),
  note text default '',
  cover_image_url text
);

create table if not exists property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  image_url text not null,
  label text default ''
);

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

create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  label text not null,
  bedrooms integer not null default 0,
  bathrooms numeric(3,1) not null default 1,
  monthly_rent numeric(12,2) not null default 0,
  occupancy_status text not null check (occupancy_status in ('occupied', 'vacant', 'turnover')),
  tenant_id uuid,
  unique (property_id, label)
);

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  move_in_date date,
  status text not null check (status in ('active', 'pending', 'former'))
);

alter table if exists units
  drop constraint if exists units_tenant_id_fkey;

alter table if exists units
  add constraint units_tenant_id_fkey
  foreign key (tenant_id) references tenants(id) on delete set null;

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'tenant')),
  tenant_id uuid references tenants(id) on delete set null,
  display_name text not null default '',
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_workspaces (
  id uuid primary key references user_profiles(id) on delete cascade,
  title text not null default 'Workspace',
  body text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rent_charges (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  due_date date not null,
  month_label text not null,
  expected_amount numeric(12,2) not null default 0,
  collected_amount numeric(12,2) not null default 0,
  status text not null check (status in ('paid', 'partial', 'pending', 'overdue')),
  last_payment_date date
);

create table if not exists rent_payments (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references rent_charges(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  unit_id uuid not null references units(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  payment_date date not null,
  method text default '',
  note text default ''
);

create table if not exists maintenance_records (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  title text not null,
  type text not null,
  status text not null check (status in ('open', 'in_progress', 'completed', 'deferred')),
  service_date date not null,
  next_action_date date,
  cost numeric(12,2) not null default 0,
  note text default ''
);
