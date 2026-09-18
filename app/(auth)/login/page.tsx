import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../auth.module.css';
import LoginForm from './login-form';

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Sign in to your eSerbisyo account to manage barangay service requests and updates.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const registered = params.registered === '1';
  const verificationRequired = params.verify === '1';
  const verified = params.verified === '1';
  const verifyReason = typeof params.reason === 'string' ? params.reason : undefined;
  const approvalStatus =
    params.approval === 'pending_staff_review' ||
    params.approval === 'staff_forwarded_to_admin' ||
    params.approval === 'staff_rejected' ||
    params.approval === 'admin_approved' ||
    params.approval === 'admin_rejected'
      ? params.approval
      : undefined;
  const prefilledEmail = typeof params.email === 'string' ? params.email : undefined;
  const nextPath = typeof params.next === 'string' ? params.next : undefined;
  const warning = typeof params.warning === 'string' ? params.warning : undefined;

  return (
    <>
      <LoginForm
        registered={registered}
        verificationRequired={verificationRequired}
        verified={verified}
        verifyReason={verifyReason}
        approvalStatus={approvalStatus}
        prefilledEmail={prefilledEmail}
        nextPath={nextPath}
        warning={warning}
      />
      <p className={styles.metaText}>
        New here?{' '}
        <Link className={styles.linkText} href="/register">
          <strong>Register as resident</strong>
        </Link>
      </p>
    </>
  );
}
