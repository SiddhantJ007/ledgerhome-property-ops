alter table if exists documents
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists uploaded_by text not null default 'admin'
    check (uploaded_by in ('admin', 'tenant', 'system'));

grant select, insert, update on table leases to anon, authenticated;
grant select, insert, update on table documents to anon, authenticated;

create index if not exists documents_lease_id_idx on documents (lease_id);
create index if not exists documents_category_idx on documents (category);
create index if not exists documents_storage_path_idx on documents (storage_path);

insert into storage.buckets (id, name, public)
select 'lease-documents', 'lease-documents', false
where not exists (
  select 1 from storage.buckets where id = 'lease-documents'
);

create policy "lease documents select"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'lease-documents');

create policy "lease documents insert"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'lease-documents');
