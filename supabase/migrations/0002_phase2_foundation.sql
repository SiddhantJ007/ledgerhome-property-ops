alter table if exists tenants
  add column if not exists lease_end_date date,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists properties
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists units
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists rent_charges
  add column if not exists tenant_id uuid references tenants(id) on delete set null,
  add column if not exists property_id uuid references properties(id) on delete cascade,
  add column if not exists charge_type text not null default 'rent'
    check (charge_type in ('rent', 'fee', 'credit', 'balance_forward')),
  add column if not exists description text not null default '',
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists prior_balance_amount numeric(12,2) not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table if exists rent_payments
  add column if not exists tenant_id uuid references tenants(id) on delete set null,
  add column if not exists status text not null default 'posted'
    check (status in ('posted', 'processing', 'failed')),
  add column if not exists external_reference text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists tenant_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  preferred_contact_method text not null default 'email'
    check (preferred_contact_method in ('email', 'phone', 'sms')),
  emergency_contact_name text not null default '',
  emergency_contact_phone text not null default '',
  avatar_url text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tenant_profiles_tenant_id_idx on tenant_profiles (tenant_id);

create table if not exists leases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  unit_id uuid not null references units(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  renewal_date date,
  monthly_rent numeric(12,2) not null default 0,
  security_deposit numeric(12,2) not null default 0,
  status text not null default 'active'
    check (status in ('active', 'renewal_pending', 'expired')),
  signed_document_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leases_tenant_id_idx on leases (tenant_id);
create index if not exists leases_unit_id_idx on leases (unit_id);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  lease_id uuid references leases(id) on delete set null,
  category text not null
    check (category in ('lease', 'move_in', 'policy', 'statement', 'maintenance')),
  title text not null,
  file_url text,
  status text not null default 'placeholder'
    check (status in ('available', 'pending', 'placeholder')),
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_tenant_id_idx on documents (tenant_id);
create index if not exists documents_property_id_idx on documents (property_id);

create table if not exists maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete set null,
  property_id uuid not null references properties(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  title text not null,
  type text not null,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'completed', 'deferred')),
  submitted_at timestamptz not null default now(),
  latest_update_at timestamptz not null default now(),
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists maintenance_requests_tenant_id_idx on maintenance_requests (tenant_id);
create index if not exists maintenance_requests_property_id_idx on maintenance_requests (property_id);
create index if not exists maintenance_requests_status_idx on maintenance_requests (status);

create table if not exists maintenance_updates (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references maintenance_requests(id) on delete cascade,
  status text not null
    check (status in ('open', 'in_progress', 'completed', 'deferred')),
  note text not null default '',
  updated_at timestamptz not null default now(),
  updated_by text not null default 'admin'
    check (updated_by in ('admin', 'tenant', 'vendor')),
  cost numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists maintenance_updates_request_id_idx on maintenance_updates (request_id);

create table if not exists contact_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  unit_id uuid not null references units(id) on delete cascade,
  subject text not null,
  message text not null,
  channel text not null default 'message'
    check (channel in ('message', 'call_request')),
  status text not null default 'sent'
    check (status in ('sent', 'received', 'responded')),
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_requests_tenant_id_idx on contact_requests (tenant_id);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  type text not null
    check (type in ('rent', 'maintenance', 'lease', 'message', 'general')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  action_label text
);

create index if not exists notifications_tenant_id_idx on notifications (tenant_id);
create index if not exists notifications_created_at_idx on notifications (created_at desc);
