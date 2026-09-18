import { getEmailVerificationEnv } from '@/lib/supabase/env';

type ResendEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendResendEmail(payload: ResendEmailPayload): Promise<void> {
  const env = getEmailVerificationEnv();

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.senderEmail,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Unable to send verification email (${response.status}): ${details}`);
  }
}
