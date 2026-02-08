-- Remove duplicate places (keeps the oldest row per name+building+spot_type)
-- Run this in Supabase SQL Editor

-- 1. See duplicates first (optional - run to inspect):
-- select name, building, spot_type, count(*) 
-- from public.rooms 
-- group by name, building, spot_type 
-- having count(*) > 1;

-- 2. Delete duplicates (keeps one row per unique name+building+spot_type)
delete from public.rooms
where id in (
  select id from (
    select id,
      row_number() over (partition by name, building, coalesce(spot_type, 'room') order by created_at) as rn
    from public.rooms
  ) t
  where t.rn > 1
);
