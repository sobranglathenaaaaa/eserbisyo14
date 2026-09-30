"use client";

import { useEffect, useMemo, useState } from 'react';
import { X, Calendar, UserCheck, ShieldAlert, FileCheck, Send, CheckCircle2, ArrowRight, Building2, UserX } from 'lucide-react';
import PortalShell from '../../../components/portal-shell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { EmptyState, FormFeedback, PageGuide, SectionCard, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { copyText } from '@/features/resident/model/copy';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import { formatDateTime, formatIncidentCaseNumber, getReportStatusLabel, relativeTime } from '@/lib/formatters';
import { updateCaseWorkflow, updateReportStatus } from '../../../lib/frontend-data/store';
import { useAppState } from '../../../lib/frontend-data/use-app-state';
import type { IncidentReport, ReportStatus } from '@/lib/types/models';
import CaseReportDocumentModal from '@/components/case-report-document-modal';

type ReportFilter = 'all' | 'pending' | 'community_concerns' | 'record_only' | 'barangay_hearings' | 'lupon' | 'cfa_pnp' | 'resolved';

const filterTabs: Array<{ value: ReportFilter; labelEn: string; labelFil: string }> = [
  { value: 'all', labelEn: 'All Cases', labelFil: 'Lahat ng Kaso' },
  { value: 'pending', labelEn: 'Pending Review', labelFil: 'Naghihintay ng Review' },
  { value: 'community_concerns', labelEn: 'Community Concerns', labelFil: 'Community Concerns' },
  { value: 'record_only', labelEn: 'Blotter Record Only', labelFil: 'Blotter Record Only' },
  { value: 'barangay_hearings', labelEn: 'Barangay Hearings', labelFil: 'Pagdinig sa Barangay' },
  { value: 'lupon', labelEn: 'Lupon Conciliation', labelFil: 'Lupon Conciliation' },
  { value: 'cfa_pnp', labelEn: 'CFA & PNP Referrals', labelFil: 'CFA at PNP Referrals' },
  { value: 'resolved', labelEn: 'Resolved / Closed', labelFil: 'Naresolba / Isinara' },
];

export default function StaffIncidentsPage() {
  const { state, locale } = useAppState();
  const pageCopy = getRolePageCopy('staff/incidents');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ReportFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'action' | 'hearing' | 'lupon' | 'cfa_pnp'>('details');

  // Community Concern Action Form State
  const [assignedTo, setAssignedTo] = useState('');
  const [actionTakenText, setActionTakenText] = useState('');

  // Barangay Hearing / Lupon Form State
  const [hearingDate, setHearingDate] = useState('');
  const [hearingTime, setHearingTime] = useState('10:00');
  const [hearingVenue, setHearingVenue] = useState('Barangay Session Hall');
  const [presidingOfficer, setPresidingOfficer] = useState('');
  const [hearingMinutes, setHearingMinutes] = useState('');
  const [hearingOutcome, setHearingOutcome] = useState<'settled' | 'another_hearing' | 'not_settled'>('settled');

  // CFA Form State
  const [cfaCertNumber, setCfaCertNumber] = useState('');
  const [cfaIssuingAuthority, setCfaIssuingAuthority] = useState('Barangay Chairman');
  const [cfaRecipient, setCfaRecipient] = useState('');

  // PNP Form State
  const [pnpReceivingUnit, setPnpReceivingUnit] = useState('PNP Station 4');
  const [pnpRefNumber, setPnpRefNumber] = useState('');
  const [pnpNotes, setPnpNotes] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const reports = useMemo(
    () => (state.reports as IncidentReport[]).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.reports]
  );

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((item) => {
      // Tab Filtering
      if (filter === 'pending' && item.status !== 'pending' && item.status !== 'submitted') return false;
      if (filter === 'community_concerns' && item.trackType !== 'community_concern') return false;
      if (filter === 'record_only' && item.desiredAction !== 'record_only') return false;
      if (filter === 'barangay_hearings' && item.status !== 'hearing_scheduled' && item.status !== 'under_review') return false;
      if (filter === 'lupon' && item.status !== 'lupon_escalated') return false;
      if (filter === 'cfa_pnp' && item.status !== 'cfa_issued' && item.status !== 'referred_to_pnp') return false;
      if (filter === 'resolved' && item.status !== 'resolved' && item.status !== 'closed') return false;

      if (!query) return true;
      return [
        item.id,
        item.title,
        item.details,
        item.location,
        item.residentName,
        item.kind,
        item.otherCategoryText ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [filter, reports, search]);

  const selectedReport = useMemo(() => {
    return filteredReports.find((item) => item.id === selectedId) ?? filteredReports[0] ?? reports[0] ?? null;
  }, [filteredReports, reports, selectedId]);

  useEffect(() => {
    if (!selectedReport) {
      setSelectedId(null);
      return;
    }
    if (selectedId !== selectedReport.id) {
      setSelectedId(selectedReport.id);
    }
  }, [selectedId, selectedReport]);

  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  useEffect(() => {
    if (selectedReport) {
      setCfaRecipient(selectedReport.residentName);
      if (!cfaCertNumber) {
        setCfaCertNumber(`CFA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    }
  }, [selectedReport]);

  const openReview = (reportId: string, defaultTab: 'details' | 'action' | 'hearing' | 'lupon' | 'cfa_pnp' = 'details') => {
    setSelectedId(reportId);
    setActiveModalTab(defaultTab);
    setReviewOpen(true);
  };

  const closeReview = () => {
    setReviewOpen(false);
    setIsProcessing(false);
  };

  // --- Handlers ---
  const handleAssignAction = async () => {
    if (!selectedReport || !assignedTo.trim()) return;
    setIsProcessing(true);
    try {
      await updateCaseWorkflow(selectedReport.id, {
        status: 'assigned',
        actionLog: {
          assignedTo: assignedTo.trim(),
          assignedAt: new Date().toISOString(),
        },
      });
      setFeedback({ tone: 'success', text: locale === 'fil' ? 'Naka-assign na ang aksyon sa tauhan.' : 'Action assigned to personnel.' });
      closeReview();
    } catch (err) {
      setFeedback({ tone: 'error', text: err instanceof Error ? err.message : 'Error updating workflow.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordActionTaken = async () => {
    if (!selectedReport || !actionTakenText.trim()) return;
    setIsProcessing(true);
    try {
      await updateCaseWorkflow(selectedReport.id, {
        status: 'resolved',
        actionLog: {
          ...(selectedReport.actionLog ?? {}),
          actionTaken: actionTakenText.trim(),
          actionTakenAt: new Date().toISOString(),
        },
      });
      setFeedback({ tone: 'success', text: locale === 'fil' ? 'Naitala na ang naaksyunang detalye at na-resolve ang kaso.' : 'Action recorded and case marked resolved.' });
      closeReview();
    } catch (err) {
      setFeedback({ tone: 'error', text: err instanceof Error ? err.message : 'Error updating workflow.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseBlotterOnly = async () => {
    if (!selectedReport) return;
    setIsProcessing(true);
    try {
      await updateReportStatus(selectedReport.id, 'closed', 'Incident recorded in official blotter. No hearing requested.');
      setFeedback({ tone: 'success', text: locale === 'fil' ? 'Na-record sa official blotter at isinara ang kaso.' : 'Incident recorded in blotter and closed.' });
      closeReview();
    } catch (err) {
      setFeedback({ tone: 'error', text: err instanceof Error ? err.message : 'Error updating status.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScheduleHearing = async (stage: 'barangay_hearing' | 'lupon_conciliation') => {
    if (!selectedReport || !hearingDate) return;
    setIsProcessing(true);
    try {
      const proceedingCount = (selectedReport.proceedings?.filter((p) => p.stage === stage).length || 0) + 1;
      const scheduledDateTime = `${hearingDate}T${hearingTime}:00`;

      await updateCaseWorkflow(selectedReport.id, {
        status: stage === 'barangay_hearing' ? 'hearing_scheduled' : 'lupon_escalated',
        proceeding: {
          stage,
          proceedingNo: proceedingCount,
          scheduledAt: scheduledDateTime,
          venue: hearingVenue.trim(),
          presidingOfficer: presidingOfficer.trim() || undefined,
          attendance: '',
          minutes: hearingMinutes.trim(),
          agreements: '',
          outcome: undefined,
        },
      });
      setFeedback({ tone: 'success', text: locale === 'fil' ? 'Naka-schedule na ang pagdinig.' : 'Hearing scheduled successfully.' });
      closeReview();
    } catch (err) {
      setFeedback({ tone: 'error', text: err instanceof Error ? err.message : 'Error scheduling hearing.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordHearingOutcome = async (stage: 'barangay_hearing' | 'lupon_conciliation') => {
    if (!selectedReport) return;
    setIsProcessing(true);
    try {
      let nextStatus: ReportStatus = 'closed';
      if (hearingOutcome === 'not_settled') {
        nextStatus = stage === 'barangay_hearing' ? 'lupon_escalated' : 'cfa_issued';
      } else if (hearingOutcome === 'another_hearing') {
        nextStatus = stage === 'barangay_hearing' ? 'hearing_scheduled' : 'lupon_escalated';
      } else {
        nextStatus = 'closed';
      }

      await updateCaseWorkflow(selectedReport.id, {
        status: nextStatus,
        note: `Hearing outcome: ${hearingOutcome}. ${hearingMinutes.trim()}`,
      });

      setFeedback({ tone: 'success', text: locale === 'fil' ? 'Na-update ang resulta ng pagdinig.' : 'Hearing outcome saved successfully.' });
      closeReview();
    } catch (err) {
      setFeedback({ tone: 'error', text: err instanceof Error ? err.message : 'Error recording outcome.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIssueCfa = async () => {
    if (!selectedReport || !cfaCertNumber.trim()) return;
    setIsProcessing(true);
    try {
      await updateCaseWorkflow(selectedReport.id, {
        status: 'cfa_issued',
        cfa: {
          certificateNumber: cfaCertNumber.trim(),
          dateIssued: new Date().toISOString().slice(0, 10),
          issuingAuthority: cfaIssuingAuthority.trim(),
          chairmanSigned: true,
          recipientName: cfaRecipient.trim(),
        },
      });
      setFeedback({ tone: 'success', text: locale === 'fil' ? 'Na-issue na ang Certificate to File Action (CFA).' : 'CFA issued successfully.' });
      closeReview();
    } catch (err) {
      setFeedback({ tone: 'error', text: err instanceof Error ? err.message : 'Error issuing CFA.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReferToPnp = async () => {
    if (!selectedReport || !pnpReceivingUnit.trim()) return;
    setIsProcessing(true);
    try {
      await updateCaseWorkflow(selectedReport.id, {
        status: 'referred_to_pnp',
        pnpReferral: {
          dateReferred: new Date().toISOString().slice(0, 10),
          receivingUnit: pnpReceivingUnit.trim(),
          referenceNumber: pnpRefNumber.trim() || undefined,
          referralNotes: pnpNotes.trim() || undefined,
        },
      });
      setFeedback({ tone: 'success', text: locale === 'fil' ? 'Inilipat na sa PNP ang kaso.' : 'Case referred to PNP successfully.' });
      closeReview();
    } catch (err) {
      setFeedback({ tone: 'error', text: err instanceof Error ? err.message : 'Error referring to PNP.' });
    } finally {
      setIsProcessing(false);
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

      {feedback ? <FormFeedback tone={feedback.tone} text={feedback.text} /> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        {/* Main Cases Table Section */}
        <SectionCard title={locale === 'fil' ? 'Barangay Cases & Concerns' : 'Barangay Cases & Concerns'}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={locale === 'fil' ? 'Hanapin: Case No, pangalan, lokasyon...' : 'Search: Case No, name, location...'}
              className="max-w-[420px]"
            />

            <div className="flex flex-wrap gap-1.5">
              {filterTabs.map((tab) => {
                const isActive = filter === tab.value;
                return (
                  <Button
                    key={tab.value}
                    type="button"
                    size="sm"
                    variant={isActive ? 'resident' : 'secondary'}
                    onClick={() => setFilter(tab.value)}
                    className="text-xs"
                  >
                    {locale === 'fil' ? tab.labelFil : tab.labelEn}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm text-left">
                <thead>
                  <tr className="border-b border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-2)] text-[color:var(--portal-ink-700)]">
                    <th className="px-4 py-3 font-semibold">{locale === 'fil' ? 'Case No.' : 'Case No.'}</th>
                    <th className="px-4 py-3 font-semibold">{locale === 'fil' ? 'Track & Title' : 'Track & Title'}</th>
                    <th className="px-4 py-3 font-semibold">{locale === 'fil' ? 'Resident / Parties' : 'Resident / Parties'}</th>
                    <th className="px-4 py-3 font-semibold">{locale === 'fil' ? 'Intent' : 'Intent'}</th>
                    <th className="px-4 py-3 font-semibold">{locale === 'fil' ? 'Status' : 'Status'}</th>
                    <th className="px-4 py-3 font-semibold">{locale === 'fil' ? 'Action' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--portal-border-soft)]">
                  {filteredReports.length ? (
                    filteredReports.map((item) => {
                      const isSelected = selectedReport?.id === item.id;
                      return (
                        <tr
                          key={item.id}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[color:var(--portal-surface-3)] font-medium' : 'bg-white hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedId(item.id)}
                        >
                          <td className="px-4 py-4 align-middle text-xs font-mono uppercase tracking-wider text-[color:var(--portal-ink-700)]">
                            {formatIncidentCaseNumber(item.id, item.createdAt)}
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                  item.trackType === 'community_concern'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {item.trackType === 'community_concern' ? 'Concern' : 'Incident'}
                              </span>
                              <span className="text-gray-900 line-clamp-1">{item.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-middle text-[color:var(--portal-ink-900)]">
                            {item.residentName}
                          </td>
                          <td className="px-4 py-4 align-middle text-xs text-gray-600">
                            {item.desiredAction === 'record_only'
                              ? 'Record Only'
                              : item.desiredAction === 'request_meeting'
                              ? 'Barangay Meeting'
                              : 'Standard'}
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <StatusBadge tone={statusToneFromState(item.status)}>
                              {getReportStatusLabel(item.status, locale)}
                            </StatusBadge>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <Button
                              type="button"
                              size="sm"
                              variant="residentOutline"
                              onClick={(event) => {
                                event.stopPropagation();
                                openReview(item.id);
                              }}
                            >
                              {locale === 'fil' ? 'Review & Manage' : 'Review & Manage'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center">
                        <EmptyState
                          title={locale === 'fil' ? 'Walang nahanap na kaso' : 'No matching cases found'}
                          description={copyText(
                            locale,
                            'Ayusin ang search o filter para makita ang ibang kaso.',
                            'Adjust search or filters to find other case records.'
                          )}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>

        {/* Sidebar Inspector Panel */}
        <div className="grid gap-5 self-start xl:sticky xl:top-6">
          <SectionCard title={locale === 'fil' ? 'Case Quick Inspector' : 'Case Quick Inspector'}>
            {selectedReport ? (
              <div className="grid gap-4">
                <div className="rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-2)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-mono uppercase text-[color:var(--portal-ink-500)]">
                        {formatIncidentCaseNumber(selectedReport.id, selectedReport.createdAt)}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-[color:var(--portal-ink-900)]">{selectedReport.title}</h3>
                    </div>
                    <StatusBadge tone={statusToneFromState(selectedReport.status)}>
                      {getReportStatusLabel(selectedReport.status, locale)}
                    </StatusBadge>
                  </div>

                  <div className="mt-3 grid gap-1.5 text-xs text-[color:var(--portal-ink-700)]">
                    <p><strong>Resident:</strong> {selectedReport.residentName}</p>
                    <p><strong>Track:</strong> {selectedReport.trackType === 'community_concern' ? 'Community Concern' : 'Incident / Blotter'}</p>
                    <p><strong>Intent:</strong> {selectedReport.desiredAction === 'record_only' ? 'Record Only' : selectedReport.desiredAction === 'request_meeting' ? 'Request Meeting' : 'N/A'}</p>
                    <p><strong>Location:</strong> {selectedReport.location}</p>
                    <p><strong>Date:</strong> {selectedReport.dateOfIncident}</p>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-gray-700 border-t pt-2">{selectedReport.details}</p>
                </div>

                <div className="grid gap-2">
                  <Button type="button" variant="resident" onClick={() => openReview(selectedReport.id)}>
                    {locale === 'fil' ? 'Buksan ang Action Panel' : 'Open Action Panel'}
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                title={locale === 'fil' ? 'Walang napiling kaso' : 'No case selected'}
                description={locale === 'fil' ? 'Pumili ng kaso mula sa talahanayan.' : 'Select a case from the table.'}
              />
            )}
          </SectionCard>
        </div>
      </div>

      {/* Full Decision & Action Panel Modal */}
      <Dialog open={reviewOpen} onOpenChange={(open) => (open ? setReviewOpen(true) : closeReview())}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-[24px] border border-[color:var(--portal-border-soft)] bg-white p-0 shadow-2xl">
          {selectedReport ? (
            <div className="grid">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b bg-[linear-gradient(180deg,#1d7a53_0%,#155f40_100%)] px-6 py-4 text-white rounded-t-[24px]">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-white/75">
                    {formatIncidentCaseNumber(selectedReport.id, selectedReport.createdAt)}
                  </p>
                  <DialogTitle className="mt-0.5 text-xl font-bold text-white">
                    {selectedReport.title}
                  </DialogTitle>
                </div>
                <StatusBadge tone={statusToneFromState(selectedReport.status)}>
                  {getReportStatusLabel(selectedReport.status, locale)}
                </StatusBadge>
              </div>

              {/* Modal Navigation Tabs */}
              <div className="flex border-b bg-gray-50 px-6 pt-3 gap-2 overflow-x-auto text-sm">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('details')}
                  className={`pb-3 px-3 font-semibold border-b-2 transition-all ${
                    activeModalTab === 'details' ? 'border-[#123726] text-[#123726]' : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  📋 Details
                </button>

                {selectedReport.trackType === 'community_concern' ? (
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('action')}
                    className={`pb-3 px-3 font-semibold border-b-2 transition-all ${
                      activeModalTab === 'action' ? 'border-[#123726] text-[#123726]' : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    🛠️ Staff Action
                  </button>
                ) : (
                  <>
                    {selectedReport.desiredAction === 'record_only' ? (
                      <button
                        type="button"
                        onClick={() => setActiveModalTab('action')}
                        className={`pb-3 px-3 font-semibold border-b-2 transition-all ${
                          activeModalTab === 'action' ? 'border-[#123726] text-[#123726]' : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        📝 Blotter Record
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveModalTab('hearing')}
                          className={`pb-3 px-3 font-semibold border-b-2 transition-all ${
                            activeModalTab === 'hearing' ? 'border-[#123726] text-[#123726]' : 'border-transparent text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          ⚖️ Barangay Hearing
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveModalTab('lupon')}
                          className={`pb-3 px-3 font-semibold border-b-2 transition-all ${
                            activeModalTab === 'lupon' ? 'border-[#123726] text-[#123726]' : 'border-transparent text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          🏛️ Lupon Conciliation
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveModalTab('cfa_pnp')}
                          className={`pb-3 px-3 font-semibold border-b-2 transition-all ${
                            activeModalTab === 'cfa_pnp' ? 'border-[#123726] text-[#123726]' : 'border-transparent text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          📜 CFA & PNP Referral
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Tab 1: Intake Details */}
              {activeModalTab === 'details' ? (
                <div className="p-6 grid gap-4 text-sm text-gray-800">
                  <div className="grid gap-3 rounded-xl border bg-gray-50/60 p-4">
                    <div className="grid sm:grid-cols-2 gap-2">
                      <p><strong>Complainant / Reporter:</strong> {selectedReport.residentName}</p>
                      {selectedReport.relationshipToRespondent ? (
                        <p><strong>Relasyon sa Nire-report:</strong> {selectedReport.relationshipToRespondent}</p>
                      ) : null}
                      <p><strong>Location:</strong> {selectedReport.location}</p>
                      <p><strong>Date:</strong> {selectedReport.dateOfIncident}</p>
                    </div>

                    <div className="border-t pt-2">
                      <p className="font-semibold text-xs uppercase text-gray-500">Details & Statements</p>
                      <p className="mt-1 leading-6 whitespace-pre-wrap">{selectedReport.details}</p>
                    </div>
                  </div>

                  {/* Proceedings Log */}
                  {selectedReport.proceedings?.length ? (
                    <div className="grid gap-2 border-t pt-3">
                      <h4 className="font-semibold text-[#123726]">Proceeding Logs ({selectedReport.proceedings.length})</h4>
                      <div className="grid gap-2">
                        {selectedReport.proceedings.map((proc, index) => (
                          <div key={proc.id || index} className="rounded-lg border p-3 bg-white text-xs">
                            <div className="flex justify-between font-semibold">
                              <span>{proc.stage === 'barangay_hearing' ? 'Barangay Hearing' : 'Lupon Conciliation'} #{proc.proceedingNo}</span>
                              <span>{formatDateTime(proc.scheduledAt, locale)}</span>
                            </div>
                            <p className="mt-1 text-gray-600">Venue: {proc.venue}</p>
                            {proc.minutes ? <p className="mt-1">Minutes: {proc.minutes}</p> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Tab 2: Community Concern Action / Blotter Record Only */}
              {activeModalTab === 'action' ? (
                <div className="p-6 grid gap-4 text-sm">
                  {selectedReport.trackType === 'community_concern' ? (
                    <div className="grid gap-4">
                      <div className="rounded-xl border bg-blue-50/50 p-4 text-blue-950">
                        <p className="font-semibold text-base">🛠️ Assign & Resolve Community Concern</p>
                        <p className="text-xs text-blue-800 mt-1">Assign field personnel/crew to act on this concern, then record completion.</p>
                      </div>

                      <label className="grid gap-1.5">
                        <span className="font-medium text-gray-800">Assign Personnel / Team</span>
                        <Input
                          value={assignedTo}
                          onChange={(e) => setAssignedTo(e.target.value)}
                          placeholder="e.g., Tanod Team B / Maintenance Crew A"
                        />
                      </label>
                      <Button type="button" variant="resident" disabled={isProcessing} onClick={handleAssignAction}>
                        Assign Action
                      </Button>

                      <div className="border-t pt-4 grid gap-1.5">
                        <span className="font-medium text-gray-800">Action Taken / Resolution Summary</span>
                        <Textarea
                          value={actionTakenText}
                          onChange={(e) => setActionTakenText(e.target.value)}
                          placeholder="Describe the action completed (e.g., Tree branch trimmed and cleared at 2:30 PM)."
                          className="min-h-[100px]"
                        />
                        <Button type="button" variant="secondary" disabled={isProcessing} onClick={handleRecordActionTaken}>
                          Record Action & Resolve Case
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      <div className="rounded-xl border bg-amber-50 p-4 text-amber-900">
                        <p className="font-semibold text-base">📝 Blotter Record Only</p>
                        <p className="text-xs text-amber-800 mt-1">The resident requested to record the incident in the official blotter only without a meeting.</p>
                      </div>

                      <Button type="button" variant="resident" disabled={isProcessing} onClick={handleCloseBlotterOnly}>
                        Confirm Blotter Recording & Close Case
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Tab 3: Barangay Hearing */}
              {activeModalTab === 'hearing' ? (
                <div className="p-6 grid gap-5 text-sm">
                  <div className="rounded-xl border bg-emerald-50/50 p-4 text-emerald-950">
                    <p className="font-semibold text-base">⚖️ Stage 1: Barangay Hearing Proceeding</p>
                    <p className="text-xs text-emerald-800 mt-1">Schedule hearing session and issue digital summons to involved parties.</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1">
                      <span className="font-medium">Hearing Date</span>
                      <Input type="date" value={hearingDate} onChange={(e) => setHearingDate(e.target.value)} />
                    </label>
                    <label className="grid gap-1">
                      <span className="font-medium">Hearing Time</span>
                      <Input type="time" value={hearingTime} onChange={(e) => setHearingTime(e.target.value)} />
                    </label>
                    <label className="grid gap-1">
                      <span className="font-medium">Venue</span>
                      <Input value={hearingVenue} onChange={(e) => setHearingVenue(e.target.value)} />
                    </label>
                  </div>

                  <Button type="button" variant="resident" disabled={isProcessing || !hearingDate} onClick={() => handleScheduleHearing('barangay_hearing')}>
                    Schedule Barangay Hearing
                  </Button>

                  <div className="border-t pt-4 grid gap-3">
                    <p className="font-semibold text-[#123726]">Record Hearing Minutes & Outcome</p>
                    <label className="grid gap-1">
                      <span className="font-medium">Discussion Minutes / Summary</span>
                      <Textarea value={hearingMinutes} onChange={(e) => setHearingMinutes(e.target.value)} placeholder="Minutes of discussion, statements..." />
                    </label>

                    <label className="grid gap-1">
                      <span className="font-medium">Hearing Outcome</span>
                      <Select value={hearingOutcome} onChange={(e: any) => setHearingOutcome(e.target.value)}>
                        <option value="settled">Settled / Resolved (Close Case)</option>
                        <option value="another_hearing">Schedule Another Hearing</option>
                        <option value="not_settled">Not Settled (Escalate to Lupon)</option>
                      </Select>
                    </label>

                    <Button type="button" variant="secondary" disabled={isProcessing} onClick={() => handleRecordHearingOutcome('barangay_hearing')}>
                      Save Hearing Outcome & Transition
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Tab 4: Lupon Conciliation */}
              {activeModalTab === 'lupon' ? (
                <div className="p-6 grid gap-5 text-sm">
                  <div className="rounded-xl border bg-purple-50 p-4 text-purple-950">
                    <p className="font-semibold text-base">🏛️ Stage 2: Lupon Conciliation Proceeding</p>
                    <p className="text-xs text-purple-800 mt-1">Escalated proceeding under Pangkat Tagapagkasundo conciliation.</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="font-medium">Lupon Meeting Date</span>
                      <Input type="date" value={hearingDate} onChange={(e) => setHearingDate(e.target.value)} />
                    </label>
                    <label className="grid gap-1">
                      <span className="font-medium">Presiding Lupon Officer</span>
                      <Input value={presidingOfficer} onChange={(e) => setPresidingOfficer(e.target.value)} placeholder="Lupon Chairman / Pangkat Chairman" />
                    </label>
                  </div>

                  <Button type="button" variant="resident" disabled={isProcessing || !hearingDate} onClick={() => handleScheduleHearing('lupon_conciliation')}>
                    Schedule Lupon Conciliation
                  </Button>

                  <div className="border-t pt-4 grid gap-3">
                    <p className="font-semibold text-[#123726]">Record Lupon Outcome</p>
                    <label className="grid gap-1">
                      <span className="font-medium">Lupon Outcome</span>
                      <Select value={hearingOutcome} onChange={(e: any) => setHearingOutcome(e.target.value)}>
                        <option value="settled">Settled (Close Case)</option>
                        <option value="not_settled">Not Settled (Issue CFA)</option>
                      </Select>
                    </label>

                    <Button type="button" variant="secondary" disabled={isProcessing} onClick={() => handleRecordHearingOutcome('lupon_conciliation')}>
                      Save Lupon Outcome
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Tab 5: CFA & PNP Referral */}
              {activeModalTab === 'cfa_pnp' ? (
                <div className="p-6 grid gap-6 text-sm">
                  {/* CFA Box */}
                  <div className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                    <p className="font-semibold text-amber-950 text-base">📜 Stage 3: Certificate to File Action (CFA)</p>
                    <p className="text-xs text-amber-800">Issue CFA when conciliation fails so complainant can file in court.</p>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <label className="grid gap-1">
                        <span className="font-medium text-xs">Certificate Number</span>
                        <Input value={cfaCertNumber} onChange={(e) => setCfaCertNumber(e.target.value)} />
                      </label>
                      <label className="grid gap-1">
                        <span className="font-medium text-xs">Recipient Name</span>
                        <Input value={cfaRecipient} onChange={(e) => setCfaRecipient(e.target.value)} />
                      </label>
                    </div>

                    <Button type="button" variant="resident" disabled={isProcessing} onClick={handleIssueCfa}>
                      Issue Certificate to File Action
                    </Button>
                  </div>

                  {/* PNP Referral Box */}
                  <div className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                    <p className="font-semibold text-blue-950 text-base">👮 Stage 4: Referral to PNP</p>
                    <p className="text-xs text-blue-800">Turn over case records to PNP after barangay proceedings conclude.</p>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <label className="grid gap-1">
                        <span className="font-medium text-xs">Receiving Police Unit</span>
                        <Input value={pnpReceivingUnit} onChange={(e) => setPnpReceivingUnit(e.target.value)} />
                      </label>
                      <label className="grid gap-1">
                        <span className="font-medium text-xs">Police Reference Number</span>
                        <Input value={pnpRefNumber} onChange={(e) => setPnpRefNumber(e.target.value)} placeholder="Ref #" />
                      </label>
                    </div>

                    <Button type="button" variant="secondary" disabled={isProcessing} onClick={handleReferToPnp}>
                      Refer Case to PNP & Conclude Barangay Action
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Always-accessible Generate Official Report PDF Button */}
              <div className="border-t bg-gray-50 px-6 py-3 flex justify-between items-center rounded-b-[24px]">
                <p className="text-xs text-gray-500">
                  {locale === 'fil' ? 'Opisyal na Dokumentasyon' : 'Official Case Documentation'}
                </p>
                <Button
                  type="button"
                  variant="resident"
                  size="sm"
                  onClick={() => setDocumentModalOpen(true)}
                  className="gap-1.5 text-xs"
                >
                  📄 {locale === 'fil' ? 'I-generate ang Official Report (PDF)' : 'Generate Official Report (PDF)'}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <CaseReportDocumentModal
        open={documentModalOpen}
        onOpenChange={setDocumentModalOpen}
        report={selectedReport}
        locale={locale}
      />
    </PortalShell>
  );
}
