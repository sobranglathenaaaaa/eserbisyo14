create table bdrrmc_reports (
  id uuid primary key default gen_random_uuid(),

  reference_no text unique not null,

  title text not null,

  content jsonb not null default '{"ops":[]}',

  created_by uuid not null default auth.uid() references auth.users(id),
tenant_id uuid, -- Change to text if your other tables use text IDs

  created_at timestamptz default now(),

  updated_at timestamptz default now()
);

ALTER TABLE public.bdrrmc_reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT their own reports
CREATE POLICY "Allow select own reports" ON public.bdrrmc_reports
  FOR SELECT USING (created_by = auth.uid());

-- Allow authenticated users to INSERT reports (creator must be themselves)
CREATE POLICY "Allow insert own reports" ON public.bdrrmc_reports
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Allow authenticated users to UPDATE their own reports
CREATE POLICY "Allow update own reports" ON public.bdrrmc_reports
  FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- Allow authenticated users to DELETE their own reports
CREATE POLICY "Allow delete own reports" ON public.bdrrmc_reports
  FOR DELETE USING (created_by = auth.uid());

-- Optional: admin full access
CREATE POLICY "Admin full access" ON public.bdrrmc_reports
  FOR ALL TO service_role USING (true);
