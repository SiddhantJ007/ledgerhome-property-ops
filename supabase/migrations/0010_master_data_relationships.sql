do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'units_tenant_id_fkey'
  ) then
    alter table units
      add constraint units_tenant_id_fkey
      foreign key (tenant_id) references tenants(id) on delete set null;
  end if;
end $$;

create index if not exists properties_neighborhood_id_idx
  on properties (neighborhood_id);

create index if not exists units_property_id_idx
  on units (property_id);

create index if not exists tenants_unit_id_idx
  on tenants (unit_id);
