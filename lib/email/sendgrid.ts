import sgMail from '@sendgrid/mail';
import { EmailConfig } from './env';
import { SendEmailPayload } from './brevo';

export async function sendSendGridEmail(
  payload: SendEmailPayload,
  config: EmailConfig
): Promise<{ messageId?: string }> {
  const apiKey = config.sendgridApiKey || process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is missing in environment variables.');
  }

  sgMail.setApiKey(apiKey);

  const msg = {
    to: payload.to,
    from: {
      email: config.senderEmail,
      name: config.senderName,
    },
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  };

  const [response] = await sgMail.send(msg);

  const messageIdHeader = response.headers['x-message-id'];
  const messageId = Array.isArray(messageIdHeader) ? messageIdHeader[0] : messageIdHeader;

  return { messageId };
}
