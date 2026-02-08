-- Run this if you already have the app set up and want to add cafes, crowd level, map
-- Skip if you're running the full schema.sql for the first time

alter table public.rooms add column if not exists spot_type text default 'room';
alter table public.rooms add column if not exists latitude float8;
alter table public.rooms add column if not exists longitude float8;
alter table public.room_status add column if not exists crowd_level text;

-- Add plaza cafes (with coordinates)
insert into public.rooms (name, description, building, spot_type, latitude, longitude) values
  ('Williams Fresh Cafe', 'Coffee, snacks, study vibes', 'Plaza', 'cafe', 43.4713, -80.5448),
  ('Now Tea', 'Bubble tea and study spot', 'Plaza', 'cafe', 43.4712, -80.5449),
  ('Tsujiri', 'Japanese-inspired cafe', 'Plaza', 'cafe', 43.4714, -80.5451),
  ('Gong Cha', 'Bubble tea, plaza', 'Plaza', 'cafe', 43.4711, -80.5447);
