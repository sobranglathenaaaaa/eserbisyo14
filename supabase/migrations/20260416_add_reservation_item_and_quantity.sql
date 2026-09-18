alter table public.reservations
  add column if not exists item_name text,
  add column if not exists quantity_requested integer;

update public.reservations
set
  item_name = coalesce(nullif(item_name, ''), initcap(replace(resource, '_', ' '))),
  quantity_requested = coalesce(quantity_requested, 1)
where item_name is null or item_name = '' or quantity_requested is null;

alter table public.reservations
  alter column item_name set not null,
  alter column quantity_requested set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_quantity_requested_check'
  ) then
    alter table public.reservations
      add constraint reservations_quantity_requested_check check (quantity_requested > 0);
  end if;
end $$;
