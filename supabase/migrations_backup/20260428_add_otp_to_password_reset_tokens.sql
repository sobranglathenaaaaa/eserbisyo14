begin;

alter table public.password_reset_tokens
  add column if not exists otp_hash text,
  add column if not exists otp_expires_at timestamptz,
  add column if not exists otp_attempt_count integer not null default 0,
  add column if not exists otp_max_attempts integer not null default 5,
  add column if not exists otp_verified_at timestamptz;

create index if not exists idx_password_reset_tokens_otp_hash on public.password_reset_tokens (otp_hash);
create index if not exists idx_password_reset_tokens_otp_expires_at on public.password_reset_tokens (otp_expires_at);

commit;
