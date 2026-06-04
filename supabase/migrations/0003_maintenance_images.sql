create table if not exists maintenance_images (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references maintenance_requests(id) on delete cascade,
  bucket text not null default 'maintenance-images',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes integer,
  uploaded_by text not null default 'tenant'
    check (uploaded_by in ('admin', 'tenant', 'vendor')),
  created_at timestamptz not null default now()
);

create index if not exists maintenance_images_request_id_idx on maintenance_images (request_id);

grant select, insert, update on maintenance_requests to anon, authenticated;
grant select, insert on maintenance_updates to anon, authenticated;
grant select, insert on maintenance_images to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('maintenance-images', 'maintenance-images', false)
on conflict (id) do nothing;

drop policy if exists "prototype maintenance images select" on storage.objects;
create policy "prototype maintenance images select"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'maintenance-images');

drop policy if exists "prototype maintenance images insert" on storage.objects;
create policy "prototype maintenance images insert"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'maintenance-images');
