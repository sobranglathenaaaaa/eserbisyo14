import { EmailConfig } from './env';
import { SendEmailPayload } from './brevo';

export async function sendResendEmailDirect(
  payload: SendEmailPayload,
  config: EmailConfig
): Promise<{ messageId?: string }> {
  if (!config.resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured in environment variables.');
  }

  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const fromFormatted = `${config.senderName} <${config.senderEmail}>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromFormatted,
      to: recipients,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Resend Email Error (${response.status}): ${details}`);
  }

  const data = await response.json().catch(() => ({}));
  return { messageId: data.id };
}
