-- Optional production hardening for the Ayeley Store Assistant.
-- This creates a shared rate limiter in Postgres so the public
-- assistant endpoint cannot be called without a limit.

create table if not exists public.store_assistant_rate_limits (
  key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.store_assistant_rate_limits enable row level security;

revoke all on public.store_assistant_rate_limits from anon;
revoke all on public.store_assistant_rate_limits from authenticated;

create or replace function public.check_store_assistant_rate_limit(
  p_key text,
  p_max_requests integer default 30,
  p_window_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_now timestamptz := now();
  v_row public.store_assistant_rate_limits;
begin
  if p_key is null
     or length(trim(p_key)) < 8
     or p_max_requests < 1
     or p_window_seconds < 1 then
    return false;
  end if;

  insert into public.store_assistant_rate_limits (
    key,
    window_started_at,
    request_count,
    updated_at
  )
  values (
    p_key,
    v_now,
    1,
    v_now
  )
  on conflict (key)
  do update set
    window_started_at = case
      when extract(epoch from (v_now - store_assistant_rate_limits.window_started_at)) >= p_window_seconds
      then v_now
      else store_assistant_rate_limits.window_started_at
    end,
    request_count = case
      when extract(epoch from (v_now - store_assistant_rate_limits.window_started_at)) >= p_window_seconds
      then 1
      else store_assistant_rate_limits.request_count + 1
    end,
    updated_at = v_now
  returning * into v_row;

  return v_row.request_count <= p_max_requests;
end;
$function$;

revoke execute on function public.check_store_assistant_rate_limit(text, integer, integer)
from public, anon, authenticated;
