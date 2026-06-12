-- The log_order_status trigger runs as the calling user (customer placing an order),
-- who has no INSERT policy on order_status_history (inserts are supposed to be
-- trigger-only). Adding SECURITY DEFINER lets the function bypass RLS.
create or replace function public.log_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;
