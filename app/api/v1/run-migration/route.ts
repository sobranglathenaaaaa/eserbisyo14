import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Temporary migration endpoint – drop the 30-minute slot constraint.
 * DELETE THIS FILE after the migration has been applied.
 */
export async function POST(request: NextRequest) {
  const admin = getSupabaseAdminClient();

  // Step 1: Drop the 30-min window constraint
  const { error: dropError } = await admin.rpc('exec_sql', {
    query: `ALTER TABLE public.doctor_availability_slots DROP CONSTRAINT IF EXISTS doctor_availability_slots_30_min_window;`,
  });

  // If rpc doesn't work, try direct query via REST
  if (dropError) {
    // Try alternative approach - use fetch to the Supabase SQL endpoint
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: 'Missing env vars' }, { status: 500 });
    }

    const sqlStatements = [
      `ALTER TABLE public.doctor_availability_slots DROP CONSTRAINT IF EXISTS doctor_availability_slots_30_min_window;`,
      `ALTER TABLE public.doctor_availability_slots DROP CONSTRAINT IF EXISTS doctor_availability_slots_time_order_check;`,
      `ALTER TABLE public.doctor_availability_slots ADD CONSTRAINT doctor_availability_slots_time_order_check CHECK (end_at > start_at);`,
    ];

    const results = [];
    for (const sql of sqlStatements) {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      results.push({ sql: sql.substring(0, 80), status: res.status, ok: res.ok });
    }

    return NextResponse.json({ success: false, rpcFailed: true, results, note: 'RPC exec_sql not available. Please run the migration SQL manually via Supabase Dashboard > SQL Editor.' });
  }

  // Step 2: Drop old time_order_check if exists
  await admin.rpc('exec_sql', {
    query: `ALTER TABLE public.doctor_availability_slots DROP CONSTRAINT IF EXISTS doctor_availability_slots_time_order_check;`,
  });

  // Step 3: Add new time_order_check
  await admin.rpc('exec_sql', {
    query: `ALTER TABLE public.doctor_availability_slots ADD CONSTRAINT doctor_availability_slots_time_order_check CHECK (end_at > start_at);`,
  });

  return NextResponse.json({ success: true, message: 'Migration applied successfully' });
}
