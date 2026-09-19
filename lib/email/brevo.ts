import { EmailConfig } from './env';

export interface SendEmailPayload {
  to: string | string[];
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendBrevoApiEmail(
  payload: SendEmailPayload,
  config: EmailConfig
): Promise<{ messageId?: string }> {
  if (!config.brevoApiKey) {
    throw new Error('BREVO_API_KEY is not configured in environment variables.');
  }

  const recipients = Array.isArray(payload.to)
    ? payload.to.map((email) => ({ email }))
    : [{ email: payload.to, name: payload.toName }];

  const body: Record<string, unknown> = {
    sender: {
      name: config.senderName,
      email: config.senderEmail,
    },
    to: recipients,
    subject: payload.subject,
    htmlContent: payload.html,
  };

  if (payload.text) {
    body.textContent = payload.text;
  }

  if (payload.replyTo) {
    body.replyTo = { email: payload.replyTo };
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': config.brevoApiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.text().catch(() => '');
    throw new Error(`Brevo API Error (${response.status}): ${errorData}`);
  }

  const data = await response.json().catch(() => ({}));
  return { messageId: data.messageId };
}
