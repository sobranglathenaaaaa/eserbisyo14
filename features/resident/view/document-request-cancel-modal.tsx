'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime, getRequestStatusLabel } from '@/lib/formatters';
import type { DocumentRequest, Locale } from '@/lib/types/models';
import { copyText } from '@/features/resident/model/copy';
import { StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

export function DocumentRequestCancelModal({
  open,
  requestItem,
  locale,
  onClose,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  requestItem: DocumentRequest | null;
  locale: Locale;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}) {
  useBodyScrollLock(open && Boolean(requestItem));

  if (!open || !requestItem) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[85] grid place-items-center bg-[color:rgba(10,24,18,0.55)] p-4 overscroll-contain touch-none">
      <Card className="w-full max-w-[560px] rounded-[var(--resident-radius-lg)] border-[color:var(--resident-border-soft)] p-0">
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--resident-border-soft)] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--resident-ink-500)]">
              {copyText(locale, 'Cancel Request', 'Kanselahin ang Kahilingan')}
            </p>
            <p className="mt-1 text-base font-semibold text-[color:var(--resident-ink-900)]">{requestItem.referenceNumber}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={onClose} disabled={isLoading}>
            <X size={14} />
          </Button>
        </div>

        <div className="grid gap-4 px-5 py-4 text-sm">
          <div className="rounded-[var(--resident-radius-sm)] border border-[color:var(--resident-border-soft)] bg-[color:#fff3cd] px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:#856404]">
              {copyText(locale, 'Warning', 'Babala')}
            </p>
            <p className="mt-2 text-sm text-[color:#856404]">
              {copyText(
                locale,
                'Are you sure you want to cancel this request? This action cannot be undone.',
                'Sigurado ka na ba na gusto mong kanselahin ang kahilingang ito? Hindi na mababawi ang aksyong ito.',
              )}
            </p>
          </div>

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

          <div className="grid gap-1 text-xs text-[color:var(--resident-ink-700)]">
            <p>
              {copyText(locale, 'Created', 'Nilikha')}: {formatDateTime(requestItem.createdAt, locale)}
            </p>
            <p>
              {copyText(locale, 'Last updated', 'Huling update')}: {formatDateTime(requestItem.updatedAt, locale)}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[color:var(--resident-border-soft)] px-5 py-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            {copyText(locale, 'Keep Request', 'Panatilihin')}
          </Button>
          <Button 
            type="button" 
            disabled={isLoading}
            onClick={handleConfirm}
            className="h-11 px-6 bg-[color:#dc3545] hover:bg-[color:#c82333] focus-visible:ring-[color:#dc3545]"
          >
            {isLoading
              ? copyText(locale, 'Cancelling', 'Kinakansela')
              : copyText(locale, 'Confirm Cancellation', 'Kumpirmahin ang Pagkansela')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
