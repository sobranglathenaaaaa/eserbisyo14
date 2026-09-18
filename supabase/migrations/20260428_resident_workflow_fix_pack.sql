alter table public.document_requests
  add column if not exists selected_type_label text,
  add column if not exists feedback_prompted_at timestamptz;

alter table public.incident_reports
  add column if not exists other_category_text text;

do $$
declare
  row_record record;
begin
  for row_record in
    select conname
    from pg_constraint
    where conrelid = 'public.incident_reports'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%kind in (%incident%blotter%)%'
  loop
    execute format('alter table public.incident_reports drop constraint %I', row_record.conname);
  end loop;
end $$;

create table if not exists public.incident_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.incident_categories enable row level security;

drop policy if exists "tenant_access" on public.incident_categories;
create policy "tenant_access" on public.incident_categories
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

create index if not exists idx_incident_categories_tenant_id
  on public.incident_categories (tenant_id);
create index if not exists idx_incident_categories_tenant_active_sort
  on public.incident_categories (tenant_id, is_active, sort_order, created_at desc);
create unique index if not exists incident_categories_tenant_name_uq
  on public.incident_categories (tenant_id, lower(name));

delete from public.feedback f
using (
  select id
  from (
    select
      id,
      row_number() over (
        partition by tenant_id, request_id, resident_id
        order by created_at desc, id desc
      ) as row_num
    from public.feedback
  ) deduped
  where deduped.row_num > 1
) duplicates
where f.id = duplicates.id;

create unique index if not exists feedback_tenant_request_resident_uq
  on public.feedback (tenant_id, request_id, resident_id);

insert into public.incident_categories (tenant_id, name, is_active, sort_order)
select tenant.id, seed.name, true, seed.sort_order
from public.tenants tenant
cross join (
  values
    ('Incident', 10),
    ('Blotter', 20),
    ('Others', 999)
) as seed(name, sort_order)
where not exists (
  select 1
  from public.incident_categories existing
  where existing.tenant_id = tenant.id
    and lower(existing.name) = lower(seed.name)
);
