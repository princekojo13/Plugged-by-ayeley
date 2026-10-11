-- Checkout runs through the validated create-order Edge Function.
-- Prevent public clients from bypassing its store-closed and delivery checks.
revoke execute on function public.create_order(
  text, text, text, text, numeric, numeric, text, jsonb,
  text, text, text, text
) from public, anon, authenticated;

grant execute on function public.create_order(
  text, text, text, text, numeric, numeric, text, jsonb,
  text, text, text, text
) to service_role;
