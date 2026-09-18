'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import styles from '../auth.module.css';
import { resetPassword } from '@/lib/frontend-data/store';

export default function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token')?.trim() ?? '';
  const hasToken = Boolean(token);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const validationError = useMemo(() => {
    if (!hasToken) return 'Reset token is missing. Please use the link from your email.';
    if (!newPassword || !confirmPassword) return null;
    if (newPassword.length < 8) return 'Password must be at least 8 characters.';
    if (newPassword !== confirmPassword) return 'Passwords do not match.';
    return null;
  }, [hasToken, newPassword, confirmPassword]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('');
    setError('');

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(token, newPassword);
    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setStatus('Password updated successfully. You can now log in with your new password.');
    setIsSubmitting(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <>
      <header>
        <h1 className={styles.pageHeading}>Reset password</h1>
        <p className={styles.pageIntro}>Set a new password for your eSerbisyo account.</p>
      </header>

      {status ? <p className={styles.verificationNotice}>{status}</p> : null}
      {error ? <p className={styles.errorBanner}>{error}</p> : null}

      <form className={styles.authForm} onSubmit={onSubmit} noValidate aria-busy={isSubmitting}>
        <div className={styles.formField}>
          <label htmlFor="reset-new-password">New password</label>
          <input
            className={styles.input}
            id="reset-new-password"
            type="password"
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
            required
            disabled={isSubmitting || !hasToken}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </div>

        <div className={styles.formField}>
          <label htmlFor="reset-confirm-password">Confirm new password</label>
          <input
            className={styles.input}
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter new password"
            required
            disabled={isSubmitting || !hasToken}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>

        <button className={styles.primaryBtn} type="submit" disabled={isSubmitting || !hasToken}>
          <span className={styles.btnLabel}>
            {isSubmitting ? <span className={styles.btnSpinner} aria-hidden="true" /> : null}
            {isSubmitting ? 'Updating...' : 'Update password'}
          </span>
        </button>
      </form>

      <p className={styles.metaText}>
        <Link className={styles.linkText} href="/login">
          Back to login
        </Link>
      </p>
    </>
  );
}
