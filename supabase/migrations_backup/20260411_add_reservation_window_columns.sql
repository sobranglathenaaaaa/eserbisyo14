begin;

alter table public.reservations
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz;

update public.reservations
set
  start_at = coalesce(start_at, (date::text || 'T08:00:00+08:00')::timestamptz),
  end_at = coalesce(end_at, (date::text || 'T17:00:00+08:00')::timestamptz)
where start_at is null or end_at is null;

create index if not exists reservations_tenant_resource_start_at_idx
  on public.reservations (tenant_id, resource, start_at);

create index if not exists reservations_tenant_resource_end_at_idx
  on public.reservations (tenant_id, resource, end_at);

commit;
