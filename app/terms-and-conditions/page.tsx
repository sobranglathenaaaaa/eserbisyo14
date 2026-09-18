import type { Metadata } from 'next';
import { LegalBackButton } from '@/components/legal-back-button';
import { LegalDocumentView } from '@/components/legal-document-view';
import { getLegalDocument } from '@/lib/content/legal-documents.server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description:
    'Read the Terms and Conditions for eSerbisyo, the Barangay Service and Records Management System of Barangay Progreso, San Juan City.',
};

export default async function TermsAndConditionsPage() {
  const document = await getLegalDocument('terms-and-conditions');

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-4">
        <LegalBackButton />
      </div>
      <LegalDocumentView document={document} />
    </main>
  );
}
