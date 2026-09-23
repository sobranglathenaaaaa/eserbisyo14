export type EmailProviderType = 'brevo-api' | 'brevo-smtp' | 'nodemailer' | 'resend' | 'sendgrid' | 'auto';

export interface EmailConfig {
  provider: EmailProviderType;
  senderEmail: string;
  senderName: string;
  brevoApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  resendApiKey?: string;
  sendgridApiKey?: string;
}

type EnvMap = NodeJS.ProcessEnv;

function getEnvValue(env: EnvMap, keys: string[]): string | undefined {
  for (const key of keys) {
    const val = env[key]?.trim();
    if (val) return val;
  }
  return undefined;
}

export function getEmailConfig(env: EnvMap = process.env): EmailConfig {
  const rawSender = getEnvValue(env, [
    'MAIL_FROM',
    'EMAIL_SENDER',
    'BREVO_SENDER_EMAIL',
    'RESEND_FROM_EMAIL',
    'SMTP_USER',
  ]);

  if (!rawSender) {
    throw new Error(
      'Missing sender email configuration. Please set MAIL_FROM or EMAIL_SENDER in your environment variables.'
    );
  }

  let cleanSenderEmail = rawSender;
  let parsedSenderName = getEnvValue(env, ['MAIL_FROM_NAME', 'EMAIL_SENDER_NAME']);

  const match = rawSender.match(/^(?:["']?([^"'<]+)["']?\s*)?<?([^>]+)>?$/);
  if (match) {
    const extractedName = match[1]?.trim();
    const extractedEmail = match[2]?.trim();
    if (extractedEmail && extractedEmail.includes('@')) {
      cleanSenderEmail = extractedEmail;
      if (extractedName && !parsedSenderName) {
        parsedSenderName = extractedName;
      }
    }
  }

  const senderName = parsedSenderName || 'E-Serbisyo';

  const sendgridApiKey = getEnvValue(env, ['SENDGRID_API_KEY']);
  const brevoApiKey = getEnvValue(env, ['BREVO_API_KEY', 'BREVO_API_SECRET']);
  const smtpHost = getEnvValue(env, ['SMTP_HOST']) || (getEnvValue(env, ['BREVO_SMTP_KEY', 'BREVO_SMTP_PASS']) ? 'smtp-relay.brevo.com' : undefined);
  const smtpPortRaw = getEnvValue(env, ['SMTP_PORT']);
  const smtpPort = smtpPortRaw ? parseInt(smtpPortRaw, 10) : 587;
  const smtpUser = getEnvValue(env, ['SMTP_USER', 'BREVO_SMTP_USER']);
  const smtpPass = getEnvValue(env, ['SMTP_PASS', 'BREVO_SMTP_KEY', 'BREVO_SMTP_PASS']);
  const smtpSecureRaw = getEnvValue(env, ['SMTP_SECURE']);
  const smtpSecure = smtpSecureRaw ? smtpSecureRaw === 'true' : smtpPort === 465;

  const resendApiKey = getEnvValue(env, ['RESEND_API_KEY']);

  const requestedProvider = (getEnvValue(env, ['EMAIL_PROVIDER'])?.toLowerCase() as EmailProviderType) || 'auto';

  let provider: EmailProviderType = requestedProvider;

  if (provider === 'auto') {
    if (sendgridApiKey) {
      provider = 'sendgrid';
    } else if (brevoApiKey) {
      provider = 'brevo-api';
    } else if (smtpHost && smtpPass) {
      provider = 'brevo-smtp';
    } else if (smtpUser && smtpPass) {
      provider = 'nodemailer';
    } else if (resendApiKey) {
      provider = 'resend';
    } else {
      throw new Error(
        'No valid email provider credentials found. Please configure SENDGRID_API_KEY, BREVO_API_KEY, SMTP credentials, or RESEND_API_KEY in your .env file.'
      );
    }
  }

  return {
    provider,
    senderEmail: cleanSenderEmail,
    senderName,
    sendgridApiKey,
    brevoApiKey,
    smtpHost: smtpHost || 'smtp-relay.brevo.com',
    smtpPort,
    smtpUser,
    smtpPass,
    smtpSecure,
    resendApiKey,
  };
}
