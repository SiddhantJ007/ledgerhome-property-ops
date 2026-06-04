insert into storage.buckets (id, name, public)
select 'property-images', 'property-images', true
where not exists (
  select 1 from storage.buckets where id = 'property-images'
);

drop policy if exists "property images authenticated select" on storage.objects;
create policy "property images authenticated select"
on storage.objects
for select
to authenticated
using (bucket_id = 'property-images');

drop policy if exists "property images authenticated insert" on storage.objects;
create policy "property images authenticated insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'property-images');

drop policy if exists "property images authenticated update" on storage.objects;
create policy "property images authenticated update"
on storage.objects
for update
to authenticated
using (bucket_id = 'property-images')
with check (bucket_id = 'property-images');

drop policy if exists "property images authenticated delete" on storage.objects;
create policy "property images authenticated delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'property-images');
