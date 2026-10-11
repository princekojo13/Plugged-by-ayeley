-- Product writes invoke this text-only helper from the products_before_write trigger.
-- Keep anonymous execution disabled; authenticated writes are still guarded by products_admin_all RLS.
grant execute on function public.slugify(text) to authenticated;
