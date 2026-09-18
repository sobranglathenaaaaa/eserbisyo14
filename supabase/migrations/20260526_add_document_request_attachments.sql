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

alter table public.document_request_attachments enable row level security;

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

create index if not exists idx_document_request_attachments_tenant_id
  on public.document_request_attachments (tenant_id);
create index if not exists idx_document_request_attachments_request_id
  on public.document_request_attachments (request_id);
create index if not exists idx_document_request_attachments_uploaded_by
  on public.document_request_attachments (uploaded_by);
create index if not exists idx_document_request_attachments_created_at
  on public.document_request_attachments (created_at);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'document-request-attachments',
  'document-request-attachments',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "document_request_attachments_service_role_all" on storage.objects;
create policy "document_request_attachments_service_role_all" on storage.objects
  for all
  to service_role
  using (bucket_id = 'document-request-attachments')
  with check (bucket_id = 'document-request-attachments');
