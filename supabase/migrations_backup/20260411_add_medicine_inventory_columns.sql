begin;

alter table public.medicines
  add column if not exists quantity integer,
  add column if not exists unit text,
  add column if not exists expiry_date date;

with extracted as (
  select
    id,
    regexp_match(description, '^\\s*(\\d+)\\s+([^()]+?)(?:\\s*\\(exp\\s*(\\d{4}-\\d{2}-\\d{2})\\))?\\s*$') as parsed
  from public.medicines
)
update public.medicines m
set
  quantity = coalesce(m.quantity, nullif((e.parsed)[1], '')::integer, 0),
  unit = coalesce(nullif(trim(m.unit), ''), nullif(trim((e.parsed)[2]), ''), 'unit'),
  expiry_date = coalesce(m.expiry_date, nullif((e.parsed)[3], '')::date)
from extracted e
where e.id = m.id;

update public.medicines
set
  quantity = coalesce(quantity, 0),
  unit = coalesce(nullif(trim(unit), ''), 'unit')
where quantity is null or unit is null or trim(unit) = '';

alter table public.medicines
  alter column quantity set default 0,
  alter column quantity set not null,
  alter column unit set default 'unit',
  alter column unit set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'medicines_quantity_non_negative_check'
      and conrelid = 'public.medicines'::regclass
  ) then
    alter table public.medicines
      add constraint medicines_quantity_non_negative_check check (quantity >= 0);
  end if;
end;
$$;

update public.medicines
set available = (quantity > 0)
where available is distinct from (quantity > 0);

create index if not exists idx_medicines_tenant_active_quantity
  on public.medicines (tenant_id, quantity)
  where is_deleted = false;

create index if not exists idx_medicines_tenant_active_expiry
  on public.medicines (tenant_id, expiry_date)
  where is_deleted = false;

commit;
