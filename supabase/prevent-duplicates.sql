-- Run this AFTER remove-duplicates.sql to prevent future duplicates
-- Run in Supabase SQL Editor

-- Ensure no nulls in key columns
update public.rooms set building = '' where building is null;
update public.rooms set spot_type = 'room' where spot_type is null;

-- Add unique constraint (drop first in case re-running)
alter table public.rooms drop constraint if exists rooms_name_building_spot_type_unique;
alter table public.rooms 
add constraint rooms_name_building_spot_type_unique 
unique (name, building, spot_type);
