-- Run in Supabase SQL Editor to allow authenticated users to edit places
-- (If you already ran the full schema.sql, this is included)

drop policy if exists "Admin can update rooms" on public.rooms;
drop policy if exists "Authenticated can update rooms" on public.rooms;
create policy "Authenticated can update rooms" on public.rooms for update using (
  auth.role() = 'authenticated'
);
