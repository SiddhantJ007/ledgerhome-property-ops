create table if not exists public.property_charge_batches (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  category text not null check (category in ('utility', 'tax')),
  title text not null,
  description text,
  billing_period_label text not null,
  due_date date not null,
  total_amount numeric(12,2) not null check (total_amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.property_charge_allocations (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.property_charge_batches(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  allocated_amount numeric(12,2) not null check (allocated_amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists property_charge_batches_property_idx
  on public.property_charge_batches(property_id, due_date desc);

create index if not exists property_charge_allocations_batch_idx
  on public.property_charge_allocations(batch_id);

create index if not exists property_charge_allocations_unit_idx
  on public.property_charge_allocations(unit_id);

alter table public.property_charge_batches enable row level security;
alter table public.property_charge_allocations enable row level security;

drop policy if exists "admin property charge batches manage" on public.property_charge_batches;
create policy "admin property charge batches manage"
on public.property_charge_batches
for all
to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "tenant property charge batches read own" on public.property_charge_batches;
create policy "tenant property charge batches read own"
on public.property_charge_batches
for select
to authenticated
using (
  exists (
    select 1
    from public.property_charge_allocations a
    where a.batch_id = property_charge_batches.id
      and a.tenant_id = public.app_tenant_id()
  )
);

drop policy if exists "admin property charge allocations manage" on public.property_charge_allocations;
create policy "admin property charge allocations manage"
on public.property_charge_allocations
for all
to authenticated
using (public.app_role() = 'admin')
with check (public.app_role() = 'admin');

drop policy if exists "tenant property charge allocations read own" on public.property_charge_allocations;
create policy "tenant property charge allocations read own"
on public.property_charge_allocations
for select
to authenticated
using (tenant_id = public.app_tenant_id());
