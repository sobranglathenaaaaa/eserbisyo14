begin;

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.equipment
  add column if not exists quantity integer not null default 1;

update public.equipment
set quantity = case
  when lower(name) = 'tables' then 20
  when lower(name) = 'chairs' then 100
  when lower(name) = 'ladder' then 5
  else 1
end
where quantity is null or quantity = 0;

commit;
