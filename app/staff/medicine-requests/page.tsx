'use client';

import { useMemo, useState } from 'react';
import PortalShell from '../../../components/portal-shell';
import {
  EmptyState,
  FormFeedback,
  PageGuide,
  SectionCard,
  StatusBadge,
  statusToneFromState,
} from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getRequestStatusLabel } from '@/lib/formatters';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import { staffUpdateMedicineRequest } from '../../../lib/frontend-data/store';
import { useAppState } from '../../../lib/frontend-data/use-app-state';
import type { UIStatusTone } from '../../../lib/types/ui';

export default function StaffMedicineRequestsPage() {
  const { state, locale } = useAppState();
  const [reason, setReason] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: UIStatusTone; text: string } | null>(null);
  const pageCopy = getRolePageCopy('staff/medicine-requests');

  const laneApproved = useMemo(
    () => state.medicineRequests.filter((item) => item.status === 'approved'),
    [state.medicineRequests]
  );
  const laneProcessing = useMemo(
    () => state.medicineRequests.filter((item) => item.status === 'processing'),
    [state.medicineRequests]
  );
  const laneCompleted = useMemo(
    () => state.medicineRequests.filter((item) => item.status === 'completed'),
    [state.medicineRequests]
  );
  const laneDeclined = useMemo(
    () => state.medicineRequests.filter((item) => item.status === 'declined'),
    [state.medicineRequests]
  );

  const selected =
    state.medicineRequests.find((item) => item.id === selectedId) ??
    laneApproved[0] ??
    laneProcessing[0] ??
    null;

  const updateRequest = async (
    id: string,
    status: 'processing' | 'completed' | 'declined'
  ) => {
    if (status === 'declined' && !reason.trim()) {
      setFeedback({
        tone: 'danger',
        text:
          locale === 'fil'
            ? 'Kailangan ang dahilan bago mag-decline.'
            : 'Decline reason is required before proceeding.',
      });
      return;
    }

    await staffUpdateMedicineRequest(id, status, status === 'declined' ? reason.trim() : undefined);
    setReason('');
    setFeedback({
      tone: 'success',
      text:
        status === 'completed'
          ? locale === 'fil'
            ? 'Tapos na ang processing ng medicine request.'
            : 'Medicine request marked as completed.'
          : status === 'processing'
            ? locale === 'fil'
              ? 'Nasa processing lane na ang medicine request.'
              : 'Medicine request moved to processing lane.'
            : locale === 'fil'
              ? 'Na-decline ang medicine request at naitala ang dahilan.'
              : 'Medicine request declined and reason recorded.',
    });
  };

  const renderLane = (title: string, items: typeof state.medicineRequests) => (
    <div className="rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-3">
      <p className="text-xs uppercase tracking-[0.08em] text-[color:var(--portal-ink-500)]">{title}</p>
      <div className="mt-3 grid gap-2">
        {!items.length ? (
          <p className="text-sm text-[color:var(--portal-ink-700)]">
            {locale === 'fil' ? 'Walang item sa lane na ito.' : 'No items in this lane.'}
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`w-full rounded-[var(--portal-radius-sm)] border px-3 py-2 text-left ${
                selected?.id === item.id
                  ? 'border-[color:var(--portal-accent-strong)] bg-[color:var(--portal-accent-soft)]'
                  : 'border-[color:var(--portal-border-soft)] bg-white'
              }`}
            >
              <p className="text-xs text-[color:var(--portal-ink-500)]">{item.referenceNumber}</p>
              <p className="text-sm font-semibold text-[color:var(--portal-ink-900)]">{item.medicineName}</p>
              <p className="text-xs text-[color:var(--portal-ink-700)]">
                {item.residentName} · {locale === 'fil' ? 'Qty' : 'Qty'} {item.requestedQuantity}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <PortalShell role="staff" title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {pageCopy.guide ? (
        <PageGuide
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{
            label: resolveRoleCopy(locale, pageCopy.guide.cta.label),
            href: pageCopy.guide.cta.href,
          }}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_minmax(320px,1fr)]">
        <SectionCard
          title={locale === 'fil' ? 'Medicine Request Lanes' : 'Medicine Request Lanes'}
          description={
            locale === 'fil'
              ? 'Approved, processing, completed, at declined na mga request.'
              : 'Approved, processing, completed, and declined requests.'
          }
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {renderLane(locale === 'fil' ? 'Approved' : 'Approved', laneApproved)}
            {renderLane(locale === 'fil' ? 'Processing' : 'Processing', laneProcessing)}
            {renderLane(locale === 'fil' ? 'Completed' : 'Completed', laneCompleted)}
            {renderLane(locale === 'fil' ? 'Declined' : 'Declined', laneDeclined)}
          </div>
        </SectionCard>

        <SectionCard
          title={locale === 'fil' ? 'Request Detail' : 'Request Detail'}
          description={
            locale === 'fil'
              ? 'Suriin muna ang detalye bago baguhin ang status.'
              : 'Review details before changing status.'
          }
        >
          {!selected ? (
            <EmptyState
              title={locale === 'fil' ? 'Walang napiling request' : 'No request selected'}
              description={
                locale === 'fil'
                  ? 'Pumili ng item mula sa lane.'
                  : 'Select an item from any lane.'
              }
            />
          ) : (
            <div className="grid gap-3">
              <div className="rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--portal-ink-500)]">
                  {selected.referenceNumber}
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--portal-ink-900)]">{selected.medicineName}</p>
                <p className="mt-1 text-sm text-[color:var(--portal-ink-700)]">
                  {locale === 'fil' ? 'Resident' : 'Resident'}: {selected.residentName}
                </p>
                <p className="mt-1 text-sm text-[color:var(--portal-ink-700)]">
                  {locale === 'fil' ? 'Quantity' : 'Quantity'}: {selected.requestedQuantity}
                </p>
                <p className="mt-1 text-sm text-[color:var(--portal-ink-700)]">
                  {locale === 'fil' ? 'Purpose' : 'Purpose'}: {selected.purpose}
                </p>
                <div className="mt-2">
                  <StatusBadge tone={statusToneFromState(selected.status)}>
                    {getRequestStatusLabel(selected.status, locale)}
                  </StatusBadge>
                </div>
              </div>

              <label className="grid gap-1 text-sm">
                <span>{locale === 'fil' ? 'Dahilan ng decline' : 'Decline reason'}</span>
                <Input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={locale === 'fil' ? 'Required kapag decline' : 'Required when declining'}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {selected.status === 'approved' ? (
                  <Button type="button" onClick={() => void updateRequest(selected.id, 'processing')}>
                    {locale === 'fil' ? 'Ilipat sa Processing' : 'Move to Processing'}
                  </Button>
                ) : null}
                {selected.status === 'processing' ? (
                  <Button type="button" onClick={() => void updateRequest(selected.id, 'completed')}>
                    {locale === 'fil' ? 'Mark Completed' : 'Mark Completed'}
                  </Button>
                ) : null}
                {(selected.status === 'approved' || selected.status === 'processing') ? (
                  <Button variant="destructive" type="button" onClick={() => void updateRequest(selected.id, 'declined')}>
                    {locale === 'fil' ? 'I-decline' : 'Decline'}
                  </Button>
                ) : null}
              </div>

              {feedback ? (
                <FormFeedback tone={feedback.tone === 'danger' ? 'error' : 'success'} text={feedback.text} />
              ) : null}
            </div>
          )}
        </SectionCard>
      </div>
    </PortalShell>
  );
}
