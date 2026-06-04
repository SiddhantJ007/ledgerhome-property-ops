drop policy if exists "lease documents authenticated select" on storage.objects;
create policy "lease documents authenticated select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lease-documents'
  and (
    public.app_role() = 'admin'
    or split_part(name, '/', 1) = public.app_tenant_id()::text
  )
);

drop policy if exists "lease documents authenticated insert" on storage.objects;
create policy "lease documents authenticated insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lease-documents'
  and (
    public.app_role() = 'admin'
    or split_part(name, '/', 1) = public.app_tenant_id()::text
  )
);

drop policy if exists "lease documents authenticated update" on storage.objects;
create policy "lease documents authenticated update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'lease-documents'
  and (
    public.app_role() = 'admin'
    or split_part(name, '/', 1) = public.app_tenant_id()::text
  )
)
with check (
  bucket_id = 'lease-documents'
  and (
    public.app_role() = 'admin'
    or split_part(name, '/', 1) = public.app_tenant_id()::text
  )
);

drop policy if exists "lease documents authenticated delete" on storage.objects;
create policy "lease documents authenticated delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'lease-documents'
  and (
    public.app_role() = 'admin'
    or split_part(name, '/', 1) = public.app_tenant_id()::text
  )
);

drop policy if exists "maintenance images authenticated select" on storage.objects;
create policy "maintenance images authenticated select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'maintenance-images'
  and (
    public.app_role() = 'admin'
    or exists (
      select 1
      from public.maintenance_images mi
      join public.maintenance_requests mr on mr.id = mi.request_id
      where mi.storage_path = storage.objects.name
        and mr.tenant_id = public.app_tenant_id()
    )
  )
);

drop policy if exists "maintenance images authenticated insert" on storage.objects;
create policy "maintenance images authenticated insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'maintenance-images'
  and (
    public.app_role() = 'admin'
    or exists (
      select 1
      from public.maintenance_requests mr
      where split_part(storage.objects.name, '/', 1) = mr.id::text
        and mr.tenant_id = public.app_tenant_id()
    )
  )
);
