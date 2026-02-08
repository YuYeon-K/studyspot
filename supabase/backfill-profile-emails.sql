-- Run once to backfill email in profiles for existing users (enables username login)
-- Run in Supabase SQL Editor
update public.profiles p
set email = au.email
from auth.users au
where p.user_id = au.id
  and (p.email is null or p.email = '');
