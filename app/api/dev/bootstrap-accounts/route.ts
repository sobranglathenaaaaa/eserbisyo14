import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type DevAccount = {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'staff' | 'resident';
};

const DEV_ACCOUNTS: DevAccount[] = [
  {
    email: 'admin@eserbisyo.local',
    password: 'Admin123!',
    fullName: 'Barangay Admin',
    role: 'admin',
  },
  {
    email: 'staff@eserbisyo.local',
    password: 'Staff123!',
    fullName: 'Barangay Staff',
    role: 'staff',
  },
  {
    email: 'resident@eserbisyo.local',
    password: 'Resident123!',
    fullName: 'Juan Dela Cruz',
    role: 'resident',
  },
];

function quickLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_QUICK_LOGIN !== 'false';
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();

  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      throw error;
    }

    const found = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (found?.id) {
      return found.id;
    }

    if (data.users.length < 200) {
      break;
    }
  }

  return null;
}

async function findOrCreateUserId(account: DevAccount): Promise<string> {
  const supabase = getSupabaseAdminClient();

  const existingUserId = await findUserIdByEmail(account.email);
  if (existingUserId) {
    const { error } = await supabase.auth.admin.updateUserById(existingUserId, {
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        full_name: account.fullName,
        role: account.role,
      },
    });

    if (error) {
      throw error;
    }

    return existingUserId;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: {
      full_name: account.fullName,
      role: account.role,
    },
  });

  if (error || !data.user?.id) {
    throw error ?? new Error('Unable to create quick-login account.');
  }

  return data.user.id;
}

export async function POST() {
  if (!quickLoginEnabled()) {
    return NextResponse.json({ error: 'Quick login is disabled.' }, { status: 404 });
  }

  try {
    const supabase = getSupabaseAdminClient();

    for (const account of DEV_ACCOUNTS) {
      const userId = await findOrCreateUserId(account);

      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: userId,
          full_name: account.fullName,
          email: account.email,
          role: account.role,
          locale: 'en',
          is_deleted: false,
          is_verified: true,
          approval_status: 'admin_approved',
        },
        {
          onConflict: 'id',
        }
      );

      if (profileError) {
        throw profileError;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[bootstrap-accounts error]:', error);
    const message = error instanceof Error ? error.message : 'Failed to bootstrap quick-login accounts.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
