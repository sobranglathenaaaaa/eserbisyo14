begin;

create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants (id),
  user_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.email_verification_tokens enable row level security;

drop policy if exists "tenant_access" on public.email_verification_tokens;
create policy "tenant_access" on public.email_verification_tokens
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

create index if not exists idx_email_verification_tokens_tenant_id on public.email_verification_tokens (tenant_id);
create index if not exists idx_email_verification_tokens_user_id on public.email_verification_tokens (user_id);
create index if not exists idx_email_verification_tokens_created_at on public.email_verification_tokens (created_at);
create index if not exists idx_email_verification_tokens_expires_at on public.email_verification_tokens (expires_at);

commit;
