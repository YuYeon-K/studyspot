-- Run this in Supabase SQL Editor to create/update tables for UWaterloo Study Room Finder
-- Multi-user with auth, expanded room status (people, yappers, music)

-- Rooms with UWaterloo building
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  building text default '',
  created_at timestamptz default now()
);

-- Add building column if migrating from old schema
alter table public.rooms add column if not exists building text default '';

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
  yappers_count int default 0,
  has_music boolean default false,
  created_at timestamptz default now()
);

-- Keep old noise_snapshots for backward compat during migration (optional)
-- Drop if you want a clean start: drop table if exists public.noise_snapshots;

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

-- Seed UWaterloo buildings and rooms (run once; duplicates will be skipped if unique exists)
insert into public.rooms (name, description, building) values
  ('DC 1301', 'Davis Centre study area', 'DC'),
  ('DC 1351', 'Davis Centre collaboration space', 'DC'),
  ('MC 4th Floor', 'Math building quiet zone', 'MC'),
  ('SLC Great Hall', 'Student Life Centre main area', 'SLC'),
  ('SLC 3rd Floor', 'Quieter study spots', 'SLC'),
  ('Dana Porter 4th', 'Porter library silent floor', 'DP'),
  ('Dana Porter 2nd', 'Porter library group area', 'DP'),
  ('E7 2nd Floor', 'Engineering lounge', 'E7');
