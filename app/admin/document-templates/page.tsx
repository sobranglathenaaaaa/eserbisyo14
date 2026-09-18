'use client';

import { FormEvent, useMemo, useState } from 'react';
import { FieldLabel, PageGuide, SectionCard } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/formatters';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import PortalShell from '../../../components/portal-shell';
import { upsertDocumentTemplate } from '../../../lib/frontend-data/store';
import { useAppState } from '../../../lib/frontend-data/use-app-state';

const SAMPLE_FIELDS: Record<string, string> = {
  residentName: 'Juan Dela Cruz',
  dateIssued: '2026-04-05',
  address: 'Blk 1 Lot 2, Mabini St., Barangay 123, Quezon City',
  referenceNumber: 'ES-2026-103944',
};

export default function AdminDocumentTemplatesPage() {
  const { state, locale } = useAppState();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [fields, setFields] = useState('residentName,dateIssued,address,referenceNumber');
  const pageCopy = getRolePageCopy('admin/document-templates');

  const preview = useMemo(() => {
    const dynamicFields = fields.split(',').map((item) => item.trim()).filter(Boolean);
    return dynamicFields.reduce((template, field) => {
      const replacement = SAMPLE_FIELDS[field] ?? `[${field}]`;
      return template.replaceAll(`{{${field}}}`, replacement);
    }, body || '{{residentName}}');
  }, [body, fields]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await upsertDocumentTemplate({
      id: editingId ?? undefined,
      name,
      body,
      dynamicFields: fields.split(',').map((item) => item.trim()).filter(Boolean),
    });
    setEditingId(null);
    setName('');
    setBody('');
  };

  return (
    <PortalShell role="admin" allowedRoles={['admin', 'staff']} title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {pageCopy.guide ? (
        <PageGuide
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,1fr)]">
        <SectionCard
          title={editingId ? (locale === 'fil' ? 'I-edit ang Template' : 'Edit Template') : locale === 'fil' ? 'Bagong Template' : 'New Template'}
          description={locale === 'fil'
            ? 'Maglagay ng dynamic fields gamit ang format na {{fieldName}}.'
            : 'Use dynamic fields in {{fieldName}} format.'}
        >
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            <FieldLabel label={locale === 'fil' ? 'Pangalan' : 'Name'}>
              <Input value={name} onChange={(event) => setName(event.target.value)} required />
            </FieldLabel>
            <FieldLabel
              label={locale === 'fil' ? 'Dynamic fields (comma separated)' : 'Dynamic fields (comma separated)'}
              hint={locale === 'fil' ? 'Halimbawa: residentName,dateIssued,address,referenceNumber' : 'Example: residentName,dateIssued,address,referenceNumber'}
            >
              <Input value={fields} onChange={(event) => setFields(event.target.value)} />
            </FieldLabel>
            <FieldLabel label={locale === 'fil' ? 'Nilalaman' : 'Body'} className="md:col-span-2">
              <Textarea value={body} onChange={(event) => setBody(event.target.value)} required className="min-h-[180px]" />
            </FieldLabel>
            <div className="flex items-end gap-2 md:col-span-2">
              <Button type="submit">{editingId ? (locale === 'fil' ? 'I-save ang Edit' : 'Save Edit') : locale === 'fil' ? 'I-save ang Template' : 'Save Template'}</Button>
              {editingId ? (
                <Button type="button" variant="secondary" onClick={() => {
                  setEditingId(null);
                  setName('');
                  setBody('');
                }}>
                  {locale === 'fil' ? 'Cancel Edit' : 'Cancel Edit'}
                </Button>
              ) : null}
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title={locale === 'fil' ? 'Layout and Wording Preview' : 'Layout and Wording Preview'}
          description={locale === 'fil' ? 'Sample preview ito para makita ang epekto ng edits bago i-save.' : 'Sample preview to understand how edits will render before saving.'}
        >
          <div className="rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-[color:var(--portal-ink-500)]">{name || (locale === 'fil' ? 'Template preview' : 'Template preview')}</p>
            <div className="mt-2 whitespace-pre-wrap text-sm text-[color:var(--portal-ink-800)]">{preview}</div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title={locale === 'fil' ? 'Listahan ng Template' : 'Template List'}>
        <div className="grid gap-2">
          {state.documentTemplates.map((item) => (
            <div key={item.id} className="rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--portal-ink-900)]">{item.name}</p>
                  <p className="text-xs text-[color:var(--portal-ink-500)]">{item.dynamicFields.join(', ')}</p>
                  <p className="mt-1 text-xs text-[color:var(--portal-ink-500)]">{formatDateTime(item.updatedAt, locale)}</p>
                </div>
                <Button size="sm" variant="secondary" type="button" onClick={() => {
                  setEditingId(item.id);
                  setName(item.name);
                  setBody(item.body);
                  setFields(item.dynamicFields.join(','));
                }}>
                  {locale === 'fil' ? 'I-edit' : 'Edit'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </PortalShell>
  );
}
