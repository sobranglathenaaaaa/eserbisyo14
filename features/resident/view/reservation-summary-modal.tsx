'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { copyText } from '@/features/resident/model/copy';
import { formatDateTime } from '@/lib/formatters';
import type { Locale, Reservation } from '@/lib/types/models';

export function ReservationSummaryModal({
  open,
  reservation,
  locale,
  onClose,
}: {
  open: boolean;
  reservation: Reservation | null;
  locale: Locale;
  onClose: () => void;
}) {
  if (!open || !reservation) return null;

  const resourceLabel = reservation.resource === 'covered_court'
    ? 'Covered Court'
    : reservation.resource === 'barangay_hall'
      ? 'Multi Purpose Hall'
      : reservation.resource === 'service_vehicle'
        ? 'Service Vehicle'
        : reservation.itemName || 'Equipment';
  const statusLabels: Record<Reservation['status'], string> = {
    pending: copyText(locale, 'Pending', 'Pending'),
    approved: copyText(locale, 'Approved', 'Aprubado'),
    declined: copyText(locale, 'Declined', 'Tinanggihan'),
    cancelled: copyText(locale, 'Cancelled', 'Nakansela'),
    ready_for_pickup: copyText(locale, 'Ready for Pickup', 'Handa nang kunin'),
    received: copyText(locale, 'Received', 'Natanggap'),
    returned: copyText(locale, 'Returned', 'Naibalik'),
    completed: copyText(locale, 'Completed', 'Nakumpleto'),
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{resourceLabel}</DialogTitle>
          <DialogDescription>{copyText(locale, 'Reservation details', 'Detalye ng reservation')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 text-sm text-[color:var(--portal-ink-700)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{copyText(locale, 'Status', 'Katayuan')}</span>
            <StatusBadge tone={statusToneFromState(reservation.status)}>{statusLabels[reservation.status]}</StatusBadge>
          </div>
          <p>
            <strong>{copyText(locale, 'Updated', 'Na-update')}:</strong>{' '}
            {formatDateTime(reservation.updatedAt || reservation.createdAt, locale)}
          </p>
          {reservation.resource === 'equipment' && reservation.itemName ? (
            <p>
              <strong>{copyText(locale, 'Equipment', 'Kagamitan')}:</strong> {reservation.itemName}
              {reservation.quantityRequested ? ` × ${reservation.quantityRequested}` : ''}
            </p>
          ) : null}
          <p>
            <strong>{copyText(locale, 'Details', 'Detalye')}:</strong>{' '}
            {formatDateTime(reservation.startAt, locale)} - {formatDateTime(reservation.endAt, locale)}
            {reservation.purpose ? ` · ${reservation.purpose}` : ''}
          </p>
          {reservation.status === 'declined' ? (
            <p>
              <strong>{copyText(locale, 'Decline reason', 'Dahilan ng pagtanggi')}:</strong>{' '}
              {reservation.processingDeclineReason || reservation.adminDecisionReason || copyText(locale, 'No reason provided.', 'Walang ibinigay na dahilan.')}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
