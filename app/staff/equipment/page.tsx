'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import { FieldLabel, FormFeedback, PageGuide, SectionCard, StatusBadge } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import PortalShell from '../../../components/portal-shell';
import { deleteEquipment, softDeleteEquipment, upsertEquipment } from '../../../lib/frontend-data/store';
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
  const [savingEquipmentAction, setSavingEquipmentAction] = useState<{ id: string; action: 'archive' | 'restore' | 'delete' } | null>(null);
  const [equipmentToDelete, setEquipmentToDelete] = useState<(typeof state.equipment)[number] | null>(null);
  const [equipmentPage, setEquipmentPage] = useState(1);
  const equipmentPerPage = 5;
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

  const getBorrowedQuantity = (item: (typeof state.equipment)[number]) =>
    (state.reservations ?? [])
      .filter(
        (reservation) =>
          reservation.resource === 'equipment' &&
          reservation.status === 'received' &&
          reservation.itemName?.trim().toLowerCase() === item.name.trim().toLowerCase()
      )
      .reduce((total, reservation) => total + (reservation.quantityRequested ?? 0), 0);

  const getAvailableQuantity = (item: (typeof state.equipment)[number]) =>
    Math.max(0, item.quantity - getBorrowedQuantity(item));

  const equipmentItems = state.equipment ?? [];
  const equipmentPageCount = Math.max(1, Math.ceil(equipmentItems.length / equipmentPerPage));
  const paginatedEquipment = equipmentItems.slice(
    (equipmentPage - 1) * equipmentPerPage,
    equipmentPage * equipmentPerPage
  );

  useEffect(() => {
    setEquipmentPage((currentPage) => Math.min(currentPage, equipmentPageCount));
  }, [equipmentPageCount]);

  const saveQuantity = async (item: (typeof state.equipment)[number]) => {
    const availableQuantity = getAvailableQuantity(item);
    const draft = getQuantityDraft(item.id, availableQuantity);
    const nextAvailableQuantity = Number.parseInt(draft, 10);
    if (!Number.isFinite(nextAvailableQuantity) || nextAvailableQuantity < 0) {
      setQuantityDrafts((current) => ({ ...current, [item.id]: String(availableQuantity) }));
      return;
    }
    const nextQuantity = getBorrowedQuantity(item) + nextAvailableQuantity;
    if (nextAvailableQuantity === availableQuantity) {
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

  const permanentlyDeleteEquipment = async (item: (typeof state.equipment)[number]) => {
    setSavingEquipmentAction({ id: item.id, action: 'delete' });
    try {
      await deleteEquipment(item.id);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      setFeedbackTone('success');
      setFeedback(locale === 'fil' ? 'Permanenteng nabura ang equipment.' : 'Equipment permanently deleted.');
      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
        feedbackTimeoutRef.current = null;
      }, 5000);
    } catch (error) {
      setFeedbackTone('error');
      setFeedback(error instanceof Error ? error.message : locale === 'fil' ? 'Hindi nabura ang equipment.' : 'Unable to delete equipment.');
    } finally {
      setSavingEquipmentAction(null);
      setEquipmentToDelete(null);
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
        <div className="overflow-x-auto">
        <Table className="w-full min-w-[720px] table-fixed text-center">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[32%] text-center">{locale === 'fil' ? 'Pangalan' : 'Name'}</TableHead>
              <TableHead className="w-[34%] text-center">{locale === 'fil' ? 'Quantity' : 'Quantity'}</TableHead>
              <TableHead className="w-[16%] text-center">{locale === 'fil' ? 'Status' : 'Status'}</TableHead>
              <TableHead className="w-[18%] text-center">{locale === 'fil' ? 'Aksyon' : 'Action'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEquipment.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-center font-medium">{item.name}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      value={getQuantityDraft(item.id, getAvailableQuantity(item))}
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
                  <StatusBadge tone={item.isDeleted ? 'neutral' : getAvailableQuantity(item) <= 0 ? 'danger' : 'success'}>
                    {item.isDeleted
                      ? locale === 'fil' ? 'Naka-archive' : 'Archived'
                      : getAvailableQuantity(item) <= 0
                        ? locale === 'fil' ? 'Hindi available' : 'Unavailable'
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
                    <Button
                      type="button"
                      variant="ghost"
                      className="!h-8 !min-h-8 !w-8 !p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={savingEquipmentAction?.id === item.id}
                      onClick={() => setEquipmentToDelete(item)}
                      aria-label={locale === 'fil' ? `Burahin ang ${item.name}` : `Delete ${item.name}`}
                      title={locale === 'fil' ? 'Burahin' : 'Delete'}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        <div className="flex flex-col gap-3 border-t border-[color:var(--portal-border-soft)] px-2 pt-4 text-sm text-[color:var(--portal-ink-700)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            {equipmentItems.length === 0
              ? locale === 'fil' ? 'Walang equipment' : 'No equipment'
              : locale === 'fil'
                ? `Ipinapakita ang ${(equipmentPage - 1) * equipmentPerPage + 1}–${Math.min(equipmentPage * equipmentPerPage, equipmentItems.length)} sa ${equipmentItems.length}`
                : `Showing ${(equipmentPage - 1) * equipmentPerPage + 1}–${Math.min(equipmentPage * equipmentPerPage, equipmentItems.length)} of ${equipmentItems.length}`}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEquipmentPage((page) => Math.max(1, page - 1))}
              disabled={equipmentPage === 1}
            >
              {locale === 'fil' ? 'Nakaraan' : 'Previous'}
            </Button>
            <span className="min-w-16 text-center text-xs font-semibold">
              {equipmentPage} {locale === 'fil' ? 'sa' : 'of'} {equipmentPageCount}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEquipmentPage((page) => Math.min(equipmentPageCount, page + 1))}
              disabled={equipmentPage === equipmentPageCount}
            >
              {locale === 'fil' ? 'Susunod' : 'Next'}
            </Button>
          </div>
        </div>
      </SectionCard>
      {equipmentToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-equipment-title"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h2 id="delete-equipment-title" className="text-base font-semibold text-slate-900">
              {locale === 'fil' ? 'Burahin ang equipment?' : 'Delete equipment?'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {locale === 'fil'
                ? `Permanenteng buburahin ang "${equipmentToDelete.name}". Hindi na ito maibabalik.`
                : `"${equipmentToDelete.name}" will be permanently deleted. This cannot be undone.`}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEquipmentToDelete(null)}
                disabled={savingEquipmentAction?.id === equipmentToDelete.id}
              >
                {locale === 'fil' ? 'Kanselahin' : 'Cancel'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="border border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => void permanentlyDeleteEquipment(equipmentToDelete)}
                disabled={savingEquipmentAction?.id === equipmentToDelete.id}
              >
                {savingEquipmentAction?.id === equipmentToDelete.id
                  ? locale === 'fil' ? 'Binubura...' : 'Deleting...'
                  : locale === 'fil' ? 'Burahin' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
}
