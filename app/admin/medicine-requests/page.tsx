'use client';

import { useMemo, useState } from 'react';
import {
  DashboardSummaryCard,
  EmptyState,
  FieldLabel,
  PageGuide,
  SectionCard,
  StatusBadge,
  statusToneFromState,
} from '@/components/portal-ui';
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
import { getRequestStatusLabel } from '@/lib/formatters';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import PortalShell from '../../../components/portal-shell';
import { adminReviewMedicineRequest } from '../../../lib/frontend-data/store';
import { useAppState } from '../../../lib/frontend-data/use-app-state';

export default function AdminMedicineRequestsPage() {
  const { state, locale } = useAppState();
  const [reason, setReason] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pageCopy = getRolePageCopy('admin/medicine-requests');

  const pending = useMemo(
    () => state.medicineRequests.filter((item) => item.status === 'pending'),
    [state.medicineRequests]
  );
  const approved = useMemo(
    () => state.medicineRequests.filter((item) => item.status === 'approved'),
    [state.medicineRequests]
  );
  const processing = useMemo(
    () => state.medicineRequests.filter((item) => item.status === 'processing'),
    [state.medicineRequests]
  );
  const declined = useMemo(
    () => state.medicineRequests.filter((item) => item.status === 'declined' || item.status === 'cancelled'),
    [state.medicineRequests]
  );

  const selectedRequest =
    state.medicineRequests.find((item) => item.id === selectedId) ?? pending[0] ?? null;

  return (
    <PortalShell role="admin" title={pageCopy.title} description={pageCopy.description} showHero={false}>
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardSummaryCard
          label={locale === 'fil' ? 'Pending' : 'Pending'}
          value={pending.length}
          hint={locale === 'fil' ? 'Kailangang i-review' : 'Needs review'}
        />
        <DashboardSummaryCard
          label={locale === 'fil' ? 'Approved' : 'Approved'}
          value={approved.length}
          hint={locale === 'fil' ? 'Ready for staff lane' : 'Ready for staff lane'}
        />
        <DashboardSummaryCard
          label={locale === 'fil' ? 'Processing' : 'Processing'}
          value={processing.length}
          hint={locale === 'fil' ? 'Kasalukuyang inaasikaso' : 'Currently being handled'}
        />
        <DashboardSummaryCard
          label={locale === 'fil' ? 'Declined/Cancelled' : 'Declined/Cancelled'}
          value={declined.length}
          hint={locale === 'fil' ? 'May aksyon na' : 'Already actioned'}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_minmax(320px,1fr)]">
        <SectionCard
          title={locale === 'fil' ? 'Medicine Requests' : 'Medicine Requests'}
          description={
            locale === 'fil'
              ? 'Piliin ang request para makita ang detalye bago magpasya.'
              : 'Pick a request to inspect details before decision.'
          }
        >
          {!state.medicineRequests.length ? (
            <EmptyState
              title={locale === 'fil' ? 'Walang medicine requests' : 'No medicine requests yet'}
              description={
                locale === 'fil'
                  ? 'Lalabas dito ang mga papasok na request.'
                  : 'Incoming medicine requests will appear here.'
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>{locale === 'fil' ? 'Reference' : 'Reference'}</TableHead>
                  <TableHead>{locale === 'fil' ? 'Resident' : 'Resident'}</TableHead>
                  <TableHead>{locale === 'fil' ? 'Gamot' : 'Medicine'}</TableHead>
                  <TableHead>{locale === 'fil' ? 'Dami' : 'Quantity'}</TableHead>
                  <TableHead>{locale === 'fil' ? 'Status' : 'Status'}</TableHead>
                  <TableHead>{locale === 'fil' ? 'Aksyon' : 'Action'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.medicineRequests.map((item) => (
                  <TableRow
                    key={item.id}
                    className={selectedRequest?.id === item.id ? 'bg-[color:var(--portal-surface-3)]' : ''}
                  >
                    <TableCell className="font-mono text-[10px] text-[color:var(--portal-ink-500)] select-all">{item.id}</TableCell>
                    <TableCell className="font-medium">{item.referenceNumber}</TableCell>
                    <TableCell>{item.residentName}</TableCell>
                    <TableCell>{item.medicineName}</TableCell>
                    <TableCell>{item.requestedQuantity}</TableCell>
                    <TableCell>
                      <StatusBadge tone={statusToneFromState(item.status)}>
                        {getRequestStatusLabel(item.status, locale)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="secondary" type="button" onClick={() => setSelectedId(item.id)}>
                        {locale === 'fil' ? 'Suriin' : 'Review'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>

        <SectionCard
          title={locale === 'fil' ? 'Request Detail at Decision' : 'Request Detail and Decision'}
          description={
            locale === 'fil'
              ? 'Basahin ang reason bago mag-approve o mag-decline.'
              : 'Review purpose and quantity before approving or declining.'
          }
        >
          {!selectedRequest ? (
            <EmptyState
              title={locale === 'fil' ? 'Pumili ng request' : 'Select a request'}
              description={
                locale === 'fil'
                  ? 'Walang napiling request para sa detail panel.'
                  : 'No request selected for detail panel.'
              }
            />
          ) : (
            <div className="grid gap-3">
              <div className="rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--portal-ink-500)] flex items-center gap-2">
                  <span>{selectedRequest.referenceNumber}</span>
                  <span className="text-[10px] opacity-70 font-mono lowercase tracking-normal border border-[color:var(--portal-border-soft)] px-1 rounded bg-[color:var(--portal-surface-2)] select-all">id: {selectedRequest.id}</span>
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--portal-ink-900)]">
                  {selectedRequest.medicineName}
                </p>
                <p className="mt-2 text-sm text-[color:var(--portal-ink-700)]">
                  {locale === 'fil' ? 'Resident' : 'Resident'}: <strong>{selectedRequest.residentName}</strong>
                </p>
                <p className="mt-1 text-sm text-[color:var(--portal-ink-700)]">
                  {locale === 'fil' ? 'Quantity' : 'Quantity'}: {selectedRequest.requestedQuantity}
                </p>
                <p className="mt-1 text-sm text-[color:var(--portal-ink-700)]">
                  {locale === 'fil' ? 'Purpose / Reason' : 'Purpose / Reason'}: {selectedRequest.purpose}
                </p>
                <p className="mt-1 text-sm text-[color:var(--portal-ink-700)]">
                  {locale === 'fil' ? 'Naunang dahilan' : 'Existing reason'}:{' '}
                  {selectedRequest.adminDecisionReason ?? selectedRequest.processingDeclineReason ?? '-'}
                </p>
              </div>

              <FieldLabel
                label={
                  locale === 'fil'
                    ? 'Dahilan ng decline (required kapag decline)'
                    : 'Decline reason (required for decline)'
                }
                hint={
                  locale === 'fil'
                    ? 'Hindi mae-enable ang decline kung walang dahilan.'
                    : 'Decline is disabled until a reason is entered.'
                }
              >
                <Input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={
                    locale === 'fil'
                      ? 'Halimbawa: kulang ang available stock ngayon'
                      : 'Example: currently insufficient available stock'
                  }
                />
              </FieldLabel>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={selectedRequest.status !== 'pending'}
                  onClick={() => void adminReviewMedicineRequest(selectedRequest.id, 'approved')}
                >
                  {locale === 'fil' ? 'Aprubahan' : 'Approve'}
                </Button>
                <Button
                  variant="destructive"
                  type="button"
                  disabled={selectedRequest.status !== 'pending' || !reason.trim()}
                  onClick={() => {
                    void adminReviewMedicineRequest(selectedRequest.id, 'declined', reason.trim());
                    setReason('');
                  }}
                >
                  {locale === 'fil' ? 'I-decline' : 'Decline'}
                </Button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </PortalShell>
  );
}
