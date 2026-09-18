'use client';

import { useEffect, useMemo, useState } from 'react';
import PortalShell from '../../../components/portal-shell';
import { EmptyState, FormFeedback, PageGuide, SectionCard, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getRequestStatusLabel, relativeTime } from '@/lib/formatters';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import { buildRequestTemplateDefaultFields } from '@/lib/documents/request-template-fields';
import { getMissingRequiredTemplateFields, getTemplateOrDefault, resolveTemplateForDocumentType } from '@/lib/ocr/templates';
import { staffUpdateRequest } from '../../../lib/frontend-data/store';
import { useAppState } from '../../../lib/frontend-data/use-app-state';
import type { UIStatusTone } from '../../../lib/types/ui';
import type { RequestStatus } from '@/lib/types/models';

const PROCESSABLE_STATUSES: RequestStatus[] = ['pending', 'approved', 'processing', 'completed'];

function formatFileSize(bytes: number | undefined) {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export default function StaffProcessRequestsPage() {
  const { state, locale } = useAppState();
  const [reason, setReason] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ tone: UIStatusTone; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | RequestStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageCopy = getRolePageCopy('staff/process-requests');
  const ITEMS_PER_PAGE = 10;

  // Filter requests by status and search term
  const filteredRequests = useMemo(() => {
    let filtered = state.documentRequests.filter((item) => PROCESSABLE_STATUSES.includes(item.status));

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((item) => item.status === filterStatus);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.referenceNumber.toLowerCase().includes(term) ||
          item.residentName.toLowerCase().includes(term) ||
          item.typeLabel.toLowerCase().includes(term),
      );
    }

    return filtered;
  }, [state.documentRequests, filterStatus, searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm]);

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  const statusCounts = useMemo(() => {
    const counts: Record<'all' | RequestStatus, number> = {
      all: 0,
      pending: 0,
      staff_reviewed: 0,
      processing: 0,
      approved: 0,
      declined: 0,
      cancelled: 0,
      completed: 0,
    };

    // Keep filter counts aligned with the requests shown in this workspace.
    state.documentRequests.filter((item) => PROCESSABLE_STATUSES.includes(item.status)).forEach((item) => {
      counts.all++;
      if (item.status in counts) {
        counts[item.status as RequestStatus]++;
      }
    });

    return counts;
  }, [state.documentRequests]);

  const selected = filteredRequests.find((item) => item.id === selectedId) ?? filteredRequests[0] ?? null;
  const selectedResident = selected ? state.users.find((user) => user.id === selected.residentId) ?? null : null;
  const selectedTemplate = selected ? resolveTemplateForDocumentType(selected.typeLabel, selected.category) : null;
  const activeTemplate = selectedTemplate ? getTemplateOrDefault(selectedTemplate.key) : null;
  const missingFieldKeys = activeTemplate ? getMissingRequiredTemplateFields(activeTemplate.key, fieldDraft) : [];
  const missingFieldLabels = missingFieldKeys.map((key) => {
    if (key === 'reasonSelection') return locale === 'fil' ? 'Marked reason(s)' : 'Marked reason(s)';
    if (key === 'permitSelection') return locale === 'fil' ? 'Permit selection' : 'Permit selection';
    return activeTemplate?.labels[key] ?? key;
  });

  useEffect(() => {
    if (!selected || !selectedTemplate || !selectedResident) {
      setFieldDraft({});
      return;
    }

    setFieldDraft(
      buildRequestTemplateDefaultFields(selectedTemplate.key, {
        residentName: selectedResident.fullName || selected.residentName,
        address: selectedResident.address,
        addressLine: selectedResident.addressLine,
        province: selectedResident.province,
        city: selectedResident.city,
        barangay: selectedResident.barangay,
        category: selected.category,
        documentType: selected.typeLabel,
        selectedTypeLabel: selected.selectedTypeLabel,
        purpose: selected.purpose,
        issuedDate: new Date().toISOString().slice(0, 10),
      }),
    );
  }, [selected, selectedTemplate, selectedResident]);

  const isChoiceField = (fieldKey: string) => fieldKey.startsWith('reason') || fieldKey.startsWith('permit');

  

  const updateRequest = async (id: string, status: 'processing' | 'completed' | 'declined') => {
    if (status === 'declined' && !reason.trim()) {
      setFeedback({
        tone: 'danger',
        text: locale === 'fil' ? 'Kailangan ang dahilan bago mag-decline.' : 'Decline reason is required before proceeding.',
      });
      return;
    }

    if (status === 'completed') {
      // Allow completion even when there's no OCR template configured.
      // If a template is present, still enforce required fields.
      if (selectedTemplate && missingFieldLabels.length) {
        setFeedback({
          tone: 'danger',
          text:
            locale === 'fil'
              ? `Kumpletuhin muna ang required fields: ${missingFieldLabels.join(', ')}`
              : `Complete required fields before sending: ${missingFieldLabels.join(', ')}`,
        });
        return;
      }
    }

    try {
      const result = await staffUpdateRequest(
        id,
        status,
        status === 'declined' ? reason.trim() : undefined,
        status === 'completed' && selectedTemplate
          ? {
              verificationMetadata: { parsedFields: fieldDraft },
              documentLabel: selectedTemplate.documentLabel,
            }
          : undefined,
      );
      setReason('');
      const completedMessage = (() => {
        if (status !== 'completed') return null;
        const email = result && typeof result === 'object' && 'email' in result ? result.email : undefined;
        if (email?.sent) {
          return locale === 'fil'
            ? 'Nakumpleto ang dokumento. Available na ito sa resident portal at naipadala rin ang email.'
            : 'Document completed. It is available in the resident portal and the email was sent.';
        }
        if (email?.error) {
          return locale === 'fil'
            ? `Nakumpleto ang dokumento at available na sa resident portal. Hindi naipadala ang email: ${email.error}`
            : `Document completed and is available in the resident portal. Email was not sent: ${email.error}`;
        }
        return locale === 'fil'
          ? 'Nakumpleto ang dokumento at available na sa resident portal.'
          : 'Document completed and is available in the resident portal.';
      })();
      setFeedback({
        tone: 'success',
        text:
          status === 'completed'
            ? completedMessage ?? ''
            : status === 'processing'
              ? locale === 'fil'
                ? 'Nasa processing lane na ang request.'
                : 'Request moved to processing lane.'
              : locale === 'fil'
                ? 'Na-decline ang request at naitala ang dahilan.'
                : 'Request declined and reason recorded.',
      });
    } catch (error) {
      setFeedback({
        tone: 'danger',
        text: error instanceof Error ? error.message : locale === 'fil' ? 'Hindi na-update ang request.' : 'Unable to update request.',
      });
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

      <div className="grid gap-4">
        <SectionCard
          title={locale === 'fil' ? 'Document Requests' : 'Document Requests'}
          description={locale === 'fil'
            ? 'Maghanap at mag-filter ng document requests para i-process.'
            : 'Search and filter document requests to process.'}
        >
          <div className="grid gap-4">
            {/* Search on top, then results count + filter buttons aligned on a row */}
            <div className="flex flex-col gap-2">
              <label className="grid gap-1 text-sm w-[70px] md:w-[150px] lg:w-[190px]">
                <span className="sr-only">{locale === 'fil' ? 'Hanapin' : 'Search'}</span>
                <Input
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder={locale === 'fil' ? 'Reference, name, type' : 'Reference, name, type'}
                />
              </label>

              <div className="flex items-center justify-between">
                <div className="text-xs text-[color:var(--portal-ink-500)]">
                  {filteredRequests.length} {locale === 'fil' ? 'requests' : 'requests'} · {locale === 'fil' ? 'Nakaayos mula pinakahuling request' : 'Sorted by most recent request'}
                  {filteredRequests.length > 0 && filteredRequests[0]?.createdAt
                    ? ` · ${locale === 'fil' ? 'Pinakahuli' : 'Latest'}: ${relativeTime(filteredRequests[0].createdAt, locale)}`
                    : ''}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={`rounded px-3 py-1 text-sm ${filterStatus === 'all' ? 'bg-[color:var(--portal-border-soft)]' : 'hover:bg-[color:var(--portal-border-soft)]'}`}
                    onClick={() => { setFilterStatus('all'); setCurrentPage(1); }}
                  >
                    {locale === 'fil' ? 'Lahat' : 'All'} ({statusCounts.all})
                  </button>

                  <button
                    type="button"
                    className={`relative rounded px-3 py-1 text-sm ${filterStatus === 'approved' ? 'bg-[color:#ecfdf5]' : 'hover:bg-[color:#ecfdf5]'}`}
                    onClick={() => { setFilterStatus('approved' as any); setCurrentPage(1); }}
                  >
                    {locale === 'fil' ? 'Aprubado' : 'Approved'} ({statusCounts.approved})
                    {statusCounts.approved > 0 ? (
                      <span className="absolute -right-2 -top-2 inline-block h-3 w-3 rounded-full bg-red-600" aria-hidden />
                    ) : null}
                  </button>

                  <button
                    type="button"
                    className={`rounded px-3 py-1 text-sm ${filterStatus === 'processing' ? 'bg-[color:#fff7ed]' : 'hover:bg-[color:#fff7ed]'}`}
                    onClick={() => { setFilterStatus('processing' as any); setCurrentPage(1); }}
                  >
                    {locale === 'fil' ? 'Ginagawa' : 'Processing'} ({statusCounts.processing})
                  </button>

                  <button
                    type="button"
                    className={`rounded px-3 py-1 text-sm ${filterStatus === 'completed' ? 'bg-[color:#ecfdf5]' : 'hover:bg-[color:#ecfdf5]'}`}
                    onClick={() => { setFilterStatus('completed' as any); setCurrentPage(1); }}
                  >
                    {locale === 'fil' ? 'Nakumpleto' : 'Completed'} ({statusCounts.completed})
                  </button>

                  <button
                    type="button"
                    className={`rounded px-3 py-1 text-sm ${filterStatus === 'pending' ? 'bg-[color:#fff7ed]' : 'hover:bg-[color:#fff7ed]'}`}
                    onClick={() => { setFilterStatus('pending' as any); setCurrentPage(1); }}
                  >
                    {locale === 'fil' ? 'Naghihintay' : 'Pending'} ({statusCounts.pending})
                  </button>
                </div>
              </div>
            </div>

            

            {/* Table */}
            {filteredRequests.length === 0 ? (
              <EmptyState
                title={locale === 'fil' ? 'Walang request' : 'No requests'}
                description={locale === 'fil'
                  ? 'Walang document request na tumutugma sa iyong search at filter.'
                  : 'No document requests match your search and filters.'}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[color:var(--portal-border-soft)]">
                        <th className="px-4 py-3 text-center font-semibold text-[color:var(--portal-ink-700)]">ID</th>
                        <th className="px-4 py-3 text-center font-semibold text-[color:var(--portal-ink-700)]">{locale === 'fil' ? 'Reference' : 'Reference'}</th>
                        <th className="px-4 py-3 text-center font-semibold text-[color:var(--portal-ink-700)]">{locale === 'fil' ? 'Resident' : 'Resident'}</th>
                        <th className="px-4 py-3 text-center font-semibold text-[color:var(--portal-ink-700)]">{locale === 'fil' ? 'Type' : 'Type'}</th>
                        <th className="px-4 py-3 text-center font-semibold text-[color:var(--portal-ink-700)]">{locale === 'fil' ? 'Amount' : 'Amount'}</th>
                        <th className="px-4 py-3 text-center font-semibold text-[color:var(--portal-ink-700)]">{locale === 'fil' ? 'Status' : 'Status'}</th>
                        <th className="px-4 py-3 text-center font-semibold text-[color:var(--portal-ink-700)]">{locale === 'fil' ? 'Action' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRequests.map((request, index) => (
                        <tr
                          key={request.id}
                          className={`border-b border-[color:var(--portal-border-soft)] hover:bg-[color:var(--portal-surface-1)] transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-[color:var(--portal-surface-1)]'
                          }`}
                        >
                          <td className="px-4 py-3 text-xs text-[color:var(--portal-ink-600)] font-mono text-center">
                            {request.id.substring(0, 8)}
                          </td>
                            <td className="px-4 py-3 font-semibold text-[color:var(--portal-ink-900)] text-center">
                            {request.referenceNumber}
                          </td>
                            <td className="px-4 py-3 text-[color:var(--portal-ink-700)] text-center">
                            {request.residentName}
                          </td>
                            <td className="px-4 py-3 text-[color:var(--portal-ink-700)] text-center">
                            {request.typeLabel}
                          </td>
                            <td className="px-4 py-3 text-[color:var(--portal-ink-700)] text-center">
                            {request.amount === 0 ? (locale === 'fil' ? 'Libre' : 'Free') : `₱${request.amount.toFixed(2)}`}
                          </td>
                            <td className="px-4 py-3 text-center">
                              <StatusBadge tone={statusToneFromState(request.status)}>
                              {request.status === 'processing'
                                ? (locale === 'fil' ? 'Ginagawa' : 'Working on it')
                                : getRequestStatusLabel(request.status, locale)}
                              </StatusBadge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex justify-center">
                                <Button type="button" variant="ghost" onClick={() => setSelectedId(request.id)}>
                                  {locale === 'fil' ? 'Tingnan' : 'Review'}
                                </Button>
                              </div>
                            </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {filteredRequests.length > 0 && (
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm text-[color:var(--portal-ink-600)]">
                      {locale === 'fil'
                        ? `Showing ${startIndex + 1}–${Math.min(endIndex, filteredRequests.length)} of ${filteredRequests.length}`
                        : `Showing ${startIndex + 1}–${Math.min(endIndex, filteredRequests.length)} of ${filteredRequests.length}`}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                      >
                        {locale === 'fil' ? 'Nakaraan' : 'Previous'}
                      </Button>

                      <div className="text-sm text-[color:var(--portal-ink-600)]">
                        {`${currentPage} / ${totalPages}`}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                      >
                        {locale === 'fil' ? 'Susunod' : 'Next'}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Request Detail Modal */}
      <Dialog open={!!selectedId} onOpenChange={(open) => {
        if (!open) {
          setSelectedId(null);
          setReason('');
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{locale === 'fil' ? 'Request Detail' : 'Request Detail'}</DialogTitle>
          </DialogHeader>

          {!selected ? (
            <EmptyState
              title={locale === 'fil' ? 'Walang napiling request' : 'No request selected'}
              description={locale === 'fil' ? 'Pumili ng item mula sa table.' : 'Select an item from the table.'}
            />
          ) : (
            <div className="grid gap-3">
              <div className="rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--portal-ink-500)]">{selected.referenceNumber}</p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--portal-ink-900)]">{selected.typeLabel}</p>
                <p className="mt-1 text-sm text-[color:var(--portal-ink-700)]">{locale === 'fil' ? 'Resident' : 'Resident'}: {selected.residentName}</p>
                <p className="mt-1 text-sm text-[color:var(--portal-ink-700)]">{locale === 'fil' ? 'Purpose' : 'Purpose'}: {selected.purpose}</p>
                <div className="mt-2">
                  <StatusBadge tone={statusToneFromState(selected.status)}>
                    {selected.status === 'processing'
                      ? (locale === 'fil' ? 'Ginagawa' : 'Working on it')
                      : getRequestStatusLabel(selected.status, locale)}
                  </StatusBadge>
                </div>
              </div>

              {selected.status === 'pending' ? (
                <div className="rounded-[var(--portal-radius-md)] border border-[color:#f0d7a1] bg-[color:#fff8e8] px-3 py-2 text-sm text-[color:#76551a]">
                  {locale === 'fil'
                    ? 'Naghihintay ang request na ito ng approval mula sa admin.'
                    : "This request is waiting for the admin's approval."}
                </div>
              ) : (
                <label className="grid gap-1 text-sm">
                  <span>{locale === 'fil' ? 'Dahilan ng decline' : 'Decline reason'}</span>
                  <Input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={locale === 'fil' ? 'Required kapag decline' : 'Required when declining'}
                  />
                </label>
              )}

              

              {selected.status === 'processing' && selectedTemplate && activeTemplate ? (
                <div className="grid gap-2 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-white p-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[color:var(--portal-ink-500)]">
                      {locale === 'fil' ? 'Document release fields' : 'Document release fields'}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--portal-ink-900)]">
                      {selectedTemplate.documentLabel}
                    </p>
                  </div>
                  {activeTemplate.intakeFields.map((field) => (
                    <label key={field.key} className="grid gap-1 text-xs text-[color:var(--portal-ink-700)]">
                      <span>
                        {field.label}
                        {field.required ? ' *' : ''}
                      </span>
                      {isChoiceField(field.key) ? (
                        <Select
                          value={fieldDraft[field.key] || 'No'}
                          onChange={(event) =>
                            setFieldDraft((prev) => ({
                              ...prev,
                              [field.key]: event.target.value,
                            }))
                          }
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </Select>
                      ) : (
                        <Input
                          value={fieldDraft[field.key] ?? ''}
                          onChange={(event) =>
                            setFieldDraft((prev) => ({
                              ...prev,
                              [field.key]: event.target.value,
                            }))
                          }
                        />
                      )}
                    </label>
                  ))}
                  {missingFieldLabels.length ? (
                    <p className="text-xs text-[color:#a33b32]">
                      {locale === 'fil' ? 'Kulang na required fields' : 'Missing required fields'}: {missingFieldLabels.join(', ')}
                    </p>
                  ) : (
                    <p className="text-xs text-[color:var(--portal-ink-600)]">
                      {locale === 'fil'
                        ? 'Handa na ang fields para sa final document release.'
                        : 'Fields are ready for final document release.'}
                    </p>
                  )}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {selected.status === 'approved' ? (
                  <Button type="button" onClick={() => void updateRequest(selected.id, 'processing')}>
                    {locale === 'fil' ? 'Ilipat sa Processing' : 'Move to Processing'}
                  </Button>
                ) : null}
                {selected.status === 'approved' ? (
                  <Button variant="destructive" type="button" onClick={() => void updateRequest(selected.id, 'declined')}>
                    {locale === 'fil' ? 'I-decline' : 'Decline'}
                  </Button>
                ) : null}
                {selected.status === 'processing' ? (
                  <Button
                    type="button"
                    onClick={() => void updateRequest(selected.id, 'completed')}
                  >
                    {locale === 'fil' ? 'I-issue at Tapusin' : 'Issue and Complete'}
                  </Button>
                ) : null}
              </div>
              {feedback ? (
                <FormFeedback
                  tone={
                    feedback.tone === 'danger'
                      ? 'error'
                      : feedback.tone === 'warning'
                        ? 'info'
                        : 'success'
                  }
                  text={feedback.text}
                />
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
    </PortalShell>
  );
}
