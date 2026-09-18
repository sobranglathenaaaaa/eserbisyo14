import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('bdrrmc_reports').select('*');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const body = await request.json();
  // Expected: { reference_no, title, content, paperSize }
  const { reference_no, title, content, paperSize } = body;
  // Get auth user if needed (optional)
  const { data: authData } = await supabase.auth.getUser();
  const created_by = authData?.user?.id ?? null;
  const { data, error } = await supabase
    .from('bdrrmc_reports')
    .insert([
      {
        reference_no,
        title,
        content,
        created_by,
        paper_size: paperSize,
      },
    ]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
