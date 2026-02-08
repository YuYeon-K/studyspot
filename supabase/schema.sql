-- Run this in Supabase SQL Editor to create/update tables for UWaterloo Study Room Finder
-- Multi-user with auth, expanded room status (people, yappers, music)

-- Spots: rooms (buildings) + cafes (plaza)
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  building text default '',
  spot_type text default 'room',
  latitude float8,
  longitude float8,
  created_at timestamptz default now()
);

alter table public.rooms add column if not exists building text default '';
alter table public.rooms add column if not exists spot_type text default 'room';
alter table public.rooms add column if not exists latitude float8;
alter table public.rooms add column if not exists longitude float8;

-- Profiles: username for display (privacy - no email shown)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  username text not null,
  created_at timestamptz default now()
);

create index if not exists idx_profiles_user_id on public.profiles(user_id);

alter table public.profiles enable row level security;

drop policy if exists "Anyone can read profiles" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Anyone can read profiles" on public.profiles for select using (true);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = user_id);

-- Trigger: auto-create profile from raw_user_meta_data when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, username)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), 'user_' || substr(new.id::text, 1, 8))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Room status (expanded from noise_snapshots) - requires logged-in user
create table if not exists public.room_status (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  -- Noise (from mic scan)
  avg_noise float8,
  noise_label text,
  -- Manual inputs
  people_count int default 0,
  crowd_level text,
  yappers_count int default 0,
  has_music boolean default false,
  created_at timestamptz default now()
);

-- Keep old noise_snapshots for backward compat during migration (optional)
-- Drop if you want a clean start: drop table if exists public.noise_snapshots;

alter table public.room_status add column if not exists crowd_level text;

create index if not exists idx_room_status_room_id on public.room_status(room_id);
create index if not exists idx_room_status_created_at on public.room_status(created_at desc);
create index if not exists idx_room_status_user_id on public.room_status(user_id);

-- RLS: anyone can read rooms and status, only authenticated users can insert
alter table public.rooms enable row level security;
alter table public.room_status enable row level security;

drop policy if exists "Allow all on rooms" on public.rooms;
drop policy if exists "Anyone can read rooms" on public.rooms;
drop policy if exists "Anyone can read room_status" on public.room_status;
drop policy if exists "Authenticated can insert room_status" on public.room_status;
drop policy if exists "Authenticated can insert rooms" on public.rooms;

create policy "Anyone can read rooms" on public.rooms for select using (true);
create policy "Authenticated can insert rooms" on public.rooms for insert with check (auth.role() = 'authenticated');
create policy "Anyone can read room_status" on public.room_status for select using (true);
create policy "Authenticated can insert room_status" on public.room_status for insert with check (auth.uid() = user_id);

-- Enable email auth in Supabase Dashboard: Authentication > Providers > Email
-- Optional: Enable Google OAuth for @uwaterloo.ca

-- Seed UWaterloo buildings + plaza cafes (lat/lng approx campus center)
insert into public.rooms (name, description, building, spot_type, latitude, longitude) values
  ('DC 1301', 'Davis Centre study area', 'DC', 'room', 43.4709, -80.5415),
  ('DC 1351', 'Davis Centre collaboration space', 'DC', 'room', 43.4709, -80.5415),
  ('MC 4th Floor', 'Math building quiet zone', 'MC', 'room', 43.4728, -80.5449),
  ('SLC Great Hall', 'Student Life Centre main area', 'SLC', 'room', 43.4715, -80.5450),
  ('SLC 3rd Floor', 'Quieter study spots', 'SLC', 'room', 43.4715, -80.5450),
  ('Dana Porter 4th', 'Porter library silent floor', 'DP', 'room', 43.4698, -80.5425),
  ('Dana Porter 2nd', 'Porter library group area', 'DP', 'room', 43.4698, -80.5425),
  ('E7 2nd Floor', 'Engineering lounge', 'E7', 'room', 43.4720, -80.5435),
  ('Williams Fresh Cafe', 'Coffee, snacks, study vibes', 'Plaza', 'cafe', 43.4713, -80.5448),
  ('Now Tea', 'Bubble tea and study spot', 'Plaza', 'cafe', 43.4712, -80.5449),
  ('Tsujiri', 'Japanese-inspired cafe', 'Plaza', 'cafe', 43.4714, -80.5451),
  ('Gong Cha', 'Bubble tea, plaza', 'Plaza', 'cafe', 43.4711, -80.5447);
