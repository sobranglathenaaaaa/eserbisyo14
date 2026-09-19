import nodemailer, { Transporter } from 'nodemailer';
import { EmailConfig } from './env';
import { SendEmailPayload } from './brevo';

let cachedTransporter: Transporter | null = null;

function getTransporter(config: EmailConfig): Transporter {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = config.smtpHost || 'smtp-relay.brevo.com';
  const port = config.smtpPort || 587;
  const secure = config.smtpSecure ?? port === 465;

  const auth =
    config.smtpUser || config.smtpPass
      ? {
          user: config.smtpUser || config.senderEmail,
          pass: config.smtpPass,
        }
      : undefined;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  return cachedTransporter;
}

export async function sendNodemailerEmail(
  payload: SendEmailPayload,
  config: EmailConfig
): Promise<{ messageId?: string }> {
  const transporter = getTransporter(config);

  const fromFormatted = config.senderName
    ? `"${config.senderName}" <${config.senderEmail}>`
    : config.senderEmail;

  const info = await transporter.sendMail({
    from: fromFormatted,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    replyTo: payload.replyTo,
  });

  return { messageId: info.messageId };
}
