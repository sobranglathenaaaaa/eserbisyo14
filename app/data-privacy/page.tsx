import type { Metadata } from 'next';
import { LegalBackButton } from '@/components/legal-back-button';
import { LegalDocumentView } from '@/components/legal-document-view';
import { getLegalDocument } from '@/lib/content/legal-documents.server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Data Privacy',
  description: 'Read the Data Privacy policy of eSerbisyo in compliance with the Data Privacy Act of 2012 (RA 10173).',
};

export default async function DataPrivacyPage() {
  const document = await getLegalDocument('data-privacy');

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-4">
        <LegalBackButton />
      </div>
      <LegalDocumentView document={document} />
    </main>
  );
}
