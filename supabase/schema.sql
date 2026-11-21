-- Pedalz Supabase schema. Run once in Supabase → SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text, handle text, gender text default 'x', bio text,
  genres text[] default '{}', grp text, vis text default 'group', radius numeric default 0.8,
  created_at timestamptz default now()
);
create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ts timestamptz not null, dur_s int, dist_m numeric, avg_ms numeric, max_ms numeric, gain_m numeric,
  mode text default 'bike', path jsonb, series jsonb, created_at timestamptz default now()
);
create table if not exists public.live_locations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text, gender text, mode text, lat double precision, lng double precision,
  vis text, radius numeric, grp text, live boolean default false, updated_at timestamptz default now()
);
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seller_name text, title text not null, price numeric not null, cond text,
  scope text not null default 'public' check (scope in ('public','group')),
  grp text, img text, created_at timestamptz default now()
);
create table if not exists public.causes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organizer text, title text not null, descr text, date date,
  scope text not null default 'public' check (scope in ('public','group')),
  grp text, created_at timestamptz default now()
);
create table if not exists public.cause_members (
  cause_id uuid references public.causes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (cause_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.rides enable row level security;
alter table public.live_locations enable row level security;
alter table public.listings enable row level security;
alter table public.causes enable row level security;
alter table public.cause_members enable row level security;

-- helper: the caller's group code
create or replace function public.my_group() returns text language sql stable security definer set search_path = public as
$$ select grp from public.profiles where id = auth.uid() $$;

-- profiles: public read (no email stored here), owner write
create policy "profiles read" on public.profiles for select using (true);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

-- rides: private to the owner
create policy "rides own" on public.rides for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- live locations: visible if public, or same group (precise), or your own row. 'off' is never stored.
create policy "live read" on public.live_locations for select using (
  auth.uid() = user_id or vis = 'public' or (vis in ('group','friends') and grp is not null and grp = public.my_group()));
create policy "live write own" on public.live_locations for insert with check (auth.uid() = user_id);
create policy "live update own" on public.live_locations for update using (auth.uid() = user_id);
create policy "live delete own" on public.live_locations for delete using (auth.uid() = user_id);

-- listings & causes: public ones readable by all signed-in or anonymous users; group ones only by that group
create policy "listings read" on public.listings for select using (scope = 'public' or auth.uid() = user_id or (scope = 'group' and grp = public.my_group()));
create policy "listings write own" on public.listings for insert with check (auth.uid() = user_id);
create policy "listings delete own" on public.listings for delete using (auth.uid() = user_id);
create policy "causes read" on public.causes for select using (scope = 'public' or auth.uid() = user_id or (scope = 'group' and grp = public.my_group()));
create policy "causes write own" on public.causes for insert with check (auth.uid() = user_id);
create policy "causes delete own" on public.causes for delete using (auth.uid() = user_id);
create policy "members read" on public.cause_members for select using (true);
create policy "members join" on public.cause_members for insert with check (auth.uid() = user_id);
create policy "members leave" on public.cause_members for delete using (auth.uid() = user_id);

-- realtime for the live map
alter publication supabase_realtime add table public.live_locations;

-- housekeeping: call from a scheduled job (pg_cron) to drop stale locations
-- delete from public.live_locations where updated_at < now() - interval '1 hour';
