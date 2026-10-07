begin;

create table if not exists public.password_reset_tokens (
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

alter table public.password_reset_tokens enable row level security;

drop policy if exists "tenant_access" on public.password_reset_tokens;
create policy "tenant_access" on public.password_reset_tokens
  for all
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

create index if not exists idx_password_reset_tokens_tenant_id on public.password_reset_tokens (tenant_id);
create index if not exists idx_password_reset_tokens_user_id on public.password_reset_tokens (user_id);
create index if not exists idx_password_reset_tokens_created_at on public.password_reset_tokens (created_at);
create index if not exists idx_password_reset_tokens_expires_at on public.password_reset_tokens (expires_at);

commit;
