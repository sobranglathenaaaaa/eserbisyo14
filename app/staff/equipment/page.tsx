'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { FieldLabel, FormFeedback, PageGuide, SectionCard, StatusBadge } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import PortalShell from '../../../components/portal-shell';
import { softDeleteEquipment, upsertEquipment } from '../../../lib/frontend-data/store';
import { useAppState } from '../../../lib/frontend-data/use-app-state';

export default function StaffEquipmentPage() {
  const { state, locale } = useAppState();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'error'>('success');
  const [isSaving, setIsSaving] = useState(false);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [savingQuantityId, setSavingQuantityId] = useState<string | null>(null);
  const [savingEquipmentAction, setSavingEquipmentAction] = useState<{ id: string; action: 'archive' | 'restore' } | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageCopy = getRolePageCopy('staff/equipment') ?? {
    title: { en: 'Equipment', fil: 'Equipment' },
    description: { en: 'Manage equipment stock for reservations.', fil: 'Pamahalaan ang stock ng equipment para sa reservations.' },
  };

  useEffect(() => () => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantityValue = Number.parseInt(quantity, 10);
    if (!Number.isFinite(quantityValue) || quantityValue < 0 || !name.trim()) return;
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setIsSaving(true);
    try {
      await upsertEquipment({ name, quantity: quantityValue });
      setName('');
      setQuantity('1');
      setFeedbackTone('success');
      setFeedback(locale === 'fil' ? 'Nadagdag ang equipment.' : 'Equipment added successfully.');
      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
        feedbackTimeoutRef.current = null;
      }, 5000);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : locale === 'fil' ? 'Hindi nadagdag ang equipment.' : 'Unable to add equipment.');
    } finally {
      setIsSaving(false);
    }
  };

  const getQuantityDraft = (id: string, currentQuantity: number) => quantityDrafts[id] ?? String(currentQuantity);

  const saveQuantity = async (item: (typeof state.equipment)[number]) => {
    const draft = getQuantityDraft(item.id, item.quantity);
    const nextQuantity = Number.parseInt(draft, 10);
    if (!Number.isFinite(nextQuantity) || nextQuantity < 0) {
      setQuantityDrafts((current) => ({ ...current, [item.id]: String(item.quantity) }));
      return;
    }
    if (nextQuantity === item.quantity) {
      setQuantityDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      return;
    }

    setSavingQuantityId(item.id);
    try {
      await upsertEquipment({ id: item.id, name: item.name, quantity: nextQuantity });
      setQuantityDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      setFeedbackTone('success');
      setFeedback(locale === 'fil' ? 'Na-save ang quantity.' : 'Quantity saved successfully.');
      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
        feedbackTimeoutRef.current = null;
      }, 5000);
    } finally {
      setSavingQuantityId(null);
    }
  };

  const toggleEquipmentArchive = async (item: (typeof state.equipment)[number]) => {
    const action = item.isDeleted ? 'restore' : 'archive';
    setSavingEquipmentAction({ id: item.id, action });
    try {
      await softDeleteEquipment(item.id, !item.isDeleted);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      setFeedbackTone(action === 'archive' ? 'error' : 'success');
      setFeedback(
        locale === 'fil'
          ? action === 'archive'
            ? 'Na-archive ang equipment.'
            : 'Na-restore ang equipment.'
          : action === 'archive'
            ? 'Equipment archived successfully.'
            : 'Equipment restored successfully.'
      );
      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
        feedbackTimeoutRef.current = null;
      }, 5000);
    } catch (error) {
      setFeedbackTone('error');
      setFeedback(error instanceof Error ? error.message : locale === 'fil' ? 'Hindi na-update ang equipment.' : 'Unable to update equipment.');
    } finally {
      setSavingEquipmentAction(null);
    }
  };

  return (
    <PortalShell role="staff" title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {pageCopy.guide ? (
        <PageGuide
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}

      <SectionCard title={locale === 'fil' ? 'Magdagdag ng Equipment' : 'Add Equipment'}>
        <form className="grid gap-3 md:grid-cols-[2fr_1fr_auto]" onSubmit={onSubmit}>
          <FieldLabel label={locale === 'fil' ? 'Pangalan' : 'Name'}>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tables / Chairs / Ladders" required />
          </FieldLabel>
          <FieldLabel label={locale === 'fil' ? 'Quantity' : 'Quantity'}>
            <Input type="number" min={0} value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
          </FieldLabel>
          <div className="flex items-end">
            <Button type="submit" variant="ghost" disabled={isSaving}>
              {isSaving ? (locale === 'fil' ? 'Sine-save...' : 'Saving...') : locale === 'fil' ? 'I-save' : 'Save'}
            </Button>
          </div>
        </form>
      </SectionCard>

      {feedback ? <FormFeedback tone={feedbackTone} text={feedback} /> : null}

      <SectionCard title={locale === 'fil' ? 'Inventory ng Equipment' : 'Equipment Inventory'}>
        <Table className="text-center">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">{locale === 'fil' ? 'Pangalan' : 'Name'}</TableHead>
              <TableHead className="text-center">{locale === 'fil' ? 'Quantity' : 'Quantity'}</TableHead>
              <TableHead className="text-center">{locale === 'fil' ? 'Status' : 'Status'}</TableHead>
              <TableHead className="text-center">{locale === 'fil' ? 'Aksyon' : 'Action'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(state.equipment ?? []).map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-center font-medium">{item.name}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      value={getQuantityDraft(item.id, item.quantity)}
                      aria-label={`${locale === 'fil' ? 'Quantity para sa' : 'Quantity for'} ${item.name}`}
                      className="w-24 text-center"
                      onChange={(event) => setQuantityDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="!h-8 !min-h-8 !w-8 !p-0"
                      aria-label={locale === 'fil' ? 'I-save ang quantity' : 'Save quantity'}
                      disabled={savingQuantityId === item.id}
                      onClick={() => void saveQuantity(item)}
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="!h-8 !min-h-8 !w-8 !p-0"
                      aria-label={locale === 'fil' ? 'I-cancel ang pagbabago' : 'Cancel quantity change'}
                      disabled={savingQuantityId === item.id}
                      onClick={() => setQuantityDrafts((current) => {
                        const next = { ...current };
                        delete next[item.id];
                        return next;
                      })}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <StatusBadge tone={item.isDeleted ? 'neutral' : item.quantity <= 0 ? 'danger' : 'success'}>
                    {item.isDeleted
                      ? locale === 'fil' ? 'Naka-archive' : 'Archived'
                      : item.quantity <= 0
                        ? locale === 'fil' ? 'Wala' : 'Out of stock'
                        : 'Available'}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={savingEquipmentAction?.id === item.id}
                      onClick={() => void toggleEquipmentArchive(item)}
                    >
                      {savingEquipmentAction?.id === item.id
                        ? savingEquipmentAction.action === 'restore'
                          ? locale === 'fil'
                            ? 'Nire-restore'
                            : 'Restoring'
                          : locale === 'fil'
                            ? 'Nia-archive'
                            : 'Archiving'
                        : item.isDeleted
                          ? locale === 'fil'
                            ? 'Ibalik'
                            : 'Restore'
                          : locale === 'fil'
                            ? 'I-archive'
                            : 'Archive'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </PortalShell>
  );
}
