import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../auth.module.css';
import RegisterForm from './register-form';
import { getLegalDocuments } from '@/lib/content/legal-documents.server';

// Fetch legal documents server-side so registration reflects admin edits immediately.
const documentsPromise = getLegalDocuments();

export const metadata: Metadata = {
  title: 'Resident Registration',
  description: 'Create your eSerbisyo resident account to request and track barangay services online.',
};

export default async function RegisterPage() {
  const documents = await documentsPromise;

  return (
    <>
      <RegisterForm initialLegalDocuments={documents} />
      <p className={styles.metaText}>
        Already registered?{' '}
        <Link className={styles.linkText} href="/login">
          <strong>Log in</strong>
        </Link>
      </p>
    </>
  );
}
