'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import styles from '../auth.module.css';
import { requestPasswordReset } from '@/lib/frontend-data/store';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus('');
    setError('');

    const result = await requestPasswordReset(email.trim().toLowerCase());
    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setStatus(result.data.message);
    setIsSubmitting(false);
  };

  return (
    <>
      <header>
        <h1 className={styles.pageHeading}>Forgot password</h1>
        <p className={styles.pageIntro}>Enter your account email and we will send a password reset link.</p>
      </header>

      {status ? <p className={styles.verificationNotice}>{status}</p> : null}

      <form className={styles.authForm} onSubmit={onSubmit} noValidate aria-busy={isSubmitting}>
        <div className={styles.formField}>
          <label htmlFor="forgot-email">Email address</label>
          <input
            className={styles.input}
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            disabled={isSubmitting}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        {error ? <p className={styles.legalText}>{error}</p> : null}

        <button className={styles.primaryBtn} type="submit" disabled={isSubmitting}>
          <span className={styles.btnLabel}>
            {isSubmitting ? <span className={styles.btnSpinner} aria-hidden="true" /> : null}
            {isSubmitting ? 'Sending...' : 'Send reset link'}
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
