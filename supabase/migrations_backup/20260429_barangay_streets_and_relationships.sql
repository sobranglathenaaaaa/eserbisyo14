-- Migration: Create tables for barangay_streets and incident_relationships
-- Created: 2026-04-29

-- 1. Table: barangay_streets
create table if not exists public.barangay_streets (
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

alter table public.barangay_streets enable row level security;

drop policy if exists "tenant_access" on public.barangay_streets;
create policy "tenant_access" on public.barangay_streets
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

create index if not exists idx_barangay_streets_tenant_id
  on public.barangay_streets (tenant_id);
create index if not exists idx_barangay_streets_tenant_active_sort
  on public.barangay_streets (tenant_id, is_active, sort_order, created_at desc);
create unique index if not exists barangay_streets_tenant_name_uq
  on public.barangay_streets (tenant_id, lower(name));

-- 2. Table: incident_relationships
create table if not exists public.incident_relationships (
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

alter table public.incident_relationships enable row level security;

drop policy if exists "tenant_access" on public.incident_relationships;
create policy "tenant_access" on public.incident_relationships
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

create index if not exists idx_incident_relationships_tenant_id
  on public.incident_relationships (tenant_id);
create index if not exists idx_incident_relationships_tenant_active_sort
  on public.incident_relationships (tenant_id, is_active, sort_order, created_at desc);
create unique index if not exists incident_relationships_tenant_name_uq
  on public.incident_relationships (tenant_id, lower(name));
