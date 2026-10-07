ALTER TABLE public.bdrrmc_reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT their own reports
DROP POLICY IF EXISTS "Allow select own reports" ON public.bdrrmc_reports;
CREATE POLICY "Allow select own reports" ON public.bdrrmc_reports
  FOR SELECT USING (created_by = auth.uid());

-- Allow authenticated users to INSERT reports (creator must be themselves)
DROP POLICY IF EXISTS "Allow insert own reports" ON public.bdrrmc_reports;
CREATE POLICY "Allow insert own reports" ON public.bdrrmc_reports
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Allow authenticated users to UPDATE their own reports
DROP POLICY IF EXISTS "Allow update own reports" ON public.bdrrmc_reports;
CREATE POLICY "Allow update own reports" ON public.bdrrmc_reports
  FOR UPDATE USING (created_by = auth.uid());

-- Allow authenticated users to DELETE their own reports (kung meron man)
DROP POLICY IF EXISTS "Allow delete own reports" ON public.bdrrmc_reports;
