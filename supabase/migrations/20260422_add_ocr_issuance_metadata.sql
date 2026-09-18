alter table public.ocr_jobs
  add column if not exists request_id uuid references public.document_requests (id) on delete set null,
  add column if not exists template_key text,
  add column if not exists template_version text,
  add column if not exists parsed_fields jsonb not null default '{}'::jsonb;

create index if not exists idx_ocr_jobs_request_id on public.ocr_jobs (request_id);
