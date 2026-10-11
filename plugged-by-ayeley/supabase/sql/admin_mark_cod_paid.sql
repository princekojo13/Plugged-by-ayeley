-- Let admins record COD payments only after cash or Mobile Money is received.
create or replace function public.admin_mark_cod_paid(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_paid_at timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.payment_method <> 'cash_on_delivery' then
    raise exception 'Only Pay on Delivery payments can be marked received here';
  end if;

  if v_order.order_status = 'cancelled' then
    raise exception 'A cancelled order cannot be marked paid';
  end if;

  if v_order.payment_status = 'paid' then
    return jsonb_build_object(
      'ok', true,
      'order_id', v_order.id,
      'payment_status', v_order.payment_status,
      'paid_at', v_order.paid_at,
      'amount_paid', v_order.amount_paid,
      'already_paid', true
    );
  end if;

  if v_order.payment_status not in ('pending', 'failed') then
    raise exception 'This order is not awaiting payment';
  end if;

  v_paid_at := now();
  update public.orders
  set payment_status = 'paid',
      paid_at = v_paid_at,
      amount_paid = total,
      updated_at = v_paid_at,
      payment_metadata = coalesce(payment_metadata, '{}'::jsonb) ||
        jsonb_build_object(
          'payment_status_source', 'admin_marked_cod_received',
          'marked_paid_by', auth.uid(),
          'marked_paid_at', v_paid_at
        )
  where id = p_order_id;

  return jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'payment_status', 'paid',
    'paid_at', v_paid_at,
    'amount_paid', v_order.total,
    'already_paid', false
  );
end;
$$;

revoke all on function public.admin_mark_cod_paid(uuid) from public, anon;
grant execute on function public.admin_mark_cod_paid(uuid) to authenticated;
