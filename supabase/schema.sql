begin;

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'staff', 'resident');
  end if;
  if not exists (select 1 from pg_type where typname = 'request_status') then
    create type request_status as enum ('pending', 'staff_reviewed', 'approved', 'ready_for_pickup', 'completed', 'declined', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type report_status as enum ('pending', 'approved', 'under_review', 'proceed_to_barangay', 'resolved', 'declined');
  end if;
  if not exists (select 1 from pg_type where typname = 'reservation_status') then
    create type reservation_status as enum ('pending', 'approved', 'declined', 'cancelled', 'ready_for_pickup', 'received', 'returned', 'completed');
  end if;
  if not exists (select 1 from pg_type where typname = 'queue_status') then
    create type queue_status as enum ('waiting', 'serving', 'completed', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type notification_type as enum ('account', 'request', 'report', 'system');
  end if;
end $$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.tenants (slug, name)
values ('default', 'Default Tenant')
on conflict (slug) do nothing;

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.tenants where slug = 'default' limit 1
$$;

create or replace function public.has_role(role user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = role
      and p.is_deleted = false
  )
$$;

create or replace function public.is_tenant_member(tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.tenant_id = tenant_id
      and p.is_deleted = false
  )
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  full_name text not null,
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
  sex text,
  civil_status text,
  citizenship text,
  birthdate date,
  address text,
  address_line text,
  province text,
  city text,
  barangay text,
  email text not null,
  phone text,
  id_type text,
  id_number text,
  id_file_name text,
  id_file_path text,
  id_file_name_back text,
  id_file_path_back text,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  role user_role not null default 'resident',
  locale text not null default 'en' check (locale in ('en', 'fil')),
  is_deleted boolean not null default false,
  is_verified boolean not null default false,
  approval_status text not null default 'admin_approved' check (approval_status in ('pending_staff_review', 'staff_forwarded_to_admin', 'staff_rejected', 'admin_approved', 'admin_rejected')),
  staff_reviewed_by uuid references public.profiles (id) on delete set null,
  staff_reviewed_at timestamptz,
  staff_review_note text,
  approval_reviewed_by uuid references public.profiles (id) on delete set null,
  approval_reviewed_at timestamptz,
  approval_review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);

create table if not exists public.document_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  category text not null,
  type text not null,
  price numeric(10, 2) not null default 0,
  pricing_note text
);

create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  reference_number text not null,
  resident_id uuid not null references public.profiles (id) on delete cascade,
  type_id uuid not null references public.document_types (id),
  purpose text not null,
  amount numeric(10, 2) not null default 0,
  status request_status not null default 'pending',
  admin_decision_reason text,
  processing_decline_reason text,
  processed_by uuid references public.profiles (id) on delete set null,
  feedback_prompted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  name text not null,
  body text not null,
  dynamic_fields text[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create table if not exists public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  request_id uuid references public.document_requests (id) on delete set null,
  document_type text not null,
  resident_name text not null,
  date_issued date not null,
  processed_by uuid references public.profiles (id) on delete set null,
  verification_status text not null check (verification_status in ('verified', 'pending')),
  qr_payload text,
  digital_seal boolean not null default false,
  e_signature_name text
);

create table if not exists public.document_request_attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  request_id uuid not null references public.document_requests (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  file_name text not null,
  file_path text not null unique,
  mime_type text,
  file_size_bytes integer,
  created_at timestamptz not null default now()
);

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  resident_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  track_type text not null default 'incident',
  desired_action text not null default 'none',
  title text not null,
  details text not null,
  location text not null,
  date_of_incident date not null,
  other_category_text text,
  relationship_to_respondent text,
  street_name text,
  specific_location text,
  parties jsonb not null default '[]'::jsonb,
  action_log jsonb,
  proceedings jsonb not null default '[]'::jsonb,
  cfa jsonb,
  pnp_referral jsonb,
  status report_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  request_id uuid references public.document_requests (id),
  resident_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null,
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  title text not null,
  body text not null,
  audience text not null check (audience in ('all', 'resident', 'staff')),
  start_at timestamptz not null default now(),
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  constraint announcements_schedule_window_check check (end_at is null or end_at > start_at)
);

create table if not exists public.census_records (
  resident_id uuid primary key references public.profiles (id) on delete cascade,
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  household_size integer not null,
  minors_count integer not null,
  ownership_status text not null check (ownership_status in ('owned', 'rented')),
  residency_classification text not null check (
    residency_classification in ('owner', 'permanent_resident', 'informal_settler', 'tenant_renter', 'boarder_lodger', 'temporary_resident')
  ),
  permanent_resident_years integer check (permanent_resident_years is null or permanent_resident_years >= 0),
  years_of_residence_months integer check (years_of_residence_months is null or (years_of_residence_months >= 0 and years_of_residence_months <= 11)),
  constraint census_records_residency_by_ownership_check check (
    (ownership_status = 'owned' and residency_classification in ('owner', 'permanent_resident', 'informal_settler'))
    or (ownership_status = 'rented' and residency_classification in ('tenant_renter', 'boarder_lodger', 'temporary_resident'))
  ),
  constraint census_records_residence_length_check check (
    coalesce(permanent_resident_years, 0) + coalesce(years_of_residence_months, 0) > 0
  ),
  updated_at timestamptz not null default now()
);

create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  resident_id uuid not null references public.profiles (id) on delete cascade,
  service text not null,
  status queue_status not null default 'waiting',
  position integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  resident_id uuid not null references public.profiles (id) on delete cascade,
  resource text not null check (resource in ('barangay_hall', 'covered_court', 'equipment', 'service_vehicle')),
  item_name text not null,
  quantity_requested integer not null check (quantity_requested > 0),
  date date not null,
  start_at timestamptz,
  end_at timestamptz,
  time_slot text,
  purpose text not null,
  status reservation_status not null default 'pending',
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  name text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.equipment (tenant_id, name)
values (public.current_tenant_id(), 'Tables'), (public.current_tenant_id(), 'Chairs'), (public.current_tenant_id(), 'Ladder')
on conflict do nothing;

create index if not exists idx_equipment_tenant_id on public.equipment (tenant_id);

alter table public.equipment enable row level security;
drop policy if exists "tenant_access" on public.equipment;
create policy "tenant_access" on public.equipment
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

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
  status text not null default 'pending' check (status in ('pending', 'approved', 'proceed_to_barangay', 'completed', 'declined', 'cancelled')),
  staff_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  name text not null,
  description text,
  quantity integer not null default 0 check (quantity >= 0),
  unit text not null default 'unit',
  expiry_date date,
  available boolean not null default true,
  is_deleted boolean not null default false,
  updated_at timestamptz not null default now()
);

-- `public.medicine_requests` removed: table and indexes deleted per request

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  type notification_type not null,
  priority text not null default 'info' check (priority in ('info', 'warning', 'urgent')),
  event_key text not null default 'legacy.unknown',
  entity_type text,
  entity_id text,
  action_href text,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  to_user_id uuid references public.profiles (id) on delete cascade,
  to_email text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.email_verification_tokens (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
    user_id uuid not null references public.profiles (id) on delete cascade,
    email text not null,
    token_hash text not null unique,
    attempt_count integer not null default 0,
    max_attempts integer not null default 5,
    expires_at timestamptz not null,
    used_at timestamptz,
    last_sent_at timestamptz,
    created_at timestamptz not null default now()
  );

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  action text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role user_role not null,
  target_id text,
  context text,
  created_at timestamptz not null default now()
);

create table if not exists public.ocr_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  resident_id uuid not null references public.profiles (id) on delete cascade,
  request_id uuid references public.document_requests (id) on delete set null,
  file_name text not null,
  template_key text,
  template_version text,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  mime_type text,
  file_size_bytes integer,
  file_path text,
  model_name text,
  error_message text,
  extracted_text text,
  parsed_fields jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.ocr_issuances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  created_by uuid references public.profiles (id) on delete set null,
  resident_id uuid references public.profiles (id) on delete set null,
  template_key text not null,
  template_version text not null,
  status text not null default 'draft' check (status in ('draft', 'ocr_completed', 'issued')),
  ocr_progress_percent integer check (ocr_progress_percent is null or (ocr_progress_percent >= 0 and ocr_progress_percent <= 100)),
  source_file_name text,
  source_file_path text,
  source_mime_type text,
  source_file_size_bytes integer,
  extracted_text text,
  parsed_fields jsonb not null default '{}'::jsonb,
  required_fields text[] not null default '{}'::text[],
  model_name text,
  error_message text,
  linked_request_id uuid references public.document_requests (id) on delete set null,
  generated_document_id uuid references public.generated_documents (id) on delete set null,
  issued_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  resident_id uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  sender text not null check (sender in ('resident', 'assistant')),
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.digital_ids (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  resident_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  address text not null,
  issued_at timestamptz not null default now(),
  valid_until date not null
);

create table if not exists public.app_meta (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  id_counters jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  slug text not null check (slug in ('terms-and-conditions', 'data-privacy')),
  title text not null,
  description text not null,
  body text not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  source_kind text not null check (source_kind in ('how_to_use', 'document_catalog', 'role_pages', 'requirements', 'chatbot_context')),
  source_key text not null,
  title text not null,
  section text not null,
  body text not null,
  locale text not null default 'both' check (locale in ('en', 'fil', 'both')),
  keywords text[] not null default '{}',
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, source_kind, source_key, section, locale)
);

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.document_types enable row level security;
alter table public.document_requests enable row level security;
alter table public.document_templates enable row level security;
alter table public.generated_documents enable row level security;
alter table public.document_request_attachments enable row level security;
alter table public.incident_reports enable row level security;
alter table public.feedback enable row level security;
alter table public.announcements enable row level security;
alter table public.census_records enable row level security;
alter table public.queue_entries enable row level security;
alter table public.reservations enable row level security;
alter table public.doctor_availability_slots enable row level security;
alter table public.checkup_appointments enable row level security;
alter table public.medicines enable row level security;
-- RLS for `public.medicine_requests` removed
alter table public.notifications enable row level security;
alter table public.email_logs enable row level security;
alter table public.email_verification_tokens enable row level security;
alter table public.audit_logs enable row level security;
alter table public.ocr_jobs enable row level security;
alter table public.ocr_issuances enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.digital_ids enable row level security;
alter table public.app_meta enable row level security;
alter table public.legal_documents enable row level security;
alter table public.knowledge_chunks enable row level security;

drop policy if exists "tenant_access" on public.profiles;
create policy "tenant_access" on public.profiles
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.document_types;
create policy "tenant_access" on public.document_types
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.document_requests;
create policy "tenant_access" on public.document_requests
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.document_templates;
create policy "tenant_access" on public.document_templates
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.generated_documents;
create policy "tenant_access" on public.generated_documents
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

grant select on table public.generated_documents to authenticated;
grant all privileges on table public.generated_documents to service_role;

drop policy if exists "tenant_access" on public.document_request_attachments;
drop policy if exists "document_request_attachments_read" on public.document_request_attachments;
create policy "document_request_attachments_read" on public.document_request_attachments
  for select
  using (
    public.is_tenant_member(tenant_id)
    and (
      public.has_role('admin'::public.user_role)
      or public.has_role('staff'::public.user_role)
      or exists (
        select 1
        from public.document_requests dr
        where dr.id = document_request_attachments.request_id
          and dr.tenant_id = document_request_attachments.tenant_id
          and dr.resident_id = auth.uid()
      )
    )
  );

drop policy if exists "tenant_access" on public.incident_reports;
create policy "tenant_access" on public.incident_reports
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.feedback;
create policy "tenant_access" on public.feedback
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.announcements;
create policy "tenant_access" on public.announcements
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.census_records;
create policy "tenant_access" on public.census_records
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.queue_entries;
create policy "tenant_access" on public.queue_entries
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.reservations;
create policy "tenant_access" on public.reservations
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));
grant select on table public.reservations to authenticated;

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

drop policy if exists "tenant_access" on public.medicines;
create policy "tenant_access" on public.medicines
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

-- tenant_access policy for `public.medicine_requests` removed

drop policy if exists "tenant_access" on public.notifications;
create policy "tenant_access" on public.notifications
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.email_logs;
create policy "tenant_access" on public.email_logs
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.email_verification_tokens;
create policy "tenant_access" on public.email_verification_tokens
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.audit_logs;
create policy "tenant_access" on public.audit_logs
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.ocr_jobs;
create policy "tenant_access" on public.ocr_jobs
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.ocr_issuances;
create policy "tenant_access" on public.ocr_issuances
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.chat_sessions;
create policy "tenant_access" on public.chat_sessions
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.chat_messages;
create policy "tenant_access" on public.chat_messages
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.digital_ids;
create policy "tenant_access" on public.digital_ids
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "tenant_access" on public.app_meta;
create policy "tenant_access" on public.app_meta
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "legal_documents_select_all" on public.legal_documents;
create policy "legal_documents_select_all" on public.legal_documents
  for select
  using (true);

drop policy if exists "legal_documents_admin_write" on public.legal_documents;
create policy "legal_documents_admin_write" on public.legal_documents
  for all
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

drop policy if exists "tenant_access" on public.knowledge_chunks;
create policy "tenant_access" on public.knowledge_chunks
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "allow_all" on public.tenants;
drop policy if exists "tenants_select_authenticated" on public.tenants;
drop policy if exists "tenants_service_role_all" on public.tenants;
create policy "tenants_select_authenticated" on public.tenants
  for select
  to authenticated
  using (true);
create policy "tenants_service_role_all" on public.tenants
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists idx_profiles_tenant_id on public.profiles (tenant_id);
create index if not exists idx_document_types_tenant_id on public.document_types (tenant_id);
create index if not exists idx_document_requests_tenant_id on public.document_requests (tenant_id);
create index if not exists idx_document_requests_resident_id on public.document_requests (resident_id);
create index if not exists idx_document_requests_status on public.document_requests (status);
create index if not exists idx_document_requests_created_at on public.document_requests (created_at);
create index if not exists idx_document_requests_processed_by on public.document_requests (processed_by);
create index if not exists idx_document_requests_type_id on public.document_requests (type_id);
create index if not exists idx_document_templates_tenant_id on public.document_templates (tenant_id);
create index if not exists idx_document_templates_updated_by on public.document_templates (updated_by);
create index if not exists idx_generated_documents_tenant_id on public.generated_documents (tenant_id);
create index if not exists idx_generated_documents_processed_by on public.generated_documents (processed_by);
create index if not exists idx_generated_documents_request_id on public.generated_documents (request_id);
create index if not exists idx_document_request_attachments_tenant_id on public.document_request_attachments (tenant_id);
create index if not exists idx_document_request_attachments_request_id on public.document_request_attachments (request_id);
create index if not exists idx_document_request_attachments_uploaded_by on public.document_request_attachments (uploaded_by);
create index if not exists idx_document_request_attachments_created_at on public.document_request_attachments (created_at);
create index if not exists idx_incident_reports_tenant_id on public.incident_reports (tenant_id);
create index if not exists idx_incident_reports_resident_id on public.incident_reports (resident_id);
create index if not exists idx_incident_reports_status on public.incident_reports (status);
create index if not exists idx_feedback_tenant_id on public.feedback (tenant_id);
create index if not exists idx_feedback_request_id on public.feedback (request_id);
create index if not exists idx_feedback_resident_id on public.feedback (resident_id);
create index if not exists idx_announcements_tenant_id on public.announcements (tenant_id);
create index if not exists idx_announcements_created_by on public.announcements (created_by);
create index if not exists idx_announcements_schedule_window on public.announcements (tenant_id, start_at, end_at);
create index if not exists idx_census_records_tenant_id on public.census_records (tenant_id);
create index if not exists idx_queue_entries_tenant_id on public.queue_entries (tenant_id);
create index if not exists idx_queue_entries_resident_id on public.queue_entries (resident_id);
create index if not exists idx_reservations_tenant_id on public.reservations (tenant_id);
create index if not exists idx_reservations_status on public.reservations (status);
create index if not exists idx_reservations_resident_id on public.reservations (resident_id);
create index if not exists doctor_availability_slots_tenant_date_idx on public.doctor_availability_slots (tenant_id, date, start_at);
create unique index if not exists doctor_availability_slots_tenant_doctor_start_end_uq on public.doctor_availability_slots (tenant_id, doctor_name, start_at, end_at);
create index if not exists checkup_appointments_tenant_date_idx on public.checkup_appointments (tenant_id, date, start_at);
create index if not exists checkup_appointments_tenant_resident_idx on public.checkup_appointments (tenant_id, resident_id, created_at desc);
create unique index if not exists checkup_appointments_slot_active_uq on public.checkup_appointments (slot_id)
  where status in ('pending', 'approved', 'completed');
create index if not exists idx_medicines_tenant_id on public.medicines (tenant_id);
create index if not exists idx_medicines_tenant_active_quantity on public.medicines (tenant_id, quantity)
  where is_deleted = false;
create index if not exists idx_medicines_tenant_active_expiry on public.medicines (tenant_id, expiry_date)
  where is_deleted = false;
-- indexes for `public.medicine_requests` removed
create index if not exists idx_notifications_tenant_id on public.notifications (tenant_id);
create index if not exists idx_notifications_user_id on public.notifications (user_id);
create index if not exists idx_notifications_user_read_created on public.notifications (user_id, read, created_at desc);
create index if not exists idx_notifications_event_entity_created on public.notifications (user_id, event_key, entity_id, created_at desc);
create index if not exists idx_email_logs_tenant_id on public.email_logs (tenant_id);
create index if not exists idx_email_logs_to_user_id on public.email_logs (to_user_id);
create index if not exists idx_email_verification_tokens_tenant_id on public.email_verification_tokens (tenant_id);
create index if not exists idx_email_verification_tokens_user_id on public.email_verification_tokens (user_id);
create index if not exists idx_email_verification_tokens_created_at on public.email_verification_tokens (created_at);
create index if not exists idx_email_verification_tokens_expires_at on public.email_verification_tokens (expires_at);
create index if not exists idx_audit_logs_tenant_id on public.audit_logs (tenant_id);
create index if not exists idx_audit_logs_actor_id on public.audit_logs (actor_id);
create index if not exists idx_ocr_jobs_tenant_id on public.ocr_jobs (tenant_id);
create index if not exists idx_ocr_jobs_resident_id on public.ocr_jobs (resident_id);
create index if not exists idx_ocr_jobs_request_id on public.ocr_jobs (request_id);
create index if not exists idx_ocr_issuances_tenant_id on public.ocr_issuances (tenant_id);
create index if not exists idx_ocr_issuances_resident_id on public.ocr_issuances (resident_id);
create index if not exists idx_ocr_issuances_status on public.ocr_issuances (status);
create index if not exists idx_chat_sessions_tenant_id on public.chat_sessions (tenant_id);
create index if not exists idx_chat_sessions_resident_id on public.chat_sessions (resident_id);
create index if not exists idx_chat_messages_tenant_id on public.chat_messages (tenant_id);
create index if not exists idx_chat_messages_session_id on public.chat_messages (session_id);
create index if not exists idx_digital_ids_tenant_id on public.digital_ids (tenant_id);
create index if not exists idx_digital_ids_resident_id on public.digital_ids (resident_id);
create index if not exists idx_app_meta_tenant_id on public.app_meta (tenant_id);
create index if not exists idx_legal_documents_tenant_id on public.legal_documents (tenant_id);
create index if not exists idx_legal_documents_slug on public.legal_documents (slug);
create index if not exists idx_legal_documents_updated_by on public.legal_documents (updated_by);
create index if not exists idx_knowledge_chunks_tenant_id on public.knowledge_chunks (tenant_id);
create index if not exists idx_knowledge_chunks_source_kind on public.knowledge_chunks (source_kind);
create index if not exists idx_knowledge_chunks_locale on public.knowledge_chunks (locale);
create index if not exists idx_knowledge_chunks_keywords on public.knowledge_chunks using gin (keywords);

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

create index if not exists idx_incident_categories_tenant_id on public.incident_categories (tenant_id);
create index if not exists idx_incident_categories_tenant_active_sort on public.incident_categories (tenant_id, is_active, sort_order, created_at desc);
create unique index if not exists incident_categories_tenant_name_uq on public.incident_categories (tenant_id, lower(name));

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

create index if not exists idx_barangay_streets_tenant_id on public.barangay_streets (tenant_id);
create index if not exists idx_barangay_streets_tenant_active_sort on public.barangay_streets (tenant_id, is_active, sort_order, created_at desc);
create unique index if not exists barangay_streets_tenant_name_uq on public.barangay_streets (tenant_id, lower(name));

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

create index if not exists idx_incident_relationships_tenant_id on public.incident_relationships (tenant_id);
create index if not exists idx_incident_relationships_tenant_active_sort on public.incident_relationships (tenant_id, is_active, sort_order, created_at desc);
create unique index if not exists incident_relationships_tenant_name_uq on public.incident_relationships (tenant_id, lower(name));

commit;
