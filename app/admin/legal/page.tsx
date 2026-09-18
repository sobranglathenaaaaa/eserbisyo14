'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Save, Edit } from 'lucide-react';
import PortalShell from '@/components/portal-shell';
import { FormFeedback, SectionCard } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LegalDocumentView } from '@/components/legal-document-view';
import {
  defaultLegalDocuments,
  LEGAL_DOCUMENT_SLUGS,
  type LegalDocument,
  type LegalDocumentSlug,
  withLegalDocumentDefaults,
} from '@/lib/content/legal-documents';
import { getSupabaseBrowserClient, getSupabaseSessionSafely } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Feedback = { tone: 'success' | 'error' | 'info'; text: string };

function defaultDocuments(): LegalDocument[] {
  return LEGAL_DOCUMENT_SLUGS.map((slug) => withLegalDocumentDefaults({ ...defaultLegalDocuments[slug], persisted: false }));
}

function labelFor(slug: LegalDocumentSlug) {
  return slug === 'terms-and-conditions' ? 'Terms and Conditions' : 'Data Privacy';
}

export default function AdminLegalPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>(defaultDocuments);
  const [activeSlug, setActiveSlug] = useState<LegalDocumentSlug>('terms-and-conditions');
  const [draft, setDraft] = useState({ title: '', description: '', body: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [editing, setEditing] = useState(false);
  const feedbackRef = useRef<HTMLDivElement | null>(null);

  const activeDocument = useMemo(
    () => documents.find((document) => document.slug === activeSlug) ?? withLegalDocumentDefaults({ ...defaultLegalDocuments[activeSlug], persisted: false }),
    [activeSlug, documents]
  );

  useEffect(() => {
    if (!editing) {
      setDraft({
        title: activeDocument.title,
        description: activeDocument.description,
        body: activeDocument.body,
      });
    }
  }, [activeDocument, editing]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await getSupabaseSessionSafely(supabase);
        const token = sessionData.session?.access_token;
        const response = await fetch('/api/v1/legal-documents', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const payload = (await response.json().catch(() => null)) as
          | { success: true; data: { documents: LegalDocument[] } }
          | { success: false; error?: { message?: string } }
          | null;

        if (!cancelled && response.ok && payload?.success) {
          setDocuments(payload.data.documents);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (feedback && feedbackRef.current) {
      // Smooth-scroll the feedback into view so user sees it immediately
      try {
        feedbackRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
        // fallback
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [feedback]);

  async function handleSave() {
    setSaving(true);
    setFeedback(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await getSupabaseSessionSafely(supabase);
      const token = sessionData.session?.access_token;
      if (!token) {
        setFeedback({ tone: 'error', text: 'A valid admin session is required before saving.' });
        return;
      }

      const response = await fetch('/api/v1/legal-documents', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: activeSlug,
          title: draft.title,
          description: draft.description,
          body: draft.body,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { success: true; data: { document: LegalDocument } }
        | { success: false; error?: { message?: string } }
        | null;

      if (!response.ok || !payload || !payload.success) {
        const message = payload && !payload.success ? payload.error?.message : null;
        setFeedback({ tone: 'error', text: message ?? 'Unable to save legal content.' });
        return;
      }

      setDocuments((previous) => previous.map((document) => (document.slug === activeSlug ? payload.data.document : document)));
      setFeedback({ tone: 'success', text: `${labelFor(activeSlug)} saved.` });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const previewDocument: LegalDocument = {
    ...activeDocument,
    title: draft.title,
    description: draft.description,
    body: draft.body,
    persisted: activeDocument.persisted,
  };

  return (
    <PortalShell
      role="admin"
      title={{ en: 'Legal Content', fil: 'Legal Content' }}
      description={{
        en: 'Edit the public Terms and Conditions and Data Privacy pages without leaving the admin workspace.',
        fil: 'I-edit ang public Terms and Conditions at Data Privacy pages sa loob ng admin workspace.',
      }}
      showHero={false}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <SectionCard
          title="Legal Documents"
          description="Changes appear on the public legal pages after saving."
        >
          <div className="flex flex-wrap gap-2">
              {LEGAL_DOCUMENT_SLUGS.map((slug) => (
              <Button
                key={slug}
                type="button"
                variant={slug === activeSlug ? 'resident' : 'residentOutline'}
                onClick={() => {
                    setActiveSlug(slug);
                    setFeedback(null);
                    setEditing(false);
                }}
                className={cn('gap-2', slug === activeSlug ? '' : 'bg-white')}
              >
                <FileText size={15} />
                {labelFor(slug)}
              </Button>
            ))}
          </div>

          {feedback ? (
            <div ref={feedbackRef} className="mt-3">
              <FormFeedback tone={feedback.tone} text={feedback.text} />
            </div>
          ) : null}

          <form className="grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[color:var(--portal-ink-900)]">Title</span>
              <Input
                value={draft.title}
                onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
                required
                readOnly={!editing}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[color:var(--portal-ink-900)]">Description</span>
              <Input
                value={draft.description}
                onChange={(event) => setDraft((previous) => ({ ...previous, description: event.target.value }))}
                required
                readOnly={!editing}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-[color:var(--portal-ink-900)]">Content</span>
              <Textarea
                value={draft.body}
                onChange={(event) => setDraft((previous) => ({ ...previous, body: event.target.value }))}
                className="min-h-[520px] font-mono text-sm leading-6"
                required
                readOnly={!editing}
              />
            </label>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="flex items-center gap-2">
                {!editing ? (
                  <Button type="button" variant="resident" onClick={() => setEditing(true)} className="gap-2">
                    <Edit size={15} />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="resident" onClick={() => void handleSave()} disabled={saving} className="gap-2">
                      <Save size={15} />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      type="button"
                      variant="residentOutline"
                      onClick={() => {
                        setDraft({ title: activeDocument.title, description: activeDocument.description, body: activeDocument.body });
                        setEditing(false);
                        setFeedback(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>

          
        </SectionCard>

        <SectionCard title="Preview" description="This mirrors the public page rendering.">
          <div className="max-h-[860px] overflow-y-auto pr-1">
            <LegalDocumentView document={previewDocument} framed={false} />
          </div>
        </SectionCard>
      </div>
    </PortalShell>
  );
}
