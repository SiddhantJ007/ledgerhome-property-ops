create or replace function public.link_tenant_user_by_email(target_tenant_id uuid, target_email text)
returns public.user_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  auth_user auth.users%rowtype;
  existing_tenant_profile public.user_profiles%rowtype;
  existing_user_profile public.user_profiles%rowtype;
  linked_profile public.user_profiles%rowtype;
begin
  if public.app_role() <> 'admin' then
    raise exception 'Only admins can link tenant users.';
  end if;

  select *
  into auth_user
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;

  if auth_user.id is null then
    raise exception 'No authenticated user exists for %.', target_email;
  end if;

  select *
  into existing_tenant_profile
  from public.user_profiles
  where tenant_id = target_tenant_id
    and id <> auth_user.id
  limit 1;

  if existing_tenant_profile.id is not null then
    raise exception 'This tenant is already linked to another login.';
  end if;

  select *
  into existing_user_profile
  from public.user_profiles
  where id = auth_user.id
  limit 1;

  if existing_user_profile.id is not null
    and existing_user_profile.role = 'admin' then
    raise exception 'This authenticated user is already linked as an admin.';
  end if;

  if existing_user_profile.id is not null
    and existing_user_profile.tenant_id is not null
    and existing_user_profile.tenant_id <> target_tenant_id then
    raise exception 'This authenticated user is already linked to another tenant.';
  end if;

  insert into public.user_profiles (id, role, tenant_id, display_name, email, updated_at)
  values (
    auth_user.id,
    'tenant',
    target_tenant_id,
    coalesce(
      nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
      nullif(auth_user.raw_user_meta_data ->> 'name', ''),
      split_part(auth_user.email, '@', 1)
    ),
    auth_user.email,
    now()
  )
  on conflict (id) do update
  set
    role = 'tenant',
    tenant_id = excluded.tenant_id,
    display_name = excluded.display_name,
    email = excluded.email,
    updated_at = now()
  returning * into linked_profile;

  return linked_profile;
end;
$$;

create or replace function public.unlink_tenant_user(target_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.app_role() <> 'admin' then
    raise exception 'Only admins can unlink tenant users.';
  end if;

  delete from public.user_profiles
  where tenant_id = target_tenant_id
    and role = 'tenant';
end;
$$;

grant execute on function public.link_tenant_user_by_email(uuid, text) to authenticated;
grant execute on function public.unlink_tenant_user(uuid) to authenticated;
