-- Expand auth_signup_method to include native Apple Sign-In, and teach
-- get_signin_method_hint / handle_new_user about the apple provider.

alter table public.profiles drop constraint if exists profiles_auth_signup_method_check;

alter table public.profiles
  add constraint profiles_auth_signup_method_check
  check (auth_signup_method in ('email', 'google', 'apple'));

comment on column public.profiles.auth_signup_method is
  'Primary registration path: email (password), google, or apple native sign-in.';

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
  elsif prov = 'apple' then
    method := 'apple';
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
  ident_apple boolean;
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

  if prov = 'google' then
    return 'google';
  end if;
  if prov = 'apple' then
    return 'apple';
  end if;

  select
    bool_or(i.provider = 'email'),
    bool_or(i.provider = 'google'),
    bool_or(i.provider = 'apple')
  into ident_email, ident_google, ident_apple
  from auth.identities i
  where i.user_id = uid;

  if ident_google and not coalesce(ident_email, false) and not coalesce(ident_apple, false) then
    return 'google';
  end if;
  if ident_apple and not coalesce(ident_email, false) and not coalesce(ident_google, false) then
    return 'apple';
  end if;
  return 'email';
end;
$$;
