-- Repairs environments where public.generated_documents was manually dropped
-- and recreated outside the migration chain. OCR issuance and document
-- completion both insert into this table through the Supabase Data API, so the
-- table must exist, have the expected columns, grants, RLS policy, and be
-- visible in PostgREST's schema cache.

create table if not exists public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id(),
  request_id uuid,
  document_type text,
  resident_name text,
  date_issued date,
  processed_by uuid,
  verification_status text,
  qr_payload text,
  digital_seal boolean,
  e_signature_name text
);

alter table public.generated_documents
  add column if not exists id uuid,
  add column if not exists tenant_id uuid,
  add column if not exists request_id uuid,
  add column if not exists document_type text,
  add column if not exists resident_name text,
  add column if not exists date_issued date,
  add column if not exists processed_by uuid,
  add column if not exists verification_status text,
  add column if not exists qr_payload text,
  add column if not exists digital_seal boolean,
  add column if not exists e_signature_name text;

update public.generated_documents
set
  id = coalesce(id, gen_random_uuid()),
  tenant_id = coalesce(tenant_id, public.current_tenant_id()),
  document_type = coalesce(document_type, 'Generated Document'),
  resident_name = coalesce(resident_name, 'Resident'),
  date_issued = coalesce(date_issued, current_date),
  verification_status = coalesce(verification_status, 'verified'),
  digital_seal = coalesce(digital_seal, false);

alter table public.generated_documents
  alter column id set default gen_random_uuid(),
  alter column id set not null,
  alter column tenant_id set default public.current_tenant_id(),
  alter column tenant_id set not null,
  alter column document_type set not null,
  alter column resident_name set not null,
  alter column date_issued set not null,
  alter column verification_status set not null,
  alter column digital_seal set default false,
  alter column digital_seal set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.generated_documents'::regclass
      and contype = 'p'
  ) then
    alter table public.generated_documents
      add constraint generated_documents_pkey primary key (id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.generated_documents'::regclass
      and conname = 'generated_documents_verification_status_check'
  ) then
    alter table public.generated_documents
      add constraint generated_documents_verification_status_check
      check (verification_status in ('verified', 'pending'));
  end if;
end $$;

create unique index if not exists idx_generated_documents_id_unique
  on public.generated_documents (id);

alter table public.generated_documents
  drop constraint if exists generated_documents_tenant_id_fkey;
alter table public.generated_documents
  add constraint generated_documents_tenant_id_fkey
  foreign key (tenant_id) references public.tenants (id)
  not valid;

alter table public.generated_documents
  drop constraint if exists generated_documents_request_id_fkey;
alter table public.generated_documents
  add constraint generated_documents_request_id_fkey
  foreign key (request_id) references public.document_requests (id)
  on delete set null
  not valid;

alter table public.generated_documents
  drop constraint if exists generated_documents_processed_by_fkey;
alter table public.generated_documents
  add constraint generated_documents_processed_by_fkey
  foreign key (processed_by) references public.profiles (id)
  on delete set null
  not valid;

alter table public.ocr_issuances
  add column if not exists generated_document_id uuid;

alter table public.ocr_issuances
  drop constraint if exists ocr_issuances_generated_document_id_fkey;
alter table public.ocr_issuances
  add constraint ocr_issuances_generated_document_id_fkey
  foreign key (generated_document_id) references public.generated_documents (id)
  on delete set null
  not valid;

alter table public.generated_documents enable row level security;

drop policy if exists "tenant_access" on public.generated_documents;
create policy "tenant_access" on public.generated_documents
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

grant usage on schema public to authenticated, service_role;
grant select on table public.generated_documents to authenticated;
grant all privileges on table public.generated_documents to service_role;

create index if not exists idx_generated_documents_tenant_id
  on public.generated_documents (tenant_id);
create index if not exists idx_generated_documents_processed_by
  on public.generated_documents (processed_by);
create index if not exists idx_generated_documents_request_id
  on public.generated_documents (request_id);

notify pgrst, 'reload schema';
