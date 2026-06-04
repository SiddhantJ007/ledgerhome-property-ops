alter table if exists rent_charges
  add column if not exists source_config_id uuid references property_charge_configs(id) on delete set null;

create index if not exists rent_charges_source_config_id_idx
  on rent_charges(source_config_id);

create unique index if not exists rent_charges_fee_config_unit_cycle_idx
  on rent_charges(source_config_id, unit_id, month_label)
  where charge_type = 'fee' and source_config_id is not null;
