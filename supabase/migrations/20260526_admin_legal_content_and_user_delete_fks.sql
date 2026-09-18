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

alter table public.legal_documents enable row level security;

drop policy if exists "legal_documents_select_all" on public.legal_documents;
create policy "legal_documents_select_all" on public.legal_documents
  for select
  using (true);

drop policy if exists "legal_documents_admin_write" on public.legal_documents;
create policy "legal_documents_admin_write" on public.legal_documents
  for all
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

create index if not exists idx_legal_documents_tenant_id on public.legal_documents (tenant_id);
create index if not exists idx_legal_documents_slug on public.legal_documents (slug);
create index if not exists idx_legal_documents_updated_by on public.legal_documents (updated_by);

alter table public.generated_documents
  drop constraint if exists generated_documents_request_id_fkey;

alter table public.generated_documents
  add constraint generated_documents_request_id_fkey
  foreign key (request_id)
  references public.document_requests (id)
  on delete set null;

alter table public.document_requests
  drop constraint if exists document_requests_processed_by_fkey;

alter table public.document_requests
  add constraint document_requests_processed_by_fkey
  foreign key (processed_by)
  references public.profiles (id)
  on delete set null;

alter table public.generated_documents
  drop constraint if exists generated_documents_processed_by_fkey;

alter table public.generated_documents
  add constraint generated_documents_processed_by_fkey
  foreign key (processed_by)
  references public.profiles (id)
  on delete set null;

-- Constraints on `public.medicine_requests` removed (table deleted)

alter table public.document_templates
  drop constraint if exists document_templates_updated_by_fkey;

alter table public.document_templates
  add constraint document_templates_updated_by_fkey
  foreign key (updated_by)
  references public.profiles (id)
  on delete set null;

alter table public.announcements
  drop constraint if exists announcements_created_by_fkey;

alter table public.announcements
  add constraint announcements_created_by_fkey
  foreign key (created_by)
  references public.profiles (id)
  on delete set null;

alter table public.audit_logs
  drop constraint if exists audit_logs_actor_id_fkey;

alter table public.audit_logs
  add constraint audit_logs_actor_id_fkey
  foreign key (actor_id)
  references public.profiles (id)
  on delete set null;
