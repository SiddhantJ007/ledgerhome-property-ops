alter table if exists rent_payments
  alter column method set default 'Manual update';

update rent_payments
set method = 'Manual update'
where method is null or btrim(method) = '';

update rent_payments
set note = ''
where note is null;

grant select, insert, update on table rent_charges to anon, authenticated;
grant select, insert, update on table rent_payments to anon, authenticated;

create index if not exists rent_charges_property_id_idx on rent_charges (property_id);
create index if not exists rent_charges_tenant_id_idx on rent_charges (tenant_id);
create index if not exists rent_charges_unit_due_date_idx on rent_charges (unit_id, due_date desc);
create index if not exists rent_charges_status_idx on rent_charges (status);

create index if not exists rent_payments_charge_id_idx on rent_payments (charge_id);
create index if not exists rent_payments_tenant_id_idx on rent_payments (tenant_id);
create index if not exists rent_payments_property_id_idx on rent_payments (property_id);
create index if not exists rent_payments_unit_id_idx on rent_payments (unit_id);
create index if not exists rent_payments_payment_date_idx on rent_payments (payment_date desc);
