import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  
  if (auth.role !== 'admin' && auth.role !== 'staff') {
    return NextResponse.json({ success: false, error: { message: 'Forbidden' } }, { status: 403 });
  }

  try {
    const json = (await request.json()) as { name: string; specialization?: string; isActive?: boolean };
    if (!json.name?.trim()) {
      return NextResponse.json({ success: false, error: { message: 'Name is required' } }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from('doctors').insert({
      tenant_id: auth.tenantId,
      name: json.name.trim(),
      specialization: json.specialization?.trim() || null,
      is_active: json.isActive ?? true,
    });

    if (error) throw error;
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: 'Internal Server Error' } }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  
  if (auth.role !== 'admin' && auth.role !== 'staff') {
    return NextResponse.json({ success: false, error: { message: 'Forbidden' } }, { status: 403 });
  }

  try {
    const json = (await request.json()) as { id: string; name?: string; specialization?: string; isActive?: boolean };
    if (!json.id) {
      return NextResponse.json({ success: false, error: { message: 'ID is required' } }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const updatePayload: Record<string, any> = {};

    if (json.name !== undefined) updatePayload.name = json.name.trim();
    if (json.specialization !== undefined) updatePayload.specialization = json.specialization?.trim() || null;
    if (json.isActive !== undefined) updatePayload.is_active = json.isActive;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ success: false, error: { message: 'No fields to update' } }, { status: 400 });
    }

    updatePayload.updated_at = new Date().toISOString();

    const { error } = await supabase.from('doctors').update(updatePayload).eq('id', json.id);
    if (error) throw error;

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: 'Internal Server Error' } }, { status: 500 });
  }
}
