type EnvMap = NodeJS.ProcessEnv;

function firstNonEmpty(env: EnvMap, keys: string[]): string | null {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return null;
}

// Keep explicit NEXT_PUBLIC references so Next.js can inline values in client bundles.
const PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? null;
const PUBLIC_PUBLISHABLE_DEFAULT_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ?? null;
const PUBLIC_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? null;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? null;

export function getSupabasePublicEnv(env: EnvMap = process.env): {
  url: string;
  publishableKey: string;
} {
  const url = PUBLIC_URL ?? firstNonEmpty(env, ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL']);
  if (!url) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }

  const publishableKey =
    PUBLIC_PUBLISHABLE_DEFAULT_KEY ??
    PUBLIC_ANON_KEY ??
    firstNonEmpty(env, [
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_PUBLISHABLE_KEY',
    ]);

  if (!publishableKey) {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return { url, publishableKey };
}

export function getSupabaseServiceRoleKey(env: EnvMap = process.env): string {
  const key = SERVICE_ROLE_KEY ?? firstNonEmpty(env, ['SUPABASE_SERVICE_ROLE_KEY']);
  if (!key) {
    throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
  }
  return key;
}

export function getEmailVerificationEnv(env: EnvMap = process.env): {
  resendApiKey: string;
  senderEmail: string;
  appBaseUrl: string;
} {
  const resendApiKey = firstNonEmpty(env, ['RESEND_API_KEY', 'BREVO_API_KEY', 'SMTP_PASS', 'BREVO_SMTP_KEY']) || '';

  const senderEmail = firstNonEmpty(env, ['EMAIL_SENDER', 'RESEND_FROM_EMAIL', 'BREVO_SENDER_EMAIL', 'SMTP_USER']);
  if (!senderEmail) {
    throw new Error('Missing required environment variable: EMAIL_SENDER, BREVO_SENDER_EMAIL, or RESEND_FROM_EMAIL');
  }

  const appBaseUrl = firstNonEmpty(env, [
    'NEXT_PUBLIC_APP_URL',
    'APP_BASE_URL',
    'VERCEL_PROJECT_PRODUCTION_URL',
    'VERCEL_URL',
  ]);
  if (!appBaseUrl) {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_APP_URL, APP_BASE_URL, VERCEL_PROJECT_PRODUCTION_URL, or VERCEL_URL'
    );
  }

  const normalizedAppBaseUrl =
    appBaseUrl.startsWith('http://') || appBaseUrl.startsWith('https://') ? appBaseUrl : `https://${appBaseUrl}`;
  const isLocalHost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedAppBaseUrl);
  if (process.env.NODE_ENV === 'production' && isLocalHost) {
    throw new Error(
      'Invalid NEXT_PUBLIC_APP_URL/APP_BASE_URL for production email links: localhost is not allowed'
    );
  }

  return {
    resendApiKey,
    senderEmail,
    appBaseUrl: normalizedAppBaseUrl.replace(/\/$/, ''),
  };
}
