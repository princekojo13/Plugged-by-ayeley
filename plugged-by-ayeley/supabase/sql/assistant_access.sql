-- Assistants can sign in and read orders/order items. They do not get access to
-- customer contact messages, wholesale enquiries, or administrator controls.

create or replace function public.is_assistant()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = (select auth.uid())
      and au.role = 'assistant'
  );
$$;

revoke all on function public.is_assistant() from public, anon;
grant execute on function public.is_assistant() to authenticated;

drop policy if exists assistants_can_read_orders on public.orders;
create policy assistants_can_read_orders
on public.orders
for select
to authenticated
using (public.is_assistant());
drop policy if exists assistants_can_read_order_items on public.order_items;
create policy assistants_can_read_order_items
on public.order_items
for select
to authenticated
using (public.is_assistant());
