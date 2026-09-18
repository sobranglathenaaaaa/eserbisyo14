begin;

create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  name text not null,
  specialization text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists doctors_tenant_idx on public.doctors (tenant_id);

alter table public.doctors enable row level security;

drop policy if exists "tenant_access" on public.doctors;
create policy "tenant_access" on public.doctors
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

-- Update doctor_availability_slots
alter table public.doctor_availability_slots add column if not exists capacity integer not null default 7;
alter table public.doctor_availability_slots add constraint doctor_availability_slots_capacity_check check (capacity >= 5 and capacity <= 15);

-- Drop the unique constraint so multiple bookings can exist per slot
alter table public.checkup_appointments drop constraint if exists checkup_appointments_slot_active_uq;
drop index if exists public.checkup_appointments_slot_active_uq;

commit;
