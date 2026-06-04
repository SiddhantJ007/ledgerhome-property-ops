alter table neighborhoods
  add column if not exists state_code text,
  add column if not exists is_active boolean not null default true;

update neighborhoods
set state_code = case
  when city ilike '%, NY%' then 'NY'
  when city ilike '%, NJ%' then 'NJ'
  when city ilike '%, PA%' then 'PA'
  else 'NY'
end
where state_code is null;

alter table neighborhoods
  alter column state_code set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'neighborhoods_state_code_check'
  ) then
    alter table neighborhoods
      add constraint neighborhoods_state_code_check
      check (state_code in ('NY', 'NJ', 'PA'));
  end if;
end $$;

create unique index if not exists neighborhoods_state_name_idx
  on neighborhoods (state_code, name);

create unique index if not exists units_property_label_idx
  on units (property_id, label);
