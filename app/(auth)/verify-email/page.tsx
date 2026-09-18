import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../auth.module.css';
import VerifyEmailForm from './verify-email-form';

export const metadata: Metadata = {
  title: 'Verify Email',
  description: 'Enter the one-time verification code sent to your email to activate your eSerbisyo account.',
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const prefilledEmail = typeof params.email === 'string' ? params.email : '';
  const registered = params.registered === '1';
  const legacyLink = params.legacy === '1';
  const warning = typeof params.warning === 'string' ? params.warning : undefined;

  return (
    <>
      <VerifyEmailForm
        prefilledEmail={prefilledEmail}
        registered={registered}
        legacyLink={legacyLink}
        warning={warning}
      />
      <p className={styles.metaText}>
        Back to{' '}
        <Link className={styles.linkText} href="/login">
          <strong>Login</strong>
        </Link>
      </p>
    </>
  );
}
