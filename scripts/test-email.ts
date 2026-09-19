import fs from 'node:fs';
import path from 'node:path';
import { getEmailConfig } from '../lib/email/env';
import { sendEmail } from '../lib/email/sender';

// Load .env file if available into process.env
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const val = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

loadEnv();

async function main() {
  const recipient = process.argv[2];
  if (!recipient) {
    console.error('Usage: npm run test:email <recipient-email>');
    console.error('Example: npm run test:email user@example.com');
    process.exit(1);
  }

  console.log('Testing email configuration...');

  try {
    const config = getEmailConfig();
    console.log(`Detected Provider: ${config.provider}`);
    console.log(`Sender: ${config.senderName} <${config.senderEmail}>`);
    console.log(`Sending test email to: ${recipient}...`);

    const result = await sendEmail({
      to: recipient,
      subject: 'E-Serbisyo Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #0284c7;">E-Serbisyo Email Configuration Test</h2>
          <p>Hello!</p>
          <p>This email confirms that your <strong>E-Serbisyo</strong> email sending integration is working successfully using provider: <strong>${config.provider}</strong>.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #6b7280;">Sent at ${new Date().toISOString()}</p>
        </div>
      `,
      text: `E-Serbisyo Email Test\n\nThis email confirms that your email sending integration is working successfully using provider: ${config.provider}.\nSent at ${new Date().toISOString()}`,
    });

    console.log('✅ Email sent successfully!');
    console.log('Provider used:', result.provider);
    if (result.messageId) {
      console.log('Message ID:', result.messageId);
    }
  } catch (err) {
    console.error('❌ Failed to send email:', err);
    process.exit(1);
  }
}

main();
