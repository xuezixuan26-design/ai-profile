create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  board text not null default 'thinking' check (board in ('projects', 'learning', 'thinking', 'growth')),
  slug text unique not null,
  title text not null,
  excerpt text default '',
  content text not null default '',
  cover_url text default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts
add column if not exists board text not null default 'thinking';

alter table public.posts
drop constraint if exists posts_board_check;

alter table public.posts
add constraint posts_board_check
check (board in ('projects', 'learning', 'thinking', 'growth'));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

alter table public.posts enable row level security;

drop policy if exists "public can read published posts" on public.posts;
create policy "public can read published posts"
on public.posts
for select
using (status = 'published');

drop policy if exists "admin can manage posts" on public.posts;
create policy "admin can manage posts"
on public.posts
for all
to authenticated
using (auth.uid() = 'YOUR_ADMIN_USER_ID'::uuid)
with check (auth.uid() = 'YOUR_ADMIN_USER_ID'::uuid);

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists "public can view post images" on storage.objects;
create policy "public can view post images"
on storage.objects
for select
using (bucket_id = 'post-images');

drop policy if exists "admin can upload post images" on storage.objects;
create policy "admin can upload post images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-images'
  and auth.uid() = 'YOUR_ADMIN_USER_ID'::uuid
);

drop policy if exists "admin can update post images" on storage.objects;
create policy "admin can update post images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'post-images'
  and auth.uid() = 'YOUR_ADMIN_USER_ID'::uuid
)
with check (
  bucket_id = 'post-images'
  and auth.uid() = 'YOUR_ADMIN_USER_ID'::uuid
);

drop policy if exists "admin can delete post images" on storage.objects;
create policy "admin can delete post images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-images'
  and auth.uid() = 'YOUR_ADMIN_USER_ID'::uuid
);
