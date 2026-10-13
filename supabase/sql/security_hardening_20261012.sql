-- Tighten client access to backend-only order functions and make the
-- intentionally private guest-order rate-limit table explicit to the linter.
-- Authenticated execution remains only for admin_mark_cod_paid, is_admin,
-- and update_staff_order_status: those are used by staff UI/RLS and each
-- verifies the caller's admin or assistant role internally.

revoke all on function public.admin_cancel_order(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.admin_cancel_order(uuid, boolean)
  to service_role;

revoke all on function public.confirm_cod_order(uuid)
  from public, anon, authenticated;
grant execute on function public.confirm_cod_order(uuid)
  to service_role;

revoke all on function public.deduct_order_stock(uuid)
  from public, anon, authenticated;
grant execute on function public.deduct_order_stock(uuid)
  to service_role;

drop policy if exists customer_order_lookup_attempts_deny_client_access
  on public.customer_order_lookup_attempts;
create policy customer_order_lookup_attempts_deny_client_access
  on public.customer_order_lookup_attempts
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.guest_order_access_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique
    check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (email = lower(btrim(email)))
);

alter table public.guest_order_access_tokens enable row level security;
revoke all on table public.guest_order_access_tokens
  from public, anon, authenticated;
grant select, insert, update, delete on table public.guest_order_access_tokens
  to service_role;

drop policy if exists guest_order_access_tokens_deny_client_access
  on public.guest_order_access_tokens;
create policy guest_order_access_tokens_deny_client_access
  on public.guest_order_access_tokens
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create index if not exists guest_order_access_tokens_expiry_idx
  on public.guest_order_access_tokens (expires_at);

create index if not exists guest_order_access_tokens_email_expiry_idx
  on public.guest_order_access_tokens (email, expires_at desc);
