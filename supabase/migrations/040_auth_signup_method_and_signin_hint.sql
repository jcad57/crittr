-- Track primary auth method and whether the user can sign in with email/password.
-- Used to route Google-only users to OAuth and to offer "set password" in settings.

alter table public.profiles
  add column if not exists auth_signup_method text
    check (auth_signup_method in ('email', 'google'));

alter table public.profiles
  add column if not exists has_password boolean not null default false;

comment on column public.profiles.auth_signup_method is
  'Primary registration path: email (password) or google OAuth.';

comment on column public.profiles.has_password is
  'True when the user has a Supabase email/password (set at signup or via profile).';

-- Backfill from auth.users (best-effort; legacy users default to email + password).
update public.profiles p
set
  auth_signup_method = case
    when u.raw_app_meta_data->>'provider' = 'google' then 'google'
    when u.raw_app_meta_data->>'provider' = 'email' then 'email'
    when (u.raw_app_meta_data->'providers') is not null
      and (u.raw_app_meta_data->'providers')::text ilike '%google%'
      and (u.raw_app_meta_data->'providers')::text not ilike '%email%'
    then 'google'
    else 'email'
  end,
  has_password = case
    when u.raw_app_meta_data->>'provider' = 'google' then false
    when u.encrypted_password is not null
      and length(u.encrypted_password) > 0
    then true
    when u.raw_app_meta_data->>'provider' = 'email' then true
    else has_password
  end
from auth.users u
where p.id = u.id
  and p.auth_signup_method is null;

-- Any remaining nulls: treat as email with password.
update public.profiles
set
  auth_signup_method = 'email',
  has_password = true
where auth_signup_method is null;

alter table public.profiles
  alter column auth_signup_method set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prov text;
  first_name text;
  last_name text;
  method text;
  pwd_ok boolean;
begin
  prov := new.raw_app_meta_data->>'provider';
  if prov = 'google' then
    method := 'google';
    pwd_ok := false;
  else
    -- email/password, phone, or unknown — treat as email for Crittr
    method := 'email';
    pwd_ok := true;
  end if;

  first_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'given_name'), '')
  );
  if first_name is null and nullif(trim(new.raw_user_meta_data->>'name'), '') is not null then
    first_name := split_part(new.raw_user_meta_data->>'name', ' ', 1);
  end if;

  last_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'last_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'family_name'), '')
  );
  if last_name is null
    and nullif(trim(new.raw_user_meta_data->>'name'), '') is not null
    and position(' ' in new.raw_user_meta_data->>'name') > 0
  then
    last_name := trim(substring(
      new.raw_user_meta_data->>'name'
      from length(split_part(new.raw_user_meta_data->>'name', ' ', 1)) + 2
    ));
  end if;

  insert into public.profiles (
    id,
    first_name,
    last_name,
    auth_signup_method,
    has_password
  )
  values (new.id, first_name, last_name, method, pwd_ok);
  return new;
end;
$$;

-- Unauthenticated: allows sign-in screen to show "use Google" only when the email exists
-- and was registered with Google. Does not reveal whether a random email is registered
-- more than a password reset would (slightly weaker than pure login).
create or replace function public.get_signin_method_hint(p_email text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid;
  m text;
  prov text;
  ident_email boolean;
  ident_google boolean;
begin
  if p_email is null or length(trim(p_email)) = 0 then
    return 'invalid';
  end if;

  select u.id, u.raw_app_meta_data->>'provider'
  into uid, prov
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if uid is null then
    return 'not_found';
  end if;

  select p.auth_signup_method into m from public.profiles p where p.id = uid;
  if m is not null then
    return m;
  end if;

  -- Legacy row without auth_signup_method
  if prov = 'google' then
    return 'google';
  end if;

  select
    bool_or(i.provider = 'email'),
    bool_or(i.provider = 'google')
  into ident_email, ident_google
  from auth.identities i
  where i.user_id = uid;

  if ident_google and not coalesce(ident_email, false) then
    return 'google';
  end if;
  return 'email';
end;
$$;

revoke all on function public.get_signin_method_hint(text) from public;
grant execute on function public.get_signin_method_hint(text) to anon;
grant execute on function public.get_signin_method_hint(text) to authenticated;
