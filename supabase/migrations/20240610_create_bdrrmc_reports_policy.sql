-- Enable Row Level Security for bdrrmc_reports
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

-- Optional: allow service_role (admin) full access
CREATE POLICY "Admin full access" ON public.bdrrmc_reports
  FOR ALL TO service_role USING (true);
