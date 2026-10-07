begin;

create table if not exists public.doctor_availability_slots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  doctor_name text not null,
  date date not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_blocked boolean not null default false,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctor_availability_slots_30_min_window check (end_at = start_at + interval '30 minutes')
);

create index if not exists doctor_availability_slots_tenant_date_idx
  on public.doctor_availability_slots (tenant_id, date, start_at);

create unique index if not exists doctor_availability_slots_tenant_doctor_start_end_uq
  on public.doctor_availability_slots (tenant_id, doctor_name, start_at, end_at);

create table if not exists public.checkup_appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  resident_id uuid not null references public.profiles (id) on delete cascade,
  slot_id uuid not null references public.doctor_availability_slots (id) on delete restrict,
  doctor_name text not null,
  date date not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'completed', 'declined', 'cancelled')),
  staff_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checkup_appointments_tenant_date_idx
  on public.checkup_appointments (tenant_id, date, start_at);

create index if not exists checkup_appointments_tenant_resident_idx
  on public.checkup_appointments (tenant_id, resident_id, created_at desc);

create unique index if not exists checkup_appointments_slot_active_uq
  on public.checkup_appointments (slot_id)
  where status in ('pending', 'approved', 'completed');

alter table public.doctor_availability_slots enable row level security;
alter table public.checkup_appointments enable row level security;

drop policy if exists "tenant_access" on public.doctor_availability_slots;
create policy "tenant_access" on public.doctor_availability_slots
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.checkup_appointments;
create policy "tenant_access" on public.checkup_appointments
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

commit;
