-- Keep multiple short-lived access links valid for the same guest email.
-- This prevents repeated requests from invalidating a link already in the inbox.
alter table public.guest_order_access_tokens
  add column if not exists id uuid default gen_random_uuid();

update public.guest_order_access_tokens
set id = gen_random_uuid()
where id is null;

alter table public.guest_order_access_tokens
  alter column id set not null;

alter table public.guest_order_access_tokens
  drop constraint if exists guest_order_access_tokens_pkey;

alter table public.guest_order_access_tokens
  add constraint guest_order_access_tokens_pkey primary key (id);

create index if not exists guest_order_access_tokens_email_expiry_idx
  on public.guest_order_access_tokens (email, expires_at desc);
