-- Run in Supabase SQL Editor to add default study spots to an existing database.
-- Safe to run multiple times — skips rows with duplicate names.

insert into public.rooms (name, description, building, spot_type, latitude, longitude)
select * from (values
  ('DC Library',  'Davis Centre library — quiet study area', 'DC',    'room', 43.4723, -80.5408),
  ('MC 2030',     'Math building room 2030',                 'MC',    'room', 43.4728, -80.5449),
  ('Williams Cafe','Coffee, snacks, study vibes',            'Plaza', 'cafe', 43.4713, -80.5448)
) as v(name, description, building, spot_type, latitude, longitude)
where not exists (
  select 1 from public.rooms r where r.name = v.name
);
