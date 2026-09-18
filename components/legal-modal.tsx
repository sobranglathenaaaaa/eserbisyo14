"use client";

import { useEffect, useState, useRef } from 'react';
import { LegalDocumentView } from './legal-document-view';
import { defaultLegalDocuments, type LegalDocumentSlug, type LegalDocument } from '@/lib/content/legal-documents';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { Button } from './ui/button';

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

  if (filipinoIndex === -1) return '';
  const start = filipinoIndex + 1;
  const end = englishIndex === -1 ? lines.length : englishIndex;
  return lines.slice(start, end).join('\n').trim() || '';
}

export default function LegalModal({
  slug,
  open,
  onClose,
  onAgree,
  initialDocuments,
}: {
  slug: LegalDocumentSlug | null;
  open: boolean;
  onClose: () => void;
  onAgree: () => void;
  initialDocuments?: LegalDocument[] | null;
}) {
  const { locale } = useAppState();
  const [docBody, setDocBody] = useState<string>('');
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const prevOverflowRef = useRef<string | undefined>(undefined);
  const prevScrollRef = useRef<number>(0);

  useEffect(() => {
    if (!slug) return;
    if (initialDocuments && initialDocuments.length) {
      const foundInit = initialDocuments.find((d) => d.slug === slug);
      if (foundInit) {
        const body = extractLocaleSection(foundInit.body, locale === 'fil' ? 'fil' : 'en');
        setDocBody(body || foundInit.body);
        return;
      }
    }
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/v1/legal-documents');
        if (!res.ok) throw new Error('Fetch failed');
        const payload = await res.json().catch(() => null) as
          | { success: true; data: { documents: LegalDocument[] } }
          | { success: false }
          | null;

        if (cancelled) return;
        if (payload?.success) {
          const found = payload.data.documents.find((d) => d.slug === slug);
          if (found) {
            const body = extractLocaleSection(found.body, locale === 'fil' ? 'fil' : 'en');
            setDocBody(body || found.body);
            return;
          }
        }
      } catch (e) {
        // ignore and fall back to defaults
      }

      if (cancelled) return;
      const fallback = defaultLegalDocuments[slug];
      const body = extractLocaleSection(fallback.body, locale === 'fil' ? 'fil' : 'en');
      setDocBody(body || fallback.body);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, locale]);

  // When modal opens, lock background scroll, center viewport and focus close button.
  useEffect(() => {
    if (!open) return;
    // save previous state (could be empty string — preserve it)
    prevOverflowRef.current = document.body.style.overflow;
    prevScrollRef.current = window.scrollY || document.documentElement.scrollTop || 0;

    // prevent background from scrolling
    document.body.style.overflow = 'hidden';

    // Scroll the page so the modal is visually centered
    try {
      const center = Math.max(0, document.body.scrollHeight / 2 - window.innerHeight / 2);
      window.scrollTo({ top: center, behavior: 'smooth' });
    } catch (e) {
      // ignore
    }

    // focus the close button for accessibility after a short delay
    const t = setTimeout(() => closeBtnRef.current?.focus(), 300);

    return () => {
      clearTimeout(t);
      // restore previous overflow (if undefined, clear it)
      document.body.style.overflow = prevOverflowRef.current ?? '';
      try {
        window.scrollTo({ top: prevScrollRef.current, behavior: 'auto' });
      } catch (e) {
        // ignore
      }
    };
  }, [open]);

  if (!open || !slug) return null;

  const doc = {
    ...defaultLegalDocuments[slug],
    body: docBody,
  };

  const headerTitle = doc.title;
  const docForView = { ...doc, title: '', updatedAt: '' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }} aria-modal={true} role="dialog">
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(980px, 96%)',
          maxHeight: '86vh',
          zIndex: 2001,
          padding: 0,
          borderRadius: '1rem',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          background: '#fff',
        }}
      >
        {/* Header bar */}
        <div style={{ background: '#1a6b4f', color: '#fff', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{headerTitle}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ position: 'absolute', right: '0.5rem', top: '0.5rem', border: 'none', background: 'transparent', color: '#fff', fontSize: '1.15rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '1rem', maxHeight: 'calc(86vh - 156px)', overflowY: 'auto' }}>
          <LegalDocumentView document={docForView as any} framed={false} />
        </div>

        {/* Footer with Agree button */}
        <div style={{ borderTop: '1px solid rgba(26,107,79,0.08)', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', background: '#fff' }}>
          <Button variant="resident" onClick={onAgree}>
            {slug === 'terms-and-conditions' ? 'I Agree the Terms' : 'I Agree'}
          </Button>
        </div>
      </div>
    </div>
  );
}
