import { sendEmail, SendEmailPayload } from './sender';

export type ResendEmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

/**
 * Legacy wrapper function to send emails.
 * Delegates to the unified `sendEmail` helper, which automatically selects
 * Brevo API, Brevo SMTP (Nodemailer), custom SMTP, or Resend depending on environment configuration.
 */
export async function sendResendEmail(payload: ResendEmailPayload): Promise<void> {
  await sendEmail(payload as SendEmailPayload);
}

export { sendEmail };
