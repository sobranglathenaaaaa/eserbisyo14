'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import styles from '../auth.module.css';
import { resendVerificationEmail, verifyEmailOtp } from '@/lib/frontend-data/store';

type VerifyEmailFormProps = {
  prefilledEmail: string;
  registered: boolean;
  legacyLink: boolean;
  warning?: string;
};

export default function VerifyEmailForm({
  prefilledEmail,
  registered,
  legacyLink,
  warning,
}: VerifyEmailFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(prefilledEmail);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const bannerMessage = useMemo(() => {
    if (legacyLink) {
      return 'Verification links are no longer supported. Please use the 6-digit code sent to your email.';
    }
    if (warning) {
      return warning;
    }
    if (registered) {
      return 'Account created. Enter the 6-digit verification code sent to your email.';
    }
    return '';
  }, [legacyLink, registered, warning]);

  const normalizedOtp = useMemo(() => otp.replace(/\D/g, '').slice(0, 6), [otp]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setStatus('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Email is required.');
      return;
    }
    if (normalizedOtp.length !== 6) {
      setError('Enter the 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    const result = await verifyEmailOtp(normalizedEmail, normalizedOtp);
    setIsVerifying(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const nextEmail = encodeURIComponent(result.data.email);
    const approvalParam = result.data.approvalStatus ? `&approval=${encodeURIComponent(result.data.approvalStatus)}` : '';
    setStatus('Email verified successfully. Redirecting to login...');
    router.push(`/login?verified=1&email=${nextEmail}${approvalParam}`);
  };

  const onResendCode = async () => {
    setError('');
    setStatus('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Enter your email first so we can resend the verification code.');
      return;
    }

    setIsResending(true);
    const result = await resendVerificationEmail(normalizedEmail);
    setIsResending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setStatus('Verification code sent. Please check your inbox.');
  };

  return (
    <>
      <header>
        <h1 className={styles.pageHeading}>Verify your email</h1>
        <p className={styles.pageIntro}>Use the one-time code from your email to complete account verification.</p>
      </header>

      {bannerMessage ? <p className={styles.verificationNotice}>{bannerMessage}</p> : null}
      {status ? <p className={styles.verificationNotice}>{status}</p> : null}
      {error ? <p className={styles.errorBanner}>{error}</p> : null}

      <form className={styles.authForm} onSubmit={onSubmit} noValidate aria-busy={isVerifying}>
        <div className={styles.formField}>
          <label htmlFor="verify-email">Email address</label>
          <input
            className={styles.input}
            id="verify-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            disabled={isVerifying || isResending || !!prefilledEmail}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="verify-otp">Verification code</label>
          <input
            className={styles.input}
            id="verify-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            required
            maxLength={6}
            disabled={isVerifying || isResending}
            value={normalizedOtp}
            onChange={(event) => setOtp(event.target.value)}
          />
        </div>

        <button className={styles.primaryBtn} type="submit" disabled={isVerifying || isResending}>
          <span className={styles.btnLabel}>
            {isVerifying ? <span className={styles.btnSpinner} aria-hidden="true" /> : null}
            {isVerifying ? 'Verifying...' : 'Verify email'}
          </span>
        </button>
      </form>

      <div className={styles.formUtilityRow}>
        <button
          className={styles.linkActionBtn}
          type="button"
          onClick={() => void onResendCode()}
          disabled={isVerifying || isResending}
        >
          {isResending ? 'Resending...' : 'Resend verification code'}
        </button>
      </div>
    </>
  );
}