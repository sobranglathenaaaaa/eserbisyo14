'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime, getRequestStatusLabel } from '@/lib/formatters';
import type { DocumentRequest, Locale } from '@/lib/types/models';
import { copyText } from '@/features/resident/model/copy';
import { StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

export function DocumentRequestSummaryModal({
  open,
  requestItem,
  locale,
  onClose,
  onCancel,
  isCancelling,
}: {
  open: boolean;
  requestItem: DocumentRequest | null;
  locale: Locale;
  onClose: () => void;
  onCancel?: () => Promise<void>;
  isCancelling?: boolean;
}) {
  useBodyScrollLock(open && Boolean(requestItem));

  if (!open || !requestItem) return null;

  const reason = requestItem.adminDecisionReason ?? requestItem.processingDeclineReason;
  const reasonLabel =
    requestItem.status === 'declined'
      ? copyText(locale, 'Decline reason', 'Dahilan ng pagtanggi')
      : copyText(locale, 'Admin or staff note', 'Tala ng admin o staff');
  const reasonText =
    reason?.trim() ||
    (requestItem.status === 'declined'
      ? copyText(locale, 'No reason was provided. Please contact the barangay office.', 'Walang ibinigay na dahilan. Makipag-ugnayan sa barangay office.')
      : copyText(locale, 'No note for this status.', 'Walang tala para sa status na ito.'));

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[color:rgba(10,24,18,0.55)] p-4 overscroll-contain touch-none">
      <Card className="w-full max-w-[700px] max-h-[90vh] overflow-y-auto rounded-[var(--resident-radius-lg)] border-[color:var(--resident-border-soft)] p-0 pointer-events-auto">
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--resident-border-soft)] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--resident-ink-500)]">
              {copyText(locale, 'Request Summary', 'Buod ng Kahilingan')}
            </p>
            <p className="mt-1 text-base font-semibold text-[color:var(--resident-ink-900)]">{requestItem.referenceNumber}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>

        <div className="grid gap-4 px-5 py-4 text-sm">
          <div className="grid gap-2 md:grid-cols-2">
            <p>
              <span className="font-semibold text-[color:var(--resident-ink-900)]">{copyText(locale, 'Type', 'Uri')}:</span>{' '}
              {requestItem.typeLabel}
            </p>
            <p>
              <span className="font-semibold text-[color:var(--resident-ink-900)]">{copyText(locale, 'Amount', 'Halaga')}:</span>{' '}
              {requestItem.amount === 0 ? copyText(locale, 'Free', 'Libre') : `P${requestItem.amount}`}
            </p>
            <p>
              <span className="font-semibold text-[color:var(--resident-ink-900)]">{copyText(locale, 'Category', 'Kategorya')}:</span>{' '}
              {requestItem.category}
            </p>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[color:var(--resident-ink-900)]">{copyText(locale, 'Status', 'Katayuan')}:</span>
              <StatusBadge tone={statusToneFromState(requestItem.status)}>
                {getRequestStatusLabel(requestItem.status, locale)}
              </StatusBadge>
            </div>
          </div>

          <div className="rounded-[var(--resident-radius-sm)] border border-[color:var(--resident-border-soft)] bg-[color:var(--resident-surface-1)] px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--resident-ink-500)]">
              {copyText(locale, 'Purpose of request', 'Layunin ng kahilingan')}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[color:var(--resident-ink-900)]">{requestItem.purpose || '-'}</p>
          </div>

          

          <div className="grid gap-1 text-xs text-[color:var(--resident-ink-700)]">
            <p>
              {copyText(locale, 'Created', 'Nilikha')}: {formatDateTime(requestItem.createdAt, locale)}
            </p>
            <p>
              {copyText(locale, 'Last updated', 'Huling update')}: {formatDateTime(requestItem.updatedAt, locale)}
            </p>
            <p>
              {reasonLabel}: {reasonText}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[color:var(--resident-border-soft)] px-5 py-3">
          {requestItem.status === 'pending' && onCancel ? (
            <>
              <Button type="button" variant="ghost" onClick={onClose} disabled={isCancelling}>
                {copyText(locale, 'Close', 'Isara')}
              </Button>
              <Button 
                type="button" 
                disabled={isCancelling}
                onClick={onCancel}
                className="bg-[linear-gradient(180deg,#9f1239_0%,#7f112b_100%)] px-4 py-2 text-white shadow-[0_10px_24px_rgba(159,18,57,0.24)] hover:bg-[linear-gradient(180deg,#b91c3f_0%,#881337_100%)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCancelling
                  ? copyText(locale, 'Cancelling', 'Kinakansela')
                  : copyText(locale, 'Cancel Request', 'Kanselahin ang Kahilingan')}
              </Button>
            </>
          ) : (
            <Button type="button" variant="residentOutline" onClick={onClose}>
              {copyText(locale, 'Close', 'Isara')}
            </Button>
          )}
        </div>
      
      </Card>
    </div>
  );
}
