-- The live admin_users_role_check constraint currently permits only 'admin'.
-- The admin-assistants Edge Function writes 'assistant', so explicitly allow
-- that application role while keeping all other role values rejected.
alter table public.admin_users
  drop constraint if exists admin_users_role_check,
  add constraint admin_users_role_check
  check (role in ('admin', 'assistant'));
