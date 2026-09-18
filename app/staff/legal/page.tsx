'use client';

import { useEffect, useState } from 'react';
import PortalShell from '@/components/portal-shell';
import { SectionCard } from '@/components/portal-ui';
import { LegalDocumentView } from '@/components/legal-document-view';
import {
  defaultLegalDocuments,
  LEGAL_DOCUMENT_SLUGS,
  type LegalDocument,
  type LegalDocumentSlug,
  withLegalDocumentDefaults,
} from '@/lib/content/legal-documents';
import { useAppState } from '@/lib/frontend-data/use-app-state';

function extractLocaleSection(body: string, locale: 'en' | 'fil') {
  const lines = body.split(/\r?\n/);
  const englishIndex = lines.findIndex((l) => l.trim().toLowerCase().startsWith('# english'));
  const filipinoIndex = lines.findIndex((l) => l.trim().toLowerCase().startsWith('# filipino'));

  if (locale === 'en') {
    if (englishIndex === -1) return body;
    const start = englishIndex + 1;
    const end = filipinoIndex === -1 ? lines.length : filipinoIndex;
    return lines.slice(start, end).join('\n').trim() || body;
  }

  // fil
  if (filipinoIndex === -1) return '';
  const start = filipinoIndex + 1;
  const end = englishIndex === -1 ? lines.length : englishIndex;
  return lines.slice(start, end).join('\n').trim() || '';
}

export default function StaffLegalPage() {
  const [documents, setDocuments] = useState<LegalDocument[] | null>(null);
  const { locale } = useAppState();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch('/api/v1/legal-documents');
        const payload = (await response.json().catch(() => null)) as
          | { success: true; data: { documents: LegalDocument[] } }
          | { success: false }
          | null;

        if (!cancelled && response.ok && payload?.success) {
          setDocuments(payload.data.documents);
          return;
        }
      } catch (e) {
        // fallthrough to defaults
      }

      if (!cancelled) {
        const defaults = LEGAL_DOCUMENT_SLUGS.map((slug: LegalDocumentSlug) =>
          withLegalDocumentDefaults({ ...defaultLegalDocuments[slug], slug, persisted: false })
        );
        setDocuments(defaults);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PortalShell
      role="staff"
      title={{ en: 'Legal', fil: 'Legal' }}
      description={{
        en: 'View the Terms and Conditions and Data Privacy policies.',
        fil: 'Basahin ang Terms and Conditions at Data Privacy policies.',
      }}
      showHero={false}
    >
      <div className="grid gap-4">
        <SectionCard title="Legal" description="Terms and Conditions and Data Privacy — read-only">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              {documents ? (
                <LegalDocumentView
                  document={{
                    ...(documents.find((d) => d.slug === 'terms-and-conditions') ?? withLegalDocumentDefaults({ ...defaultLegalDocuments['terms-and-conditions'], slug: 'terms-and-conditions', persisted: false })),
                    body: extractLocaleSection((documents.find((d) => d.slug === 'terms-and-conditions') ?? defaultLegalDocuments['terms-and-conditions']).body, locale === 'fil' ? 'fil' : 'en'),
                  }}
                  framed={true}
                />
              ) : null}
            </div>

            <div>
              {documents ? (
                <LegalDocumentView
                  document={{
                    ...(documents.find((d) => d.slug === 'data-privacy') ?? withLegalDocumentDefaults({ ...defaultLegalDocuments['data-privacy'], slug: 'data-privacy', persisted: false })),
                    body: extractLocaleSection((documents.find((d) => d.slug === 'data-privacy') ?? defaultLegalDocuments['data-privacy']).body, locale === 'fil' ? 'fil' : 'en'),
                  }}
                  framed={true}
                />
              ) : null}
            </div>
          </div>
        </SectionCard>
      </div>
    </PortalShell>
  );
}
