'use client';

import { FormEvent, useMemo, useState } from 'react';
import { FieldLabel, FormFeedback, PageGuide, SectionCard, StatusBadge } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/formatters';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import PortalShell from '../../../components/portal-shell';
import { softDeleteMedicine, upsertMedicine } from '../../../lib/frontend-data/store';
import { useAppState } from '../../../lib/frontend-data/use-app-state';

type InventoryFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock' | 'archived';

export default function AdminMedicinesPage() {
  const { state, locale } = useAppState();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('unit');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [inventoryQuery, setInventoryQuery] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>('all');
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const pageCopy = getRolePageCopy('admin/medicines');

  const visibleMedicines = useMemo(() => {
    const query = inventoryQuery.trim().toLowerCase();
    return [...state.medicines]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((item) => {
        const matchesQuery =
          !query ||
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.unit.toLowerCase().includes(query);
        if (!matchesQuery) return false;

        if (inventoryFilter === 'archived') return item.isDeleted;
        if (item.isDeleted) return false;
        if (inventoryFilter === 'in-stock') return item.quantity > 5;
        if (inventoryFilter === 'low-stock') return item.quantity > 0 && item.quantity <= 5;
        if (inventoryFilter === 'out-of-stock') return item.quantity <= 0;
        return true;
      });
  }, [state.medicines, inventoryQuery, inventoryFilter]);

  const lowStockCount = state.medicines.filter((item) => !item.isDeleted && item.quantity > 0 && item.quantity <= 5).length;
  const outOfStockCount = state.medicines.filter((item) => !item.isDeleted && item.quantity <= 0).length;
  const inventoryCounts = useMemo(() => {
    const all = state.medicines.filter((item) => !item.isDeleted).length;
    const inStock = state.medicines.filter((item) => !item.isDeleted && item.quantity > 5).length;
    const lowStock = state.medicines.filter((item) => !item.isDeleted && item.quantity > 0 && item.quantity <= 5).length;
    const outOfStock = state.medicines.filter((item) => !item.isDeleted && item.quantity <= 0).length;
    const archived = state.medicines.filter((item) => item.isDeleted).length;
    return {
      all,
      'in-stock': inStock,
      'low-stock': lowStock,
      'out-of-stock': outOfStock,
      archived,
    } satisfies Record<InventoryFilter, number>;
  }, [state.medicines]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantityValue = Number.parseInt(quantity, 10);
    if (!Number.isFinite(quantityValue) || quantityValue < 0) {
      setFeedback({
        tone: 'error',
        text: locale === 'fil' ? 'Dapat zero o mas mataas ang quantity.' : 'Quantity must be zero or higher.',
      });
      return;
    }

    try {
      await upsertMedicine({
        name,
        quantity: quantityValue,
        unit,
        description,
        expiryDate: expiryDate || undefined,
        available: quantityValue > 0,
      });
      setName('');
      setQuantity('1');
      setUnit('unit');
      setDescription('');
      setExpiryDate('');
      setFeedback({
        tone: 'success',
        text: locale === 'fil' ? 'Nadagdag ang gamot sa inventory.' : 'Medicine added to inventory.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : locale === 'fil' ? 'Hindi maidagdag ang gamot.' : 'Unable to add medicine.',
      });
    }
  };

  const updateQuantity = async (
    medicineId: string,
    nextQuantity: number,
    nameValue: string,
    unitValue: string,
    descriptionValue: string,
    expiryValue?: string
  ) => {
    const clamped = Math.max(0, nextQuantity);
    await upsertMedicine({
      id: medicineId,
      name: nameValue,
      quantity: clamped,
      unit: unitValue || 'unit',
      description: descriptionValue,
      expiryDate: expiryValue,
      available: clamped > 0,
    });
  };

  const getQuantityDraft = (medicineId: string, fallback: number) =>
    quantityDrafts[medicineId] ?? String(fallback);

  const adjustQuantityDraft = (medicineId: string, fallback: number, delta: number) => {
    const current = Number.parseInt(getQuantityDraft(medicineId, fallback), 10);
    const safeCurrent = Number.isFinite(current) ? current : fallback;
    const next = Math.max(0, safeCurrent + delta);
    setQuantityDrafts((prev) => ({ ...prev, [medicineId]: String(next) }));
  };

  const saveQuantityDraft = async (medicine: (typeof state.medicines)[number]) => {
    const parsed = Number.parseInt(getQuantityDraft(medicine.id, medicine.quantity), 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setFeedback({
        tone: 'error',
        text:
          locale === 'fil'
            ? `Invalid quantity para sa ${medicine.name}.`
            : `Invalid quantity for ${medicine.name}.`,
      });
      return;
    }

    setActiveRowId(medicine.id);
    try {
      await updateQuantity(
        medicine.id,
        parsed,
        medicine.name,
        medicine.unit,
        medicine.description,
        medicine.expiryDate
      );
      setFeedback({
        tone: 'success',
        text:
          locale === 'fil'
            ? `Na-update ang quantity ng ${medicine.name}.`
            : `${medicine.name} quantity updated.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : locale === 'fil' ? 'Hindi na-update ang quantity.' : 'Unable to update quantity.',
      });
    } finally {
      setActiveRowId(null);
    }
  };

  const toggleAvailability = async (medicine: (typeof state.medicines)[number]) => {
    const restoreQuantity = Math.max(1, medicine.quantity || 1);
    const nextQuantity = medicine.available ? 0 : restoreQuantity;
    setActiveRowId(medicine.id);
    try {
      await updateQuantity(
        medicine.id,
        nextQuantity,
        medicine.name,
        medicine.unit,
        medicine.description,
        medicine.expiryDate
      );
      setFeedback({
        tone: 'success',
        text:
          medicine.available
            ? locale === 'fil'
              ? `${medicine.name} ay naka-mark na unavailable.`
              : `${medicine.name} marked unavailable.`
            : locale === 'fil'
              ? `${medicine.name} ay naka-mark na available.`
              : `${medicine.name} marked available.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : locale === 'fil' ? 'Hindi ma-update ang availability.' : 'Unable to update availability.',
      });
    } finally {
      setActiveRowId(null);
    }
  };

  const toggleArchive = async (medicine: (typeof state.medicines)[number]) => {
    setActiveRowId(medicine.id);
    try {
      await softDeleteMedicine(medicine.id, !medicine.isDeleted);
      setFeedback({
        tone: 'success',
        text:
          medicine.isDeleted
            ? locale === 'fil'
              ? `${medicine.name} ay na-restore.`
              : `${medicine.name} restored.`
            : locale === 'fil'
              ? `${medicine.name} ay na-archive.`
              : `${medicine.name} archived.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : locale === 'fil' ? 'Hindi ma-update ang archive state.' : 'Unable to update archive state.',
      });
    } finally {
      setActiveRowId(null);
    }
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

      <SectionCard title={locale === 'fil' ? 'Magdagdag ng Gamot' : 'Add Medicine'}>
        <form className="grid gap-3 md:grid-cols-6" onSubmit={onSubmit}>
          <FieldLabel label={locale === 'fil' ? 'Pangalan' : 'Name'}>
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </FieldLabel>
          <FieldLabel label={locale === 'fil' ? 'Dami' : 'Quantity'}>
            <Input type="number" min={0} value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
          </FieldLabel>
          <FieldLabel label={locale === 'fil' ? 'Yunit' : 'Unit'}>
            <Input value={unit} onChange={(event) => setUnit(event.target.value)} required />
          </FieldLabel>
          <FieldLabel label={locale === 'fil' ? 'Petsa ng Expiry' : 'Expiry Date'}>
            <Input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
          </FieldLabel>
          <FieldLabel label={locale === 'fil' ? 'Paglalarawan' : 'Description'}>
            <Input value={description} onChange={(event) => setDescription(event.target.value)} />
          </FieldLabel>
          <div className="flex items-end">
            <Button type="submit">{locale === 'fil' ? 'Idagdag' : 'Add'}</Button>
          </div>
        </form>
        {feedback ? <FormFeedback tone={feedback.tone} text={feedback.text} /> : null}
      </SectionCard>

      <SectionCard
        title={locale === 'fil' ? 'Imbentaryo' : 'Inventory'}
        description={
          locale === 'fil'
            ? `Low stock: ${lowStockCount} · Out of stock: ${outOfStockCount}`
            : `Low stock: ${lowStockCount} · Out of stock: ${outOfStockCount}`
        }
      >
        <div className="mb-3 grid gap-3 md:grid-cols-[minmax(280px,1fr)_auto] md:items-end">
          <FieldLabel label={locale === 'fil' ? 'Maghanap sa inventory' : 'Search inventory'}>
            <Input
              value={inventoryQuery}
              onChange={(event) => setInventoryQuery(event.target.value)}
              placeholder={
                locale === 'fil'
                  ? 'Pangalan, yunit, o description'
                  : 'Name, unit, or description'
              }
            />
          </FieldLabel>
          <div className="rounded-xl border border-[color:var(--portal-border-soft)] bg-[color:#f6f8f7] p-1">
            {(
              [
                ['all', locale === 'fil' ? 'Lahat' : 'All'],
                ['in-stock', locale === 'fil' ? 'May stock' : 'In stock'],
                ['low-stock', locale === 'fil' ? 'Mababang stock' : 'Low stock'],
                ['out-of-stock', locale === 'fil' ? 'Walang stock' : 'Out of stock'],
                ['archived', locale === 'fil' ? 'Naka-archive' : 'Archived'],
              ] as Array<[InventoryFilter, string]>
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant="ghost"
                className={`h-9 rounded-lg px-3 ${
                  inventoryFilter === value
                    ? 'border border-[color:#1f6f4f] bg-white text-[color:#14543a] shadow-sm'
                    : 'text-[color:var(--portal-ink-700)] hover:bg-white'
                }`}
                onClick={() => setInventoryFilter(value)}
                aria-pressed={inventoryFilter === value}
              >
                <span>{label}</span>
                <span
                  className={`ml-2 inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                    inventoryFilter === value
                      ? 'bg-[color:#dff3e8] text-[color:#14543a]'
                      : 'bg-[color:#e7ecea] text-[color:#4d5b55]'
                  }`}
                >
                  {inventoryCounts[value]}
                </span>
              </Button>
            ))}
          </div>
        </div>
        <p className="mb-3 text-xs text-[color:var(--portal-ink-500)]">
          {locale === 'fil'
            ? `${visibleMedicines.length} item ang ipinapakita sa "${inventoryFilter === 'all' ? 'Lahat' : inventoryFilter === 'in-stock' ? 'May stock' : inventoryFilter === 'low-stock' ? 'Mababang stock' : inventoryFilter === 'out-of-stock' ? 'Walang stock' : 'Naka-archive'}".`
            : `${visibleMedicines.length} item(s) shown in "${inventoryFilter === 'all' ? 'All' : inventoryFilter === 'in-stock' ? 'In stock' : inventoryFilter === 'low-stock' ? 'Low stock' : inventoryFilter === 'out-of-stock' ? 'Out of stock' : 'Archived'}".`}
        </p>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{locale === 'fil' ? 'Pangalan' : 'Name'}</TableHead>
              <TableHead>{locale === 'fil' ? 'Kasalukuyang stock' : 'Current stock'}</TableHead>
              <TableHead>{locale === 'fil' ? 'Baguhin ang dami' : 'Adjust quantity'}</TableHead>
              <TableHead>{locale === 'fil' ? 'Expiry' : 'Expiry'}</TableHead>
              <TableHead>{locale === 'fil' ? 'Na-update' : 'Updated'}</TableHead>
              <TableHead>{locale === 'fil' ? 'Available' : 'Available'}</TableHead>
              <TableHead>{locale === 'fil' ? 'Naka-archive' : 'Archived'}</TableHead>
              <TableHead>{locale === 'fil' ? 'Aksyon' : 'Action'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleMedicines.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-medium">{item.name}</p>
                  {item.description ? <p className="text-xs text-[color:var(--portal-ink-500)]">{item.description}</p> : null}
                </TableCell>
                <TableCell>
                  <p className="font-medium">
                    {item.quantity} {item.unit}
                  </p>
                  {item.quantity <= 0 ? (
                    <StatusBadge tone="danger">{locale === 'fil' ? 'Out of stock' : 'Out of stock'}</StatusBadge>
                  ) : item.quantity <= 5 ? (
                    <StatusBadge tone="warning">{locale === 'fil' ? 'Low stock' : 'Low stock'}</StatusBadge>
                  ) : (
                    <StatusBadge tone="success">{locale === 'fil' ? 'Healthy stock' : 'Healthy stock'}</StatusBadge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      type="button"
                      variant="secondary"
                      disabled={activeRowId === item.id}
                      onClick={() => adjustQuantityDraft(item.id, item.quantity, -1)}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      value={getQuantityDraft(item.id, item.quantity)}
                      onChange={(event) =>
                        setQuantityDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))
                      }
                      className="w-[88px]"
                    />
                    <Button
                      size="sm"
                      type="button"
                      variant="secondary"
                      disabled={activeRowId === item.id}
                      onClick={() => adjustQuantityDraft(item.id, item.quantity, 1)}
                    >
                      +
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      disabled={activeRowId === item.id}
                      onClick={() => void saveQuantityDraft(item)}
                    >
                      {locale === 'fil' ? 'Save' : 'Save'}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{item.expiryDate ?? '-'}</TableCell>
                <TableCell>{formatDateTime(item.updatedAt, locale)}</TableCell>
                <TableCell>
                  <StatusBadge tone={item.available ? 'success' : 'neutral'}>{item.available ? (locale === 'fil' ? 'Oo' : 'Yes') : (locale === 'fil' ? 'Hindi' : 'No')}</StatusBadge>
                </TableCell>
                <TableCell>
                  <StatusBadge tone={item.isDeleted ? 'danger' : 'neutral'}>{item.isDeleted ? (locale === 'fil' ? 'Oo' : 'Yes') : (locale === 'fil' ? 'Hindi' : 'No')}</StatusBadge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      type="button"
                      disabled={activeRowId === item.id}
                      onClick={() => void toggleAvailability(item)}
                    >
                      {item.available
                        ? locale === 'fil'
                          ? 'Mark Unavailable'
                          : 'Mark Unavailable'
                        : locale === 'fil'
                          ? 'Mark Available'
                          : 'Mark Available'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      type="button"
                      disabled={activeRowId === item.id}
                      onClick={() => void toggleArchive(item)}
                    >
                      {item.isDeleted ? (locale === 'fil' ? 'Ibalik' : 'Restore') : locale === 'fil' ? 'I-archive' : 'Archive'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!visibleMedicines.length ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-[color:var(--portal-ink-500)]">
                  {locale === 'fil' ? 'Walang tumugmang inventory items.' : 'No inventory items matched your filters.'}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </SectionCard>
    </PortalShell>
  );
}
