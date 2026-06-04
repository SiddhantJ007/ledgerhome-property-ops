insert into storage.buckets (id, name, public)
select 'lease-documents', 'lease-documents', false
where not exists (
  select 1 from storage.buckets where id = 'lease-documents'
);

drop policy if exists "lease documents select" on storage.objects;
drop policy if exists "lease documents authenticated select" on storage.objects;
create policy "lease documents authenticated select"
on storage.objects
for select
to authenticated
using (bucket_id = 'lease-documents');

drop policy if exists "lease documents insert" on storage.objects;
drop policy if exists "lease documents authenticated insert" on storage.objects;
create policy "lease documents authenticated insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'lease-documents');

drop policy if exists "lease documents authenticated update" on storage.objects;
create policy "lease documents authenticated update"
on storage.objects
for update
to authenticated
using (bucket_id = 'lease-documents')
with check (bucket_id = 'lease-documents');

drop policy if exists "lease documents authenticated delete" on storage.objects;
create policy "lease documents authenticated delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'lease-documents');
