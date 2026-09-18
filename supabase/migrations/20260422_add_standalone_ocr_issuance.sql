alter table public.generated_documents
  alter column request_id drop not null;

create table if not exists public.ocr_issuances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  created_by uuid references public.profiles (id) on delete set null,
  resident_id uuid references public.profiles (id) on delete set null,
  template_key text not null,
  template_version text not null,
  status text not null default 'draft' check (status in ('draft', 'ocr_completed', 'issued')),
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

alter table public.ocr_issuances enable row level security;

drop policy if exists "tenant_access" on public.ocr_issuances;
create policy "tenant_access" on public.ocr_issuances
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

create index if not exists idx_ocr_issuances_tenant_id on public.ocr_issuances (tenant_id);
create index if not exists idx_ocr_issuances_resident_id on public.ocr_issuances (resident_id);
create index if not exists idx_ocr_issuances_status on public.ocr_issuances (status);
