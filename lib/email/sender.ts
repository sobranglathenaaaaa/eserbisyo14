import { getEmailConfig, EmailConfig } from './env';
import { sendBrevoApiEmail, SendEmailPayload } from './brevo';
import { sendNodemailerEmail } from './nodemailer';
import { sendResendEmailDirect } from './resend-direct';

export type { SendEmailPayload, EmailConfig };

export async function sendEmail(
  payload: SendEmailPayload,
  customConfig?: EmailConfig
): Promise<{ messageId?: string; provider: string }> {
  const config = customConfig || getEmailConfig();

  switch (config.provider) {
    case 'brevo-api': {
      const result = await sendBrevoApiEmail(payload, config);
      return { ...result, provider: 'brevo-api' };
    }
    case 'brevo-smtp':
    case 'nodemailer': {
      const result = await sendNodemailerEmail(payload, config);
      return { ...result, provider: config.provider };
    }
    case 'resend': {
      const result = await sendResendEmailDirect(payload, config);
      return { ...result, provider: 'resend' };
    }
    default: {
      // Default fallback attempt Brevo API if key present, else Nodemailer
      if (config.brevoApiKey) {
        const result = await sendBrevoApiEmail(payload, config);
        return { ...result, provider: 'brevo-api' };
      }
      const result = await sendNodemailerEmail(payload, config);
      return { ...result, provider: 'nodemailer' };
    }
  }
}
