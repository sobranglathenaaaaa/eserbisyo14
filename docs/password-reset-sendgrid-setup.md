# Password Reset & SendGrid Integration Guide

This guide documents the setup, configuration, database migrations, testing, and operation of the OTP + Password Reset email system powered by SendGrid.

---

## 1. Required Environment Variables

Set the following variables in your `.env` (or production environment configuration):

```env
# SendGrid API Key (starts with SG.)
SENDGRID_API_KEY=SG.your_actual_sendgrid_api_key

# Verified Sender Email Address
MAIL_FROM=no-reply@yourdomain.com

# Sender Display Name
MAIL_FROM_NAME="eSerbisyo Admin"

# Base URL of your frontend application
FRONTEND_URL=http://localhost:3000

# Email provider strategy selection (optional, default is 'sendgrid' when SENDGRID_API_KEY is set)
EMAIL_PROVIDER=sendgrid
```

> **Security Note**: Never commit real API keys or secrets to `.env.example` or source control.

---

## 2. How to Create a SendGrid API Key

1. Log into your [SendGrid Dashboard](https://app.sendgrid.com/).
2. Navigate to **Settings** > **API Keys**.
3. Click **Create API Key**.
4. Set Key Name (e.g., `eSerbisyo Production Key`).
5. Select **Restricted Access** and grant full **Mail Send** permissions.
6. Click **Create & View** and copy the generated API key (it begins with `SG.`).
7. Paste this value into your `.env` file as `SENDGRID_API_KEY`.

---

## 3. How to Enable Single Sender Verification

Before SendGrid will deliver emails, your sender address must be verified:

1. In SendGrid Dashboard, go to **Settings** > **Sender Authentication**.
2. Under **Single Sender Verification**, click **Get Started** or **Add a Sender**.
3. Fill out the sender form:
   - **From Email**: e.g., `no-reply@yourdomain.com` (or your personal verified email if domain is not yet owned)
   - **From Name**: `eSerbisyo System`
   - **Reply To**: `support@yourdomain.com`
   - Company address details as required by SendGrid.
4. Click **Create**.
5. Open your email inbox and click the verification link sent by SendGrid.
6. Set `MAIL_FROM` in `.env` to match this exact verified email address.

---

## 4. How to Run Database Migrations

Apply the new OTP columns to `public.password_reset_tokens`:

```bash
# If using Supabase CLI locally:
npx supabase db push

# Or execute the SQL migration file manually via Supabase Dashboard SQL Editor:
# Migration path: supabase/migrations/20260428_add_otp_to_password_reset_tokens.sql
```

The migration adds:
- `otp_hash` (text)
- `otp_expires_at` (timestamptz)
- `otp_attempt_count` (integer)
- `otp_max_attempts` (integer)
- `otp_verified_at` (timestamptz)
- Indexes on `otp_hash` and `otp_expires_at`.

---

## 5. How to Run Automated Tests

Run the dedicated test suite for OTP generation, lockout, expiration, resend cooldown, and enumeration protection:

```bash
npx playwright test QA/resident/automated/password-reset-otp.spec.ts
```

To run all auth tests:
```bash
npx playwright test QA/resident/automated/resident-auth.spec.ts
```

---

## 6. How to Test the Forgot-Password Flow Locally

1. Ensure `.env` has valid `SENDGRID_API_KEY`, `MAIL_FROM`, `MAIL_FROM_NAME`, and `FRONTEND_URL`.
2. Start the dev server: `npm run dev`.
3. Open `http://localhost:3000/forgot-password`.
4. Enter a registered email address and submit.
5. Check your email inbox for:
   - 6-digit OTP code (expires in 5 minutes).
   - Reset password link (expires in 15 minutes).
6. Try resetting your password via either:
   - Clicking the email reset link (`/reset-password?token=...`).
   - Entering the 6-digit OTP code on `/reset-password?email=...`.

---

## 7. How to Switch from Single Sender to Authenticated Custom Domain Later

When you acquire a custom domain (e.g. `eserbisyo.gov.ph`):

1. In SendGrid, go to **Settings** > **Sender Authentication**.
2. Click **Authenticate Your Domain**.
3. Choose your DNS host (Cloudflare, GoDaddy, Namecheap, etc.).
4. Add the generated `CNAME` records to your domain DNS settings.
5. Click **Verify** in SendGrid.
6. Update `.env`:
   ```env
   MAIL_FROM=no-reply@eserbisyo.gov.ph
   MAIL_FROM_NAME="eSerbisyo System"
   ```
7. **No changes to application code, controllers, or database models are needed.** The SendGrid adapter cleanly supports custom authenticated domain sending out of the box.
