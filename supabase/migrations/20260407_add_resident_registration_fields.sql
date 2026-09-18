alter table public.profiles
  add column if not exists first_name text,
  add column if not exists middle_name text,
  add column if not exists last_name text,
  add column if not exists suffix text,
  add column if not exists sex text,
  add column if not exists civil_status text,
  add column if not exists citizenship text,
  add column if not exists address_line text,
  add column if not exists province text,
  add column if not exists city text,
  add column if not exists barangay text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz;
