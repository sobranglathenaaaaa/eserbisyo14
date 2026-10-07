begin;

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  quantity integer not null default 1 check (quantity >= 0),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists equipment_tenant_name_unique
  on public.equipment (tenant_id, lower(name));

create index if not exists equipment_tenant_active_idx
  on public.equipment (tenant_id, is_deleted, name);

grant select, insert, update on table public.equipment to authenticated;

grant select, insert, update on table public.equipment to service_role;

alter table public.equipment enable row level security;

drop policy if exists equipment_select_own_tenant on public.equipment;
create policy equipment_select_own_tenant
  on public.equipment for select to authenticated
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

drop policy if exists equipment_insert_own_tenant on public.equipment;
create policy equipment_insert_own_tenant
  on public.equipment for insert to authenticated
  with check (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

drop policy if exists equipment_update_own_tenant on public.equipment;
create policy equipment_update_own_tenant
  on public.equipment for update to authenticated
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()))
  with check (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

commit;
