-- ============================================================================
-- Crittr: RLS fix — owned data + avatar images
-- Run in Supabase SQL Editor (or: supabase db push / migration run).
-- Safe to run more than once.
--
-- Notes:
-- * Pet rows use owner_id = auth.uid() — the app must send a valid user JWT.
-- * avatar_url is just text; images load from Storage public URLs, not Postgres.
-- * For getPublicUrl() to work without signed URLs, the bucket must stay public
--   and SELECT on storage.objects must allow reads (see policies below).
-- ============================================================================

-- ── 1. Avatars bucket: must be public for public URL loading in the app ─────
update storage.buckets
set public = true
where id = 'avatars';

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- ── 2. Storage: replace policies on storage.objects (avatars) ───────────────
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
drop policy if exists "Authenticated users can update own avatars" on storage.objects;
drop policy if exists "Anyone can view avatars" on storage.objects;
drop policy if exists "Public read avatars bucket" on storage.objects;
drop policy if exists "Authenticated upload avatars" on storage.objects;
drop policy if exists "Users update own avatar objects" on storage.objects;
drop policy if exists "Users delete own avatar objects" on storage.objects;

-- World-readable objects in this bucket (required for Image / expo-image via URL)
create policy "Public read avatars bucket"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- Upload only into your own prefix: profile `{uid}/...` or pet `pets/{uid}/...`
create policy "Authenticated upload avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (
      name like auth.uid()::text || '/%'
      or name like 'pets/' || auth.uid()::text || '/%'
    )
  );

create policy "Users update own avatar objects"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      name like auth.uid()::text || '/%'
      or name like 'pets/' || auth.uid()::text || '/%'
    )
  );

create policy "Users delete own avatar objects"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      name like auth.uid()::text || '/%'
      or name like 'pets/' || auth.uid()::text || '/%'
    )
  );

-- ── 3. Profiles: ensure RLS + own-row policies ──────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- ── 4. Pets: ensure RLS + own-row policies ──────────────────────────────────
alter table public.pets enable row level security;

drop policy if exists "Users can view own pets" on public.pets;
drop policy if exists "Users can insert own pets" on public.pets;
drop policy if exists "Users can update own pets" on public.pets;
drop policy if exists "Users can delete own pets" on public.pets;

create policy "Users can view own pets"
  on public.pets for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert own pets"
  on public.pets for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update own pets"
  on public.pets for update
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can delete own pets"
  on public.pets for delete
  to authenticated
  using (auth.uid() = owner_id);
