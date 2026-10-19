create table if not exists public.admin_allowlist (
  email text primary key check (email = lower(trim(email))),
  added_at timestamptz not null default now()
);

grant usage on schema public to anon, authenticated;

alter table public.admin_allowlist enable row level security;
revoke all on public.admin_allowlist from anon, authenticated;

create or replace function public.is_terra_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_allowlist
    where email = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

revoke all on function public.is_terra_admin() from public, anon;
grant execute on function public.is_terra_admin() to authenticated;

create table if not exists public.species_catalog (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  data jsonb not null check (
    jsonb_typeof(data) = 'object'
    and data ->> 'id' = id
    and nullif(data ->> 'name', '') is not null
    and nullif(data ->> 'scientificName', '') is not null
  ),
  updated_at timestamptz not null default now()
);

create or replace function public.set_species_catalog_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_species_catalog_updated_at() from public, anon, authenticated;

drop trigger if exists species_catalog_updated_at on public.species_catalog;
create trigger species_catalog_updated_at
before update on public.species_catalog
for each row execute function public.set_species_catalog_updated_at();

alter table public.species_catalog enable row level security;
revoke all on public.species_catalog from public;
grant select on public.species_catalog to anon, authenticated;
grant insert, update, delete on public.species_catalog to authenticated;

drop policy if exists "Anyone can read the public species catalog" on public.species_catalog;
create policy "Anyone can read the public species catalog"
on public.species_catalog for select
to anon, authenticated
using (true);

drop policy if exists "Allowlisted admins can insert species" on public.species_catalog;
create policy "Allowlisted admins can insert species"
on public.species_catalog for insert
to authenticated
with check (public.is_terra_admin());

drop policy if exists "Allowlisted admins can update species" on public.species_catalog;
create policy "Allowlisted admins can update species"
on public.species_catalog for update
to authenticated
using (public.is_terra_admin())
with check (public.is_terra_admin());

drop policy if exists "Allowlisted admins can delete species" on public.species_catalog;
create policy "Allowlisted admins can delete species"
on public.species_catalog for delete
to authenticated
using (public.is_terra_admin());

insert into public.admin_allowlist (email)
values ('eskinyunus5@gmail.com')
on conflict (email) do nothing;

create or replace function public.terra_community_text_is_allowed(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select not (
    translate(lower(coalesce(value, '')), 'çğıöşü', 'cgiosu')
      ~ '(^|[^a-z0-9])(amk|aq|oc|orospu|sik|yarrak|pic|ibne|amcik|serefsiz|gerizekali|salak|aptal|kahpe|surtuk|fuck|shit|bitch|asshole|cunt|dick|bastard|motherfucker)([^a-z0-9]|$)'
  );
$$;

revoke all on function public.terra_community_text_is_allowed(text) from public;
grant execute on function public.terra_community_text_is_allowed(text) to anon, authenticated;
grant execute on function public.is_terra_admin() to anon, authenticated;

create table if not exists public.community_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (
    char_length(trim(display_name)) between 2 and 32
    and public.terra_community_text_is_allowed(display_name)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.community_profiles enable row level security;
revoke all on public.community_profiles from public;
grant select on public.community_profiles to anon, authenticated;
grant insert, update on public.community_profiles to authenticated;

drop policy if exists "Community display names are public" on public.community_profiles;
create policy "Community display names are public"
on public.community_profiles for select
to anon, authenticated
using (true);

drop policy if exists "Users create their own community profile" on public.community_profiles;
create policy "Users create their own community profile"
on public.community_profiles for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users update their own community profile" on public.community_profiles;
create policy "Users update their own community profile"
on public.community_profiles for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.community_profiles(user_id) on delete cascade,
  question text not null check (
    char_length(trim(question)) between 5 and 240
    and public.terra_community_text_is_allowed(question)
  ),
  species_name text check (
    species_name is null or (
      char_length(trim(species_name)) between 1 and 100
      and public.terra_community_text_is_allowed(species_name)
    )
  ),
  image_path text not null unique check (image_path ~ '^community/[0-9a-f-]{36}/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$'),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.community_profiles(user_id) on delete cascade,
  body text not null check (
    char_length(trim(body)) between 2 and 500
    and public.terra_community_text_is_allowed(body)
  ),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderated_by uuid references auth.users(id) on delete set null
);

create index if not exists community_posts_public_feed_idx
  on public.community_posts (created_at desc) where status = 'published';
create index if not exists community_posts_pending_idx
  on public.community_posts (created_at) where status = 'pending';
create index if not exists community_comments_post_feed_idx
  on public.community_comments (post_id, created_at) where status = 'published';
create index if not exists community_comments_pending_idx
  on public.community_comments (created_at) where status = 'pending';

create or replace function public.enforce_community_submission_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_count integer;
  allowed_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(new.author_id::text), hashtext(tg_table_name));
  if tg_table_name = 'community_posts' then
    select count(*) into recent_count
    from public.community_posts
    where author_id = new.author_id and created_at > now() - interval '1 hour';
    allowed_count := 5;
  else
    select count(*) into recent_count
    from public.community_comments
    where author_id = new.author_id and created_at > now() - interval '1 hour';
    allowed_count := 15;
  end if;

  if recent_count >= allowed_count then
    raise exception using
      errcode = 'P0001',
      message = 'Saatlik paylaşım sınırına ulaştın. Daha sonra yeniden dene.';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_community_submission_rate() from public, anon, authenticated;

drop trigger if exists community_posts_rate_limit on public.community_posts;
create trigger community_posts_rate_limit
before insert on public.community_posts
for each row execute function public.enforce_community_submission_rate();

drop trigger if exists community_comments_rate_limit on public.community_comments;
create trigger community_comments_rate_limit
before insert on public.community_comments
for each row execute function public.enforce_community_submission_rate();

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
revoke all on public.community_posts, public.community_comments from public;
grant select on public.community_posts, public.community_comments to anon, authenticated;
grant insert, update, delete on public.community_posts, public.community_comments to authenticated;

drop policy if exists "Read published posts and own moderation queue" on public.community_posts;
create policy "Read published posts and own moderation queue"
on public.community_posts for select
to anon, authenticated
using (
  status = 'published'
  or author_id = (select auth.uid())
  or public.is_terra_admin()
);

drop policy if exists "Signed in users submit moderated photo posts" on public.community_posts;
create policy "Signed in users submit moderated photo posts"
on public.community_posts for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and status = 'pending'
  and moderated_at is null
  and moderated_by is null
  and image_path like 'community/' || (select auth.uid())::text || '/%'
);

drop policy if exists "Admins moderate community posts" on public.community_posts;
create policy "Admins moderate community posts"
on public.community_posts for update
to authenticated
using (public.is_terra_admin())
with check (
  public.is_terra_admin()
  and status in ('published', 'rejected')
  and moderated_at is not null
);

drop policy if exists "Authors remove their own pending posts" on public.community_posts;
create policy "Authors remove their own pending posts"
on public.community_posts for delete
to authenticated
using (author_id = (select auth.uid()) and status = 'pending');

drop policy if exists "Read published comments and own moderation queue" on public.community_comments;
create policy "Read published comments and own moderation queue"
on public.community_comments for select
to anon, authenticated
using (
  public.is_terra_admin()
  or author_id = (select auth.uid())
  or (
    status = 'published'
    and exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.status = 'published'
    )
  )
);

drop policy if exists "Signed in users comment on published posts" on public.community_comments;
create policy "Signed in users comment on published posts"
on public.community_comments for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and status = 'pending'
  and moderated_at is null
  and moderated_by is null
  and exists (
    select 1 from public.community_posts p
    where p.id = post_id and p.status = 'published'
  )
);

drop policy if exists "Admins moderate community comments" on public.community_comments;
create policy "Admins moderate community comments"
on public.community_comments for update
to authenticated
using (public.is_terra_admin())
with check (
  public.is_terra_admin()
  and status in ('published', 'rejected')
  and moderated_at is not null
);

drop policy if exists "Authors remove their own pending comments" on public.community_comments;
create policy "Authors remove their own pending comments"
on public.community_comments for delete
to authenticated
using (author_id = (select auth.uid()) and status = 'pending');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-media', 'community-media', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.community_photo_upload_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) < 10
  from storage.objects
  where bucket_id = 'community-media'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and created_at > now() - interval '1 hour';
$$;

revoke all on function public.community_photo_upload_allowed() from public, anon;
grant execute on function public.community_photo_upload_allowed() to authenticated;

drop policy if exists "Users upload their own community photos" on storage.objects;
create policy "Users upload their own community photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'community-media'
  and (storage.foldername(name))[1] = 'community'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and public.community_photo_upload_allowed()
);

drop policy if exists "Read published community photos" on storage.objects;
create policy "Read published community photos"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'community-media'
  and (
    public.is_terra_admin()
    or exists (
      select 1 from public.community_posts p
      where p.image_path = name
        and (p.status = 'published' or p.author_id = (select auth.uid()))
    )
  )
);

drop policy if exists "Users delete their own pending community photos" on storage.objects;
create policy "Users delete their own pending community photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'community-media'
  and (storage.foldername(name))[1] = 'community'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and not exists (
    select 1 from public.community_posts p
    where p.image_path = name and p.status <> 'pending'
  )
);

drop policy if exists "Admins delete moderated community photos" on storage.objects;
create policy "Admins delete moderated community photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'community-media'
  and public.is_terra_admin()
);
