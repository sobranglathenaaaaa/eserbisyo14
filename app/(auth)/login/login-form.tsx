'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import styles from '../auth.module.css';
import { login, resendVerificationEmail } from '../../../lib/frontend-data/store';

function homeByRole(role: 'admin' | 'staff' | 'resident') {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'staff') return '/staff/dashboard';
  return '/resident/dashboard';
}

const quickLoginAccounts = [
  { label: 'Admin', email: 'admin@eserbisyo.local', password: 'Admin123!' },
  { label: 'Staff', email: 'staff@eserbisyo.local', password: 'Staff123!' },
  { label: 'Resident', email: 'resident@eserbisyo.local', password: 'Resident123!' },
];

const quickLoginEnabled = process.env.NEXT_PUBLIC_ENABLE_QUICK_LOGIN !== 'false';

function sanitizeNextPath(nextPath?: string) {
  if (!nextPath) return null;
  if (!nextPath.startsWith('/')) return null;
  if (nextPath.startsWith('//')) return null;
  return nextPath;
}

export default function LoginForm({
  registered,
  verificationRequired,
  verified,
  verifyReason,
  approvalStatus,
  prefilledEmail,
  nextPath,
  warning,
}: {
  registered: boolean;
  verificationRequired: boolean;
  verified: boolean;
  verifyReason?: string;
  approvalStatus?:
    | 'pending_staff_review'
    | 'staff_forwarded_to_admin'
    | 'staff_rejected'
    | 'admin_approved'
    | 'admin_rejected';
  prefilledEmail?: string;
  nextPath?: string;
  warning?: string;
}) {
  const [email, setEmail] = useState(prefilledEmail ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const router = useRouter();
  const targetPath = sanitizeNextPath(nextPath);

  const showResend = useMemo(() => {
    if (approvalStatus && approvalStatus !== 'admin_approved') return false;
    if (verificationRequired) return true;
    if (verifyReason && verifyReason !== 'none') return true;
    return error.toLowerCase().includes('verify your email');
  }, [approvalStatus, verificationRequired, verifyReason, error]);

  const verificationStatusMessage = useMemo(() => {
    if (verified) {
      if (approvalStatus === 'pending_staff_review') {
        return 'Email verified successfully. Please wait for approval.';
      }
      if (approvalStatus === 'staff_rejected') {
        return 'Email verified, but your registration was not accepted. Please contact the barangay office.';
      }
      if (approvalStatus === 'admin_rejected') {
        return 'Email verified, but your registration was not approved. Please contact the barangay office.';
      }
      return 'Email verified successfully. You can now log in.';
    }
    if (verifyReason === 'expired') {
      return 'Your verification code expired. Request a new one below.';
    }
    if (verifyReason === 'used') {
      return 'This verification code has already been used. Request a new one below.';
    }
    if (verifyReason === 'invalid') {
      return 'Verification code is invalid. Request a new one below.';
    }
    if (verifyReason === 'otp_required') {
      return 'Email verification now uses one-time codes. Enter your code on the verification page.';
    }
    if (verifyReason === 'max_attempts') {
      return 'Too many incorrect verification attempts. Request a new code.';
    }
    if (warning) {
      return warning;
    }
    if (verificationRequired || registered) {
      return 'Account created. Verify your email using the code sent to your inbox, then log in.';
    }
    return '';
  }, [approvalStatus, verificationRequired, registered, verified, verifyReason, warning]);

  const doLogin = async (emailValue: string, passwordValue: string) => {
    setIsSubmitting(true);
    setError('');
    setResendMessage('');
    const result = await login(emailValue, passwordValue);
    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    router.replace(targetPath ?? homeByRole(result.data.user.role));
    router.refresh();
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void doLogin(email, password);
  };

  const onQuickLogin = async (emailValue: string, passwordValue: string) => {
    setIsSubmitting(true);
    setError('');
    setResendMessage('');

    const bootstrapResponse = await fetch('/api/dev/bootstrap-accounts', {
      method: 'POST',
    });

    if (!bootstrapResponse.ok) {
      const payload = (await bootstrapResponse.json().catch(() => ({ error: 'Failed to prepare quick login.' }))) as {
        error?: string;
      };
      setError(payload.error ?? 'Failed to prepare quick login.');
      setIsSubmitting(false);
      return;
    }

    await doLogin(emailValue, passwordValue);
  };

  const onResendVerification = async () => {
    const emailValue = email.trim().toLowerCase();
    if (!emailValue) {
      setResendMessage('Enter your email first so we can resend your verification code.');
      return;
    }

    setIsResending(true);
    setResendMessage('');
    const result = await resendVerificationEmail(emailValue);
    if (!result.ok) {
      setResendMessage(result.error);
      setIsResending(false);
      return;
    }

    setResendMessage('Verification code sent. Please check your inbox.');
    setIsResending(false);
  };

  return (
    <>
      <header className={styles.pageHeaderCenter}>
        <h1 className={styles.pageHeading}>Welcome</h1>
        <p className={styles.pageIntro}>Sign in to continue</p>
      </header>

      {verificationStatusMessage ? <p className={styles.verificationNotice}>{verificationStatusMessage}</p> : null}

      {quickLoginEnabled ? (
        <section className={styles.devQuickPanel} aria-label="Quick login accounts">
          <p className={styles.devQuickLabel}>Quick login</p>
          <div className={styles.devQuickButtons}>
            {quickLoginAccounts.map((account) => (
              <button
                key={account.email}
                className={styles.devQuickBtn}
                type="button"
                onClick={() => void onQuickLogin(account.email, account.password)}
                disabled={isSubmitting}
              >
                {account.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <form className={styles.authForm} onSubmit={onSubmit} noValidate aria-busy={isSubmitting}>
        <div className={styles.formField}>
          <label htmlFor="login-email">Email address</label>
          <input
            className={styles.input}
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            disabled={isSubmitting}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="login-password">Password</label>
          <input
            className={styles.input}
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            disabled={isSubmitting}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error ? <p className={styles.legalText}>{error}</p> : null}

        {showResend ? (
          <div className={styles.formUtilityRow}>
            <button
              className={styles.linkActionBtn}
              type="button"
              onClick={() => void onResendVerification()}
              disabled={isResending || isSubmitting}
            >
              {isResending ? 'Resending...' : 'Resend verification code'}
            </button>
            {resendMessage ? <p className={styles.legalText}>{resendMessage}</p> : null}
          </div>
        ) : null}

        <div className={styles.formUtilityRow}>
          <Link className={styles.linkText} href="/forgot-password">
            Forgot password?
          </Link>
          {/* Sign up link removed per request */}
        </div>

        <button className={styles.primaryBtn} type="submit" disabled={isSubmitting}>
          <span className={styles.btnLabel}>
            {isSubmitting ? <span className={styles.btnSpinner} aria-hidden="true" /> : null}
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </span>
        </button>

      </form>
    </>
  );
}
