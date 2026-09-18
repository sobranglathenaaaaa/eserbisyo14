begin;

alter table public.email_verification_tokens
  add column if not exists attempt_count integer not null default 0;

alter table public.email_verification_tokens
  add column if not exists max_attempts integer not null default 5;

update public.email_verification_tokens
set attempt_count = 0
where attempt_count is null;

update public.email_verification_tokens
set max_attempts = 5
where max_attempts is null;

commit;
