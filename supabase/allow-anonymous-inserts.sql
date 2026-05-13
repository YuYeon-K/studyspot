-- Run in Supabase SQL Editor to allow unauthenticated users to add places and report status.

-- Make user_id nullable so anonymous (non-logged-in) reports can be submitted
ALTER TABLE public.room_status ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.room_status DROP CONSTRAINT IF EXISTS room_status_user_id_fkey;
ALTER TABLE public.room_status
  ADD CONSTRAINT room_status_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Allow anyone (including unauthenticated) to insert room_status reports
DROP POLICY IF EXISTS "Authenticated can insert room_status" ON public.room_status;
DROP POLICY IF EXISTS "Anyone can insert room_status" ON public.room_status;
CREATE POLICY "Anyone can insert room_status" ON public.room_status
  FOR INSERT WITH CHECK (true);

-- Allow anyone to add places
DROP POLICY IF EXISTS "Authenticated can insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can insert rooms" ON public.rooms;
CREATE POLICY "Anyone can insert rooms" ON public.rooms
  FOR INSERT WITH CHECK (true);
