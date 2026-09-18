'use client';

import { FormEvent, useState } from 'react';
import { FieldLabel, PageGuide, SectionCard, StatusBadge } from '@/components/portal-ui';
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
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import PortalShell from '../../../components/portal-shell';
import { softDeleteMedicine, upsertMedicine } from '../../../lib/frontend-data/store';
import { useAppState } from '../../../lib/frontend-data/use-app-state';

export default function StaffMedicinesPage() {
  const { state, locale } = useAppState();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('unit');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const pageCopy = getRolePageCopy('staff/medicines');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantityValue = Number.parseInt(quantity, 10);
    if (!Number.isFinite(quantityValue) || quantityValue < 0) return;

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
  };

  const updateQuantity = async (medicineId: string, nextQuantity: number, nameValue: string, unitValue: string, descriptionValue: string, expiryValue?: string) => {
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
      </SectionCard>

      <SectionCard title={locale === 'fil' ? 'Imbentaryo' : 'Inventory'}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{locale === 'fil' ? 'Pangalan' : 'Name'}</TableHead>
              <TableHead>{locale === 'fil' ? 'Dami' : 'Quantity'}</TableHead>
              <TableHead>{locale === 'fil' ? 'Yunit' : 'Unit'}</TableHead>
              <TableHead>{locale === 'fil' ? 'Expiry' : 'Expiry'}</TableHead>
              <TableHead>{locale === 'fil' ? 'Paglalarawan' : 'Description'}</TableHead>
              <TableHead>{locale === 'fil' ? 'Available' : 'Available'}</TableHead>
              <TableHead>{locale === 'fil' ? 'Naka-archive' : 'Archived'}</TableHead>
              <TableHead>{locale === 'fil' ? 'Aksyon' : 'Action'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.medicines.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell>{item.expiryDate ?? '-'}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>
                  <StatusBadge tone={item.available ? 'success' : 'neutral'}>{item.available ? (locale === 'fil' ? 'Oo' : 'Yes') : (locale === 'fil' ? 'Hindi' : 'No')}</StatusBadge>
                </TableCell>
                <TableCell>
                  <StatusBadge tone={item.isDeleted ? 'danger' : 'neutral'}>{item.isDeleted ? (locale === 'fil' ? 'Oo' : 'Yes') : (locale === 'fil' ? 'Hindi' : 'No')}</StatusBadge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => void updateQuantity(item.id, item.quantity + 1, item.name, item.unit, item.description, item.expiryDate)}
                    >
                      {locale === 'fil' ? 'Dagdag +1' : 'Add +1'}
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => void updateQuantity(item.id, item.quantity - 1, item.name, item.unit, item.description, item.expiryDate)}
                    >
                      {locale === 'fil' ? 'Bawas -1' : 'Subtract -1'}
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() =>
                        void updateQuantity(
                          item.id,
                          item.available ? 0 : Math.max(1, item.quantity),
                          item.name,
                          item.unit,
                          item.description,
                          item.expiryDate
                        )
                      }
                    >
                      {item.available
                        ? locale === 'fil'
                          ? 'Itakda bilang Not Available'
                          : 'Mark Unavailable'
                        : locale === 'fil'
                          ? 'Itakda bilang Available'
                          : 'Mark Available'}
                    </Button>
                    <Button
                      variant="destructive"
                      type="button"
                      onClick={() => void softDeleteMedicine(item.id, !item.isDeleted)}
                    >
                      {item.isDeleted ? (locale === 'fil' ? 'Ibalik' : 'Restore') : locale === 'fil' ? 'I-archive' : 'Archive'}
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

