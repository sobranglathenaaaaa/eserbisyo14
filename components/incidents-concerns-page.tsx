"use client";

import { useEffect, useMemo, useState } from 'react';
import { X, Lock, FileText, CheckCircle2, MapPin, Users, Filter } from 'lucide-react';
import PortalShell from '@/components/portal-shell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState, FormFeedback, PageGuide, SectionCard, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { copyText } from '@/features/resident/model/copy';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import { formatDateTime, formatIncidentCaseNumber, getReportStatusLabel } from '@/lib/formatters';
import {
  updateCaseWorkflow,
  updateReportStatus,
  upsertBarangayStreet,
  archiveBarangayStreet,
  upsertIncidentRelationship,
  archiveIncidentRelationship,
} from '@/lib/frontend-data/store';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import type { IncidentReport, ReportStatus } from '@/lib/types/models';
import CaseReportDocumentModal from '@/components/case-report-document-modal';

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

type StageFilter = 'all' | 'pending' | 'hearings' | 'lupon' | 'cfa_pnp' | 'record_only' | 'resolved';

type ModalTab = 'details' | 'action' | 'hearing' | 'lupon' | 'cfa_pnp';

function workflowStage(report: IncidentReport | null): number {
  if (!report) return 0;
  if (['resolved', 'closed', 'referred_to_pnp'].includes(report.status)) return 4;
  if (report.cfa) return 3;
  if (report.proceedings?.some((p) => p.stage === 'lupon_conciliation')) return 2;
  if ((report.proceedings?.length ?? 0) > 0 || ['proceed_to_barangay', 'under_review'].includes(report.status)) return 1;
  return 0;
}

function defaultTab(report: IncidentReport | null): ModalTab {
  if (!report) return 'details';
  if (['referred_to_pnp'].includes(report.status) || report.cfa) return 'cfa_pnp';
  const hasLupon = report.proceedings?.some((p) => p.stage === 'lupon_conciliation');
  const hasHearing = report.proceedings?.some((p) => p.stage === 'barangay_hearing');
  if (hasLupon) return 'lupon';
  if (hasHearing) return 'hearing';
  return 'details';
}

const ENDED: ReportStatus[] = ['resolved', 'closed', 'cfa_issued', 'referred_to_pnp'];
const isEnded = (s: ReportStatus) => ENDED.includes(s);

const STAGE_OPTIONS: Array<{ value: StageFilter; en: string; fil: string }> = [
  { value: 'all',         en: 'All Stages & Statuses', fil: 'Lahat ng Yugto at Katayuan' },
  { value: 'pending',     en: 'Pending Review',        fil: 'Naghihintay ng Review' },
  { value: 'hearings',    en: 'Barangay Hearings',     fil: 'Pagdinig sa Barangay' },
  { value: 'lupon',       en: 'Lupon Conciliation',    fil: 'Lupon Conciliation' },
  { value: 'cfa_pnp',     en: 'CFA & PNP Referrals',   fil: 'CFA at PNP Referrals' },
  { value: 'record_only', en: 'Blotter Record Only',   fil: 'Blotter Record Only' },
  { value: 'resolved',    en: 'Resolved / Closed',     fil: 'Naresolba / Isinara' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IncidentsConcernsPage({ role }: { role: 'staff' | 'admin' }) {
  const { state, locale } = useAppState();
  const pageCopy = getRolePageCopy(role === 'admin' ? 'admin/incidents' : 'staff/incidents');

  // List & Filters
  const [search,      setSearch]      = useState('');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modal
  const [reviewOpen,        setReviewOpen]        = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [activeTab,         setActiveTab]         = useState<ModalTab>('details');

  // Details tab — decline reason
  const [declineReason, setDeclineReason] = useState('');

  // Initial Hearing scheduling form (in Details tab)
  const [hearingDate,      setHearingDate]      = useState('');
  const [hearingTime,      setHearingTime]      = useState('10:00');
  const [hearingVenue,     setHearingVenue]     = useState('Barangay Session Hall');
  const [presidingOfficer, setPresidingOfficer] = useState('');
  const [hearingNotes,     setHearingNotes]     = useState(''); // pre-hearing notes / agenda

  // Outcome recording (in Barangay Hearing tab)
  const [outcomeMinutes,    setOutcomeMinutes]    = useState('');
  const [outcomeAgreements, setOutcomeAgreements] = useState('');
  const [hearingOutcome,    setHearingOutcome]    = useState<'settled' | 'another_hearing' | 'not_settled'>('settled');

  // Next hearing scheduling (if outcome === 'another_hearing')
  const [nextHearingDate,  setNextHearingDate]  = useState('');
  const [nextHearingTime,  setNextHearingTime]  = useState('10:00');
  const [nextHearingVenue, setNextHearingVenue] = useState('Barangay Session Hall');

  // Lupon meeting scheduling (if outcome === 'not_settled')
  const [luponDate,        setLuponDate]        = useState('');
  const [luponTime,        setLuponTime]        = useState('10:00');
  const [luponVenue,       setLuponVenue]       = useState('Barangay Lupon Hall');
  const [luponOfficer,     setLuponOfficer]     = useState('');
  const [luponAgendaNotes, setLuponAgendaNotes] = useState('');

  // Lupon outcome recording (in Lupon tab)
  const [luponMinutes,      setLuponMinutes]      = useState('');
  const [luponAgreements,   setLuponAgreements]   = useState('');
  const [luponOutcome,      setLuponOutcome]      = useState<'settled' | 'another_session' | 'not_settled'>('settled');
  const [nextLuponDate,     setNextLuponDate]     = useState('');
  const [nextLuponTime,     setNextLuponTime]     = useState('10:00');

  // CFA
  const [cfaCertNumber,       setCfaCertNumber]       = useState('');
  const [cfaIssuingAuthority, setCfaIssuingAuthority] = useState('Barangay Chairman');
  const [cfaRecipient,        setCfaRecipient]        = useState('');

  // PNP
  const [pnpReceivingUnit, setPnpReceivingUnit] = useState('PNP Station 4');
  const [pnpRefNumber,     setPnpRefNumber]     = useState('');
  const [pnpNotes,         setPnpNotes]         = useState('');

  // Data management
  const [newStreetName, setNewStreetName] = useState('');
  const [newRelName,    setNewRelName]    = useState('');
  const [streetAction,  setStreetAction]  = useState<string | null>(null);
  const [relAction,     setRelAction]     = useState<string | null>(null);

  const streets       = useMemo(() => (state.barangayStreets       || []).slice().sort((a, b) => a.sortOrder - b.sortOrder), [state.barangayStreets]);
  const relationships = useMemo(() => (state.incidentRelationships || []).slice().sort((a, b) => a.sortOrder - b.sortOrder), [state.incidentRelationships]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback,     setFeedback]     = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  // ---------------------------------------------------------------------------
  // Street & Relationship Handlers
  // ---------------------------------------------------------------------------
  const handleAddStreet = async () => {
    const trimmed = newStreetName.trim();
    if (!trimmed) return;
    setStreetAction('adding');
    try {
      await upsertBarangayStreet({ name: trimmed });
      setNewStreetName('');
      setFeedback({
        tone: 'success',
        text: locale === 'fil' ? `Matagumpay na naidagdag ang "${trimmed}".` : `"${trimmed}" street added successfully.`,
      });
    } catch (err) {
      setFeedback({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Failed to add street.',
      });
    } finally {
      setStreetAction(null);
    }
  };

  const handleToggleStreetArchive = async (st: { id: string; name: string; isActive: boolean }) => {
    const action = st.isActive ? 'archiving' : 'restoring';
    setStreetAction(`${st.id}:${action}`);
    try {
      if (st.isActive) {
        await archiveBarangayStreet(st.id);
      } else {
        await upsertBarangayStreet({ id: st.id, name: st.name, isActive: true });
      }
      setFeedback({
        tone: 'success',
        text: st.isActive
          ? (locale === 'fil' ? `Nai-archive ang kalsada: "${st.name}".` : `Street "${st.name}" archived.`)
          : (locale === 'fil' ? `Naibalik ang kalsada: "${st.name}".` : `Street "${st.name}" restored.`),
      });
    } catch (err) {
      setFeedback({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Failed to update street status.',
      });
    } finally {
      setStreetAction(null);
    }
  };

  const handleAddRelationship = async () => {
    const trimmed = newRelName.trim();
    if (!trimmed) return;
    setRelAction('adding');
    try {
      await upsertIncidentRelationship({ name: trimmed });
      setNewRelName('');
      setFeedback({
        tone: 'success',
        text: locale === 'fil' ? `Matagumpay na naidagdag ang "${trimmed}".` : `"${trimmed}" relationship option added successfully.`,
      });
    } catch (err) {
      setFeedback({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Failed to add relationship option.',
      });
    } finally {
      setRelAction(null);
    }
  };

  const handleToggleRelArchive = async (rel: { id: string; name: string; isActive: boolean }) => {
    const action = rel.isActive ? 'archiving' : 'restoring';
    setRelAction(`${rel.id}:${action}`);
    try {
      if (rel.isActive) {
        await archiveIncidentRelationship(rel.id);
      } else {
        await upsertIncidentRelationship({ id: rel.id, name: rel.name, isActive: true });
      }
      setFeedback({
        tone: 'success',
        text: rel.isActive
          ? (locale === 'fil' ? `Nai-archive ang relasyon: "${rel.name}".` : `Relationship "${rel.name}" archived.`)
          : (locale === 'fil' ? `Naibalik ang relasyon: "${rel.name}".` : `Relationship "${rel.name}" restored.`),
      });
    } catch (err) {
      setFeedback({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Failed to update relationship option status.',
      });
    } finally {
      setRelAction(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const reports = useMemo(
    () => (state.reports as IncidentReport[]).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.reports]
  );

  const stageCounts = useMemo(() => {
    const base = reports;
    return {
      all: base.length,
      pending: base.filter((r) => r.status === 'pending' || r.status === 'submitted').length,
      hearings: base.filter((r) => (r.status === 'proceed_to_barangay' || r.status === 'under_review' || (r.proceedings && r.proceedings.length > 0)) && !r.proceedings?.some((p) => p.stage === 'lupon_conciliation')).length,
      lupon: base.filter((r) => r.proceedings?.some((p) => p.stage === 'lupon_conciliation')).length,
      cfa_pnp: base.filter((r) => Boolean(r.cfa || r.pnpReferral || r.status === 'referred_to_pnp')).length,
      record_only: base.filter((r) => r.desiredAction === 'record_only').length,
      resolved: base.filter((r) => r.status === 'resolved' || r.status === 'closed').length,
    };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((item) => {
      // Stage/Status filter
      if (stageFilter === 'pending' && item.status !== 'pending' && item.status !== 'submitted') return false;
      if (stageFilter === 'record_only' && item.desiredAction !== 'record_only') return false;
      if (stageFilter === 'hearings' && item.status !== 'proceed_to_barangay' && item.status !== 'under_review' && (!item.proceedings || item.proceedings.length === 0)) return false;
      if (stageFilter === 'lupon' && !item.proceedings?.some((p) => p.stage === 'lupon_conciliation')) return false;
      if (stageFilter === 'cfa_pnp' && !item.cfa && !item.pnpReferral && item.status !== 'referred_to_pnp') return false;
      if (stageFilter === 'resolved' && item.status !== 'resolved' && item.status !== 'closed') return false;

      // Search query
      if (!q) return true;
      return [
        item.id,
        item.title,
        item.details,
        item.location,
        item.residentName,
        item.streetName ?? '',
        item.relationshipToRespondent ?? '',
        item.kind,
        item.otherCategoryText ?? '',
        ...(item.parties?.map((p) => p.fullName) ?? []),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [reports, stageFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, stageFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const selectedReport = useMemo(
    () => filteredReports.find((r) => r.id === selectedId) ?? filteredReports[0] ?? reports[0] ?? null,
    [filteredReports, reports, selectedId]
  );

  const isIncidentMeeting = selectedReport?.trackType === 'incident' && selectedReport?.desiredAction === 'request_meeting';
  const isCaseEnded = selectedReport ? isEnded(selectedReport.status) : false;
  const stage = selectedReport ? workflowStage(selectedReport) : 0;

  const tabAccessible = (tab: ModalTab): boolean => {
    if (!selectedReport) return false;
    if (!isIncidentMeeting) return true;
    if (tab === 'details')  return true;
    if (tab === 'hearing')  return (selectedReport.proceedings?.length ?? 0) > 0 || ['proceed_to_barangay', 'under_review', 'resolved', 'closed'].includes(selectedReport.status);
    if (tab === 'lupon')    return (selectedReport.proceedings?.some((p) => p.stage === 'lupon_conciliation') ?? false) || ['resolved', 'closed'].includes(selectedReport.status);
    if (tab === 'cfa_pnp') return Boolean(selectedReport.cfa || selectedReport.pnpReferral) || (selectedReport.proceedings?.some((p) => p.stage === 'lupon_conciliation' && p.outcome === 'not_settled') ?? false) || ['resolved', 'closed'].includes(selectedReport.status);
    return false;
  };

  // Is a tab "done" (the workflow has moved past it)?
  const tabDone = (tab: ModalTab): boolean => {
    if (!isIncidentMeeting || !selectedReport) return false;
    if (tab === 'hearing')  return selectedReport.proceedings?.some((p) => p.stage === 'lupon_conciliation') || isEnded(selectedReport.status);
    if (tab === 'lupon')    return Boolean(selectedReport.cfa || selectedReport.pnpReferral) || isEnded(selectedReport.status);
    if (tab === 'cfa_pnp') return isEnded(selectedReport.status);
    return false;
  };

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!selectedReport) { setSelectedId(null); return; }
    if (selectedId !== selectedReport.id) setSelectedId(selectedReport.id);
  }, [selectedId, selectedReport]);

  useEffect(() => {
    if (!feedback) return;
    const t = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(t);
  }, [feedback]);

  useEffect(() => {
    if (!selectedReport) return;
    setCfaRecipient(selectedReport.residentName);
    if (!cfaCertNumber)
      setCfaCertNumber(`CFA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setHearingDate('');
    setHearingNotes('');
    setOutcomeMinutes('');
    setOutcomeAgreements('');
    setHearingOutcome('settled');
    setNextHearingDate('');
    setLuponDate('');
    setLuponOfficer('');
    setLuponAgendaNotes('');
    setLuponMinutes('');
    setLuponAgreements('');
    setLuponOutcome('settled');
    setNextLuponDate('');
    setDeclineReason('');
  }, [selectedReport?.id]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const openReview = (reportId: string) => {
    const r = reports.find((x) => x.id === reportId);
    if (!r) return;
    setSelectedId(reportId);
    const isMeeting = r.trackType === 'incident' && r.desiredAction === 'request_meeting';
    setActiveTab(isMeeting ? defaultTab(r) : isEnded(r.status) ? 'details' : 'action');
    setReviewOpen(true);
  };

  const closeReview = () => { setReviewOpen(false); setIsProcessing(false); };

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const wrap = async (fn: () => Promise<void>) => {
    setIsProcessing(true);
    try { await fn(); }
    catch (err) { setFeedback({ tone: 'error', text: err instanceof Error ? err.message : 'An error occurred.' }); }
    finally { setIsProcessing(false); }
  };

  const handleDecline = () => wrap(async () => {
    if (!selectedReport || !declineReason.trim()) return;
    await updateReportStatus(selectedReport.id, 'declined', declineReason.trim());
    setFeedback({ tone: 'success', text: locale === 'fil' ? 'Tinanggihan ang kaso.' : 'Case declined.' });
    closeReview();
  });

  const handleCloseCase = (note?: string) => wrap(async () => {
    if (!selectedReport) return;
    await updateReportStatus(selectedReport.id, 'resolved', note ?? 'Case resolved by staff.');
    setFeedback({ tone: 'success', text: locale === 'fil' ? 'Naisara na ang kaso bilang resolved.' : 'Case closed and resolved.' });
    closeReview();
  });

  const handleResolveWithoutMeeting = () => wrap(async () => {
    if (!selectedReport) return;
    const note = selectedReport.desiredAction === 'record_only'
      ? 'Incident recorded in official blotter. No hearing requested.'
      : 'No meeting requested. Marked as resolved by staff.';
    await updateReportStatus(selectedReport.id, 'resolved', note);
    setFeedback({ tone: 'success', text: locale === 'fil' ? 'Minarkahang resolved ang report.' : 'Report marked as resolved.' });
    closeReview();
  });

  const handleScheduleHearing = () => wrap(async () => {
    if (!selectedReport || !hearingDate) return;
    const count = (selectedReport.proceedings?.filter((p) => p.stage === 'barangay_hearing').length || 0) + 1;
    await updateCaseWorkflow(selectedReport.id, {
      status: 'under_review',
      proceeding: {
        stage: 'barangay_hearing',
        proceedingNo: count,
        scheduledAt: `${hearingDate}T${hearingTime}:00`,
        venue: hearingVenue.trim(),
        presidingOfficer: presidingOfficer.trim() || undefined,
        attendance: '',
        minutes: hearingNotes.trim(),
        agreements: '',
        outcome: undefined,
      },
    });
    setFeedback({
      tone: 'success',
      text: locale === 'fil'
        ? 'Nai-schedule na ang Barangay Hearing at naipadala ang email sa resident.'
        : 'Barangay Hearing scheduled successfully. Email notification sent to resident.',
    });
    setHearingDate('');
    setHearingNotes('');
    setActiveTab('hearing');
  });

  const handleRecordHearingOutcome = () => wrap(async () => {
    if (!selectedReport) return;
    if (!outcomeMinutes.trim()) {
      setFeedback({ tone: 'error', text: locale === 'fil' ? 'Mangyaring ilagay ang mga napag-usapan / minutes ng hearing.' : 'Please enter the minutes of the hearing.' });
      return;
    }

    if (hearingOutcome === 'settled') {
      await updateCaseWorkflow(selectedReport.id, {
        status: 'resolved',
        note: `Settled in Barangay Hearing. ${outcomeMinutes.trim()}`,
        proceeding: {
          stage: 'barangay_hearing',
          proceedingNo: (selectedReport.proceedings?.filter((p) => p.stage === 'barangay_hearing').length || 1),
          scheduledAt: new Date().toISOString(),
          venue: hearingVenue.trim(),
          presidingOfficer: presidingOfficer.trim() || undefined,
          attendance: '',
          minutes: outcomeMinutes.trim(),
          agreements: outcomeAgreements.trim() || 'Agreement reached and settled.',
          outcome: 'settled',
        },
      });
      setFeedback({ tone: 'success', text: locale === 'fil' ? 'Naisara na ang kaso — nagkasundo ang mga partido.' : 'Case settled and closed successfully.' });
      setOutcomeMinutes('');
      setOutcomeAgreements('');
      closeReview();
    } else if (hearingOutcome === 'another_hearing') {
      if (!nextHearingDate) {
        setFeedback({ tone: 'error', text: locale === 'fil' ? 'Pumili ng petsa para sa susunod na hearing.' : 'Please select the date for the next hearing.' });
        return;
      }
      const count = (selectedReport.proceedings?.filter((p) => p.stage === 'barangay_hearing').length || 0) + 1;
      await updateCaseWorkflow(selectedReport.id, {
        status: 'under_review',
        note: `Previous hearing notes: ${outcomeMinutes.trim()}`,
        proceeding: {
          stage: 'barangay_hearing',
          proceedingNo: count,
          scheduledAt: `${nextHearingDate}T${nextHearingTime}:00`,
          venue: (nextHearingVenue || hearingVenue).trim(),
          presidingOfficer: presidingOfficer.trim() || undefined,
          attendance: '',
          minutes: outcomeMinutes.trim(),
          agreements: outcomeAgreements.trim() || '',
          outcome: 'another_hearing',
        },
      });
      setFeedback({ tone: 'success', text: locale === 'fil' ? 'Nai-record ang minutes at nai-schedule ang susunod na hearing.' : 'Minutes saved and next hearing scheduled.' });
      setOutcomeMinutes('');
      setOutcomeAgreements('');
      setNextHearingDate('');
    } else if (hearingOutcome === 'not_settled') {
      if (!luponDate) {
        setFeedback({ tone: 'error', text: locale === 'fil' ? 'Pumili ng petsa para sa Lupon meeting.' : 'Please select the date for the Lupon Conciliation meeting.' });
        return;
      }
      const luponCount = (selectedReport.proceedings?.filter((p) => p.stage === 'lupon_conciliation').length || 0) + 1;
      await updateCaseWorkflow(selectedReport.id, {
        status: 'under_review',
        note: `Barangay hearing not settled. Escalated to Lupon. Notes: ${outcomeMinutes.trim()}`,
        proceeding: {
          stage: 'lupon_conciliation',
          proceedingNo: luponCount,
          scheduledAt: `${luponDate}T${luponTime}:00`,
          venue: (luponVenue || 'Barangay Lupon Hall').trim(),
          presidingOfficer: luponOfficer.trim() || 'Lupon Chairman',
          attendance: '',
          minutes: `${outcomeMinutes.trim()}${luponAgendaNotes ? `\nLupon Agenda: ${luponAgendaNotes.trim()}` : ''}`,
          agreements: '',
          outcome: undefined,
        },
      });
      setFeedback({ tone: 'success', text: locale === 'fil' ? 'Nai-escalate sa Lupon at naipadala ang email schedule sa resident.' : 'Escalated to Lupon. Email notification sent to resident.' });
      setOutcomeMinutes('');
      setOutcomeAgreements('');
      setLuponDate('');
      setActiveTab('lupon');
    }
  });

  const handleRecordLuponOutcome = () => wrap(async () => {
    if (!selectedReport) return;
    if (!luponMinutes.trim()) {
      setFeedback({ tone: 'error', text: locale === 'fil' ? 'Mangyaring ilagay ang minutes ng Lupon session.' : 'Please enter the Lupon session minutes.' });
      return;
    }

    if (luponOutcome === 'settled') {
      await updateCaseWorkflow(selectedReport.id, {
        status: 'resolved',
        note: `Settled in Lupon Conciliation. ${luponMinutes.trim()}`,
        proceeding: {
          stage: 'lupon_conciliation',
          proceedingNo: (selectedReport.proceedings?.filter((p) => p.stage === 'lupon_conciliation').length || 1),
          scheduledAt: new Date().toISOString(),
          venue: luponVenue.trim(),
          presidingOfficer: luponOfficer.trim() || 'Lupon Chairman',
          attendance: '',
          minutes: luponMinutes.trim(),
          agreements: luponAgreements.trim() || 'Amicable settlement reached at Lupon.',
          outcome: 'settled',
        },
      });
      setFeedback({ tone: 'success', text: locale === 'fil' ? 'Naisara na ang kaso — nagkasundo sa Lupon.' : 'Case settled at Lupon and resolved.' });
      setLuponMinutes('');
      setLuponAgreements('');
      closeReview();
    } else if (luponOutcome === 'another_session') {
      if (!nextLuponDate) {
        setFeedback({ tone: 'error', text: locale === 'fil' ? 'Pumili ng petsa para sa susunod na Lupon session.' : 'Please select the date for the next Lupon session.' });
        return;
      }
      const count = (selectedReport.proceedings?.filter((p) => p.stage === 'lupon_conciliation').length || 0) + 1;
      await updateCaseWorkflow(selectedReport.id, {
        status: 'under_review',
        note: `Lupon session minutes: ${luponMinutes.trim()}`,
        proceeding: {
          stage: 'lupon_conciliation',
          proceedingNo: count,
          scheduledAt: `${nextLuponDate}T${nextLuponTime}:00`,
          venue: (luponVenue || 'Barangay Lupon Hall').trim(),
          presidingOfficer: luponOfficer.trim() || 'Lupon Chairman',
          attendance: '',
          minutes: luponMinutes.trim(),
          agreements: luponAgreements.trim() || '',
          outcome: 'another_hearing',
        },
      });
      setFeedback({ tone: 'success', text: locale === 'fil' ? 'Nai-schedule ang susunod na Lupon session.' : 'Next Lupon session scheduled.' });
      setNextLuponDate('');
      setLuponMinutes('');
    } else if (luponOutcome === 'not_settled') {
      await updateCaseWorkflow(selectedReport.id, {
        status: 'under_review',
        note: `Lupon conciliation failed / not settled. Proceeding to CFA / PNP. ${luponMinutes.trim()}`,
        proceeding: {
          stage: 'lupon_conciliation',
          proceedingNo: (selectedReport.proceedings?.filter((p) => p.stage === 'lupon_conciliation').length || 1),
          scheduledAt: new Date().toISOString(),
          venue: luponVenue.trim(),
          presidingOfficer: luponOfficer.trim() || 'Lupon Chairman',
          attendance: '',
          minutes: luponMinutes.trim(),
          agreements: 'Failed conciliation — No agreement reached.',
          outcome: 'not_settled',
        },
      });
      setFeedback({ tone: 'success', text: locale === 'fil' ? 'Hindi nagkasundo sa Lupon. Maaari nang mag-issue ng CFA o ilipat sa PNP.' : 'Conciliation failed. You may now issue a CFA or refer to PNP.' });
      setActiveTab('cfa_pnp');
    }
  });

  const handleIssueCfa = () => wrap(async () => {
    if (!selectedReport || !cfaCertNumber.trim()) return;
    await updateCaseWorkflow(selectedReport.id, {
      status: 'resolved',
      cfa: {
        certificateNumber: cfaCertNumber.trim(),
        dateIssued: new Date().toISOString().slice(0, 10),
        issuingAuthority: cfaIssuingAuthority.trim(),
        chairmanSigned: true,
        recipientName: cfaRecipient.trim(),
      },
    });
    setFeedback({ tone: 'success', text: locale === 'fil' ? 'Na-issue ang Certificate to File Action at naisara ang kaso.' : 'CFA issued successfully and case concluded.' });
  });

  const handleReferToPnp = () => wrap(async () => {
    if (!selectedReport || !pnpReceivingUnit.trim()) return;
    await updateCaseWorkflow(selectedReport.id, {
      status: 'referred_to_pnp',
      pnpReferral: {
        dateReferred: new Date().toISOString().slice(0, 10),
        receivingUnit: pnpReceivingUnit.trim(),
        referenceNumber: pnpRefNumber.trim() || undefined,
        referralNotes: pnpNotes.trim() || undefined,
      },
    });
    setFeedback({ tone: 'success', text: locale === 'fil' ? 'Inilipat na ang kaso sa PNP.' : 'Case referred to PNP.' });
    closeReview();
  });

  // ---------------------------------------------------------------------------
  // Small UI pieces
  // ---------------------------------------------------------------------------

  /** Tab navigation button — carries done/active/locked state visually */
  const Tab = ({ tab, label }: { tab: ModalTab; label: string }) => {
    const accessible = tabAccessible(tab);
    const done       = tabDone(tab);
    const active     = activeTab === tab;
    return (
      <button
        type="button"
        disabled={!accessible}
        onClick={() => accessible && setActiveTab(tab)}
        className={[
          'pb-3 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5',
          active     ? 'border-[#123726] text-[#123726]'
          : done     ? 'border-transparent text-gray-400 hover:text-gray-600 cursor-pointer'
          : !accessible ? 'border-transparent text-gray-300 cursor-not-allowed select-none'
          : 'border-transparent text-gray-500 hover:text-gray-800 cursor-pointer',
        ].join(' ')}
        title={!accessible ? (locale === 'fil' ? 'Hindi pa naa-access ang stage na ito' : 'Complete the previous step first') : undefined}
      >
        {done    && <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />}
        {!accessible && <Lock size={11} className="shrink-0" />}
        {label}
      </button>
    );
  };

  /** Locked placeholder for a tab whose stage hasn't been reached */
  const LockedStage = ({ title, hint }: { title: string; hint: string }) => (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center px-8">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-200">
        <Lock size={20} className="text-gray-300" />
      </div>
      <p className="font-semibold text-gray-400 text-sm">{title}</p>
      <p className="text-xs text-gray-400 max-w-[300px]">{hint}</p>
    </div>
  );

  /** Escape hatch — close case at any hearing/lupon stage */
  const CloseCaseEscape = ({ note }: { note: string }) => (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-4">
      <p className="text-xs font-semibold text-gray-600 mb-1">
        {locale === 'fil' ? 'Isara na ang kaso dito' : 'Resolve & close case at this stage'}
      </p>
      <p className="text-xs text-gray-500 mb-3">
        {locale === 'fil'
          ? 'Kung naaayos na ang sitwasyon, maaari nang isara ang kaso nang walang pag-escalate pa.'
          : 'If the situation has already been resolved, close the case here without escalating further.'}
      </p>
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="residentOutline" disabled={isProcessing} onClick={() => void handleCloseCase(note)} className="text-xs">
          {locale === 'fil' ? 'I-close ang kaso ngayon' : 'Close case now'}
        </Button>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <PortalShell role={role} allowedRoles={['staff', 'admin']} title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {pageCopy.guide ? (
        <PageGuide
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}

      {feedback ? <FormFeedback tone={feedback.tone} text={feedback.text} /> : null}

      <div className="space-y-6">
        {/* Cases table */}
        <SectionCard
          title={locale === 'fil' ? 'Mga Kaso at Concern ng Barangay' : 'Barangay Cases & Concerns'}
          description={locale === 'fil' ? 'Subaybayan, i-review, at pamahalaan ang lahat ng blotter at community concern reports.' : 'Review, manage, and process incident blotters and community concerns.'}
        >
          <div className="grid gap-2">
            <div className="relative w-full sm:w-[190px]">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={locale === 'fil' ? 'Case No., pangalan, lokasyon' : 'Case No., name, location'}
                className="h-11 w-full pr-8 text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[color:var(--portal-ink-500)]">
                {locale === 'fil'
                  ? `Ipinapakita ang ${filteredReports.length} sa ${reports.length} kaso`
                  : `${filteredReports.length} cases | Sorted by most recent`}
              </span>
              <div className="flex items-center gap-2">
                <label htmlFor="staff-stage-filter" className="sr-only">
                  {locale === 'fil' ? 'I-filter ayon sa yugto o katayuan' : 'Filter by stage or status'}
                </label>
                <Select
                  id="staff-stage-filter"
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value as StageFilter)}
                  className="h-9 w-[190px] min-w-[190px] max-w-[190px] text-xs"
                >
                  {STAGE_OPTIONS.map((o) => {
                    const c = stageCounts[o.value];
                    return (
                      <option key={o.value} value={o.value}>
                        {o.value === 'all'
                          ? `${locale === 'fil' ? 'Lahat' : 'All'} (${c})`
                          : `${locale === 'fil' ? o.fil : o.en} (${c})`}
                      </option>
                    );
                  })}
                </Select>
                <button
                  type="button"
                  aria-label={locale === 'fil' ? 'Ipakita ang mga pending na ulat' : 'Show pending reports'}
                  title={locale === 'fil' ? 'Ipakita ang mga pending na ulat' : 'Show pending reports'}
                  onClick={() => setStageFilter('pending')}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border-0 bg-[color:var(--portal-surface-1)] text-[color:var(--portal-ink-700)] outline-none hover:bg-[color:var(--portal-border-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--portal-accent)]"
                >
                  <Filter size={16} aria-hidden />
                  {stageCounts.pending > 0 ? (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white" aria-hidden />
                  ) : null}
                </button>
              </div>
            </div>
          </div>

          {/* Cases Table */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[900px] table-fixed text-sm">
                <colgroup>
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[25%]" />
                  <col className="w-[18%]" />
                  <col className="w-[13%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-[color:var(--portal-border-soft)]">
                    <th className="px-4 py-3 text-center font-semibold text-[color:var(--portal-ink-700)]">Case No.</th>
                    <th className="px-4 py-3 text-center font-semibold text-[color:var(--portal-ink-700)]">Track</th>
                    <th className="px-4 py-3 text-center font-semibold text-[color:var(--portal-ink-700)]">Title</th>
                    <th className="px-4 py-3 text-center font-semibold text-[color:var(--portal-ink-700)]">Resident</th>
                    <th className="px-4 py-3 text-center font-semibold text-[color:var(--portal-ink-700)]">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-[color:var(--portal-ink-700)]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.length ? paginatedReports.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`border-b border-[color:var(--portal-border-soft)] ${selectedReport?.id === item.id ? 'bg-[color:var(--portal-surface-3)] font-medium' : index % 2 === 0 ? 'bg-white' : 'bg-[color:var(--portal-surface-1)]'}`}
                    >
                      <td className="truncate px-4 py-3 text-center font-mono text-xs text-[color:var(--portal-ink-600)]">
                        {formatIncidentCaseNumber(item.id, item.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${item.trackType === 'community_concern' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                            {item.trackType === 'community_concern' ? 'Concern' : 'Incident'}
                          </span>
                        </div>
                      </td>
                      <td className="truncate px-4 py-3 text-center font-semibold text-[color:var(--portal-ink-900)]" title={item.title}>{item.title}</td>
                      <td className="truncate px-4 py-3 text-center text-[color:var(--portal-ink-700)]" title={item.residentName}>{item.residentName}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge tone={statusToneFromState(item.status)}>{getReportStatusLabel(item.status, locale)}</StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button type="button" variant="ghost" onClick={() => openReview(item.id)}>
                          {isEnded(item.status) ? (locale === 'fil' ? 'Tingnan' : 'Preview') : (locale === 'fil' ? 'Suriin' : 'Review')}
                        </Button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="px-4 py-10 text-center">
                      <EmptyState title={locale === 'fil' ? 'Walang nahanap na kaso' : 'No matching cases'} description={copyText(locale, 'Adjust search or filters.', 'Ayusin ang search o filter.')} />
                    </td></tr>
                  )}
                </tbody>
            </table>
          </div>
          {filteredReports.length > 0 ? (
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-[color:var(--portal-ink-600)]">
                {locale === 'fil'
                  ? `Ipinapakita ang ${startIndex + 1}-${Math.min(endIndex, filteredReports.length)} sa ${filteredReports.length}`
                  : `Showing ${startIndex + 1}-${Math.min(endIndex, filteredReports.length)} of ${filteredReports.length}`}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1}>
                  {locale === 'fil' ? 'Nakaraan' : 'Previous'}
                </Button>
                <div className="text-sm text-[color:var(--portal-ink-600)]">{currentPage} / {totalPages}</div>
                <Button type="button" variant="ghost" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages}>
                  {locale === 'fil' ? 'Susunod' : 'Next'}
                </Button>
              </div>
            </div>
          ) : null}
        </SectionCard>

        {/* Street & Relationship management */}
        <div className="grid gap-6 md:grid-cols-2">
          <SectionCard
            title={locale === 'fil' ? `Pamamahala ng Kalsada (${streets.length})` : `Manage Barangay Streets (${streets.length})`}
            description={locale === 'fil' ? 'Lalabas sa dropdown ng lokasyon ng resident kapag nag-fill out ng blotter report.' : 'Configures options in the resident street location dropdown.'}
          >
            <div className="grid gap-3">
              <div className="flex gap-2">
                <Input
                  value={newStreetName}
                  onChange={(e) => setNewStreetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleAddStreet();
                    }
                  }}
                  placeholder={locale === 'fil' ? 'Pangalan ng Kalsada (hal. Mabini St.)' : 'Street Name (e.g. Mabini St.)'}
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="resident"
                  size="sm"
                  disabled={Boolean(streetAction) || !newStreetName.trim()}
                  className="whitespace-nowrap text-xs px-4"
                  onClick={() => void handleAddStreet()}
                >
                  {streetAction === 'adding' ? 'Adding' : locale === 'fil' ? 'Idagdag' : 'Add'}
                </Button>
              </div>
              <div className="max-h-[240px] overflow-y-auto divide-y rounded-lg border text-xs bg-white">
                {streets.length ? (
                  streets.map((st) => (
                    <div key={st.id} className="flex items-center justify-between p-3 hover:bg-gray-50/70 transition-colors">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <MapPin size={13} className={st.isActive ? 'text-emerald-600 shrink-0' : 'text-gray-400 shrink-0'} />
                        <span className={st.isActive ? 'font-medium text-gray-900 truncate' : 'line-through text-gray-400 truncate'}>{st.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${st.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                          {st.isActive ? (locale === 'fil' ? 'Aktibo' : 'Active') : (locale === 'fil' ? 'Naka-archive' : 'Archived')}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={st.isActive ? 'destructiveOutline' : 'residentOutline'}
                        className="h-7 px-3 text-xs shrink-0"
                        disabled={Boolean(streetAction)}
                        onClick={() => void handleToggleStreetArchive(st)}
                      >
                        {streetAction === `${st.id}:archiving`
                          ? (locale === 'fil' ? 'Ina-archive' : 'Archiving')
                          : streetAction === `${st.id}:restoring`
                            ? (locale === 'fil' ? 'Ibinabalik' : 'Restoring')
                            : st.isActive
                              ? (locale === 'fil' ? 'I-archive' : 'Archive')
                              : (locale === 'fil' ? 'Ibalik' : 'Restore')}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-400 text-xs">
                    {locale === 'fil' ? 'Walang kalsada.' : 'No streets configured.'}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title={locale === 'fil' ? `Pamamahala ng Relasyon (${relationships.length})` : `Manage Relationship Options (${relationships.length})`}
            description={locale === 'fil' ? 'Mga opsyon sa relasyon sa respondent sa blotter reporting intake form.' : 'Options for respondent relationship on blotter intake form.'}
          >
            <div className="grid gap-3">
              <div className="flex gap-2">
                <Input
                  value={newRelName}
                  onChange={(e) => setNewRelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleAddRelationship();
                    }
                  }}
                  placeholder={locale === 'fil' ? 'Relasyon (hal. Katrabaho)' : 'Relationship (e.g. Co-worker)'}
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="resident"
                  size="sm"
                  disabled={Boolean(relAction) || !newRelName.trim()}
                  className="whitespace-nowrap text-xs px-4"
                  onClick={() => void handleAddRelationship()}
                >
                  {relAction === 'adding' ? 'Adding' : locale === 'fil' ? 'Idagdag' : 'Add'}
                </Button>
              </div>
              <div className="max-h-[240px] overflow-y-auto divide-y rounded-lg border text-xs bg-white">
                {relationships.length ? (
                  relationships.map((rel) => (
                    <div key={rel.id} className="flex items-center justify-between p-3 hover:bg-gray-50/70 transition-colors">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Users size={13} className={rel.isActive ? 'text-emerald-600 shrink-0' : 'text-gray-400 shrink-0'} />
                        <span className={rel.isActive ? 'font-medium text-gray-900 truncate' : 'line-through text-gray-400 truncate'}>{rel.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${rel.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                          {rel.isActive ? (locale === 'fil' ? 'Aktibo' : 'Active') : (locale === 'fil' ? 'Naka-archive' : 'Archived')}
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={rel.isActive ? 'destructiveOutline' : 'residentOutline'}
                        className="h-7 px-3 text-xs shrink-0"
                        disabled={Boolean(relAction)}
                        onClick={() => void handleToggleRelArchive(rel)}
                      >
                        {relAction === `${rel.id}:archiving`
                          ? (locale === 'fil' ? 'Ina-archive' : 'Archiving')
                          : relAction === `${rel.id}:restoring`
                            ? (locale === 'fil' ? 'Ibinabalik' : 'Restoring')
                            : rel.isActive
                              ? (locale === 'fil' ? 'I-archive' : 'Archive')
                              : (locale === 'fil' ? 'Ibalik' : 'Restore')}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-400 text-xs">
                    {locale === 'fil' ? 'Walang relasyon.' : 'No relationship options configured.'}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Case review modal                                                      */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={reviewOpen} onOpenChange={(open) => (open ? setReviewOpen(true) : closeReview())}>
        {/* hideCloseButton — we render our own X in the modal header */}
        <DialogContent hideCloseButton className="max-w-[620px] max-h-[90vh] overflow-y-auto rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-0 shadow-[0_24px_70px_rgba(13,45,29,0.28)]">
          {selectedReport ? (
            <div className="grid">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-[color:var(--portal-border-soft)] px-5 py-4">
                <div className="min-w-0">
                  <p className="text-xs text-[color:var(--portal-ink-500)]">{selectedReport.residentName}</p>
                  <DialogTitle className="mt-1 text-base font-semibold text-[color:var(--portal-ink-900)]">
                    {locale === 'fil' ? 'Detalye at Pamamahala ng Kaso' : 'Case Detail and Management'}
                  </DialogTitle>
                </div>
                <button type="button" onClick={closeReview} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--portal-border-soft)] text-[color:var(--portal-ink-600)] transition-colors hover:bg-[color:var(--portal-surface-2)] hover:text-[color:var(--portal-ink-900)]" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <DialogDescription className="sr-only">Case management for {selectedReport.title}</DialogDescription>

              {/* Tabs — single navigation row, no separate stepper */}
              <div className="flex border-b bg-white px-5 pt-0 gap-0 overflow-x-auto">
                <Tab tab="details" label={locale === 'fil' ? 'Detalye' : 'Details'} />
                {!isIncidentMeeting && !isCaseEnded && <Tab tab="action" label={locale === 'fil' ? 'Resolusyon' : 'Resolution'} />}
                {isIncidentMeeting && !isCaseEnded && (
                  <>
                    <Tab tab="hearing"  label={locale === 'fil' ? 'Barangay Hearing' : 'Barangay Hearing'} />
                    <Tab tab="lupon"    label="Lupon" />
                    <Tab tab="cfa_pnp" label="CFA & PNP" />
                  </>
                )}
              </div>

              {/* ---- TAB: Details ---- */}
              {activeTab === 'details' && (
                <div className="grid gap-4 px-5 py-4 text-sm text-gray-800">
                  <p className="text-xs font-medium text-[color:var(--portal-ink-500)]">
                    {locale === 'fil' ? 'Case No.' : 'Case No.'}: {formatIncidentCaseNumber(selectedReport.id, selectedReport.createdAt)}
                    {' | '}{locale === 'fil' ? 'Iniulat' : 'Reported'}: {formatDateTime(selectedReport.createdAt, locale)}
                  </p>
                  {/* Case info card */}
                  <div className="grid gap-3 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-2)] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[color:var(--portal-ink-900)]">{selectedReport.title}</p>
                      <StatusBadge tone={statusToneFromState(selectedReport.status)}>
                        {getReportStatusLabel(selectedReport.status, locale)}
                      </StatusBadge>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <p><span className="font-semibold text-gray-700">Complainant:</span> {selectedReport.residentName}</p>
                      {selectedReport.parties?.find(p => p.role === 'respondent')?.fullName || (selectedReport as any).respondentName
                        ? <p><span className="font-semibold text-gray-700">Respondent:</span> {selectedReport.parties?.find(p => p.role === 'respondent')?.fullName ?? (selectedReport as any).respondentName}</p>
                        : null}
                      {selectedReport.relationshipToRespondent
                        ? <p><span className="font-semibold text-gray-700">Relationship:</span> {selectedReport.relationshipToRespondent}</p>
                        : null}
                      <p><span className="font-semibold text-gray-700">Location:</span> {selectedReport.location}</p>
                      <p><span className="font-semibold text-gray-700">Date of Incident:</span> {selectedReport.dateOfIncident}</p>
                      <p><span className="font-semibold text-gray-700">Category:</span> {selectedReport.kind}</p>
                      <p><span className="font-semibold text-gray-700">Desired Action:</span> {selectedReport.desiredAction === 'record_only' ? 'Record Only' : isIncidentMeeting ? 'Barangay Meeting' : 'No meeting requested'}</p>
                    </div>
                    <div className="border-t pt-3">
                      <p className="text-xs font-semibold uppercase text-gray-500 mb-1.5">Description & Statements</p>
                      <p className="leading-6 whitespace-pre-wrap text-gray-800">{selectedReport.details}</p>
                    </div>
                  </div>

                  {/* If incident meeting & no hearing scheduled yet: Schedule Hearing form right inside Details tab */}
                  {isIncidentMeeting && (!selectedReport.proceedings || selectedReport.proceedings.length === 0) && !isEnded(selectedReport.status) && selectedReport.status !== 'declined' && (
                    <div className="grid gap-4 rounded-xl border border-emerald-300 bg-emerald-50/40 p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Step 1</span>
                            <p className="font-bold text-base text-[#123726]">{locale === 'fil' ? 'I-schedule ang Barangay Hearing' : 'Schedule Barangay Hearing'}</p>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {locale === 'fil'
                              ? 'Itakda ang petsa, oras, at lugar ng pagdinig. Awtomatikong magpapadala ng opisyal na email notification sa resident pagka-schedule.'
                              : 'Set the hearing date, time, and venue. An official email notification will be sent automatically to the resident upon scheduling.'}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="grid gap-1">
                          <span className="font-semibold text-xs text-gray-700">Hearing Date *</span>
                          <Input type="date" value={hearingDate} onChange={(e) => setHearingDate(e.target.value)} />
                        </label>
                        <label className="grid gap-1">
                          <span className="font-semibold text-xs text-gray-700">Time *</span>
                          <Input type="time" value={hearingTime} onChange={(e) => setHearingTime(e.target.value)} />
                        </label>
                        <label className="grid gap-1">
                          <span className="font-semibold text-xs text-gray-700">Venue *</span>
                          <Input value={hearingVenue} onChange={(e) => setHearingVenue(e.target.value)} />
                        </label>
                      </div>
                      <label className="grid gap-1">
                        <span className="font-semibold text-xs text-gray-700">Presiding Officer</span>
                        <Input value={presidingOfficer} onChange={(e) => setPresidingOfficer(e.target.value)} placeholder="e.g., Punong Barangay / Barangay Kagawad on Duty" />
                      </label>
                      <label className="grid gap-1">
                        <span className="font-semibold text-xs text-gray-700">Agenda / Pre-hearing Notes (Optional)</span>
                        <Textarea value={hearingNotes} onChange={(e) => setHearingNotes(e.target.value)} placeholder="Topics to be discussed, summons instructions for respondent and complainant." className="min-h-[70px]" />
                      </label>

                      <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-emerald-200">
                        <Button type="button" variant="resident" disabled={isProcessing || !hearingDate} onClick={() => void handleScheduleHearing()} className="gap-2">
                          {isProcessing ? 'Scheduling' : locale === 'fil' ? 'I-schedule ang Hearing at Mag-email sa Resident' : 'Schedule Hearing & Email Resident'}
                        </Button>
                      </div>

                      {/* Decline option if invalid */}
                      <div className="border-t border-emerald-200/70 pt-3 grid gap-2">
                        <label className="grid gap-1">
                          <span className="text-xs font-medium text-gray-600">{locale === 'fil' ? 'O kaya, tanggihan ang kaso kung hindi wasto:' : 'Or decline if invalid / out of barangay jurisdiction:'}</span>
                          <div className="flex gap-2">
                            <Input value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder={locale === 'fil' ? 'Dahilan ng pagtanggi...' : 'Reason for declining...'} className="text-xs" />
                            <Button type="button" variant="destructiveOutline" disabled={isProcessing || !declineReason.trim()} onClick={() => void handleDecline()} className="whitespace-nowrap text-xs">
                              {locale === 'fil' ? 'Tanggihan' : 'Decline Case'}
                            </Button>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* If hearing is already scheduled: Show Scheduled Hearing Card in Details */}
                  {isIncidentMeeting && selectedReport.proceedings && selectedReport.proceedings.length > 0 && (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-4 grid gap-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
                          <p className="font-bold text-sm text-[#123726]">{locale === 'fil' ? 'Nai-schedule na ang Hearing' : 'Hearing Scheduled'}</p>
                        </div>
                        <Button type="button" size="sm" variant="resident" onClick={() => setActiveTab('hearing')} className="text-xs">
                          {locale === 'fil' ? 'Pumunta sa Barangay Hearing Tab →' : 'Go to Barangay Hearing Record →'}
                        </Button>
                      </div>
                      {selectedReport.proceedings.slice(-1).map((latest) => (
                        <div key={latest.id} className="text-xs text-gray-700 grid sm:grid-cols-2 gap-2 bg-white rounded-lg p-3 border border-emerald-200/60">
                          <p><span className="font-semibold text-gray-900">Session:</span> {latest.stage === 'barangay_hearing' ? 'Barangay Hearing' : 'Lupon Conciliation'} #{latest.proceedingNo}</p>
                          <p><span className="font-semibold text-gray-900">Schedule:</span> {formatDateTime(latest.scheduledAt, locale)}</p>
                          <p><span className="font-semibold text-gray-900">Venue:</span> {latest.venue}</p>
                          {latest.presidingOfficer && <p><span className="font-semibold text-gray-900">Presiding:</span> {latest.presidingOfficer}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Proceedings history */}
                  {selectedReport.proceedings?.length ? (
                    <div className="grid gap-2">
                      <h4 className="font-semibold text-[#123726] text-sm">Proceeding History ({selectedReport.proceedings.length})</h4>
                      <div className="grid gap-2">
                        {selectedReport.proceedings.map((proc, idx) => (
                          <div key={proc.id || idx} className="rounded-lg border bg-white p-3 text-xs grid gap-1.5">
                            <div className="flex justify-between font-semibold text-[#123726]">
                              <span>{proc.stage === 'barangay_hearing' ? 'Barangay Hearing' : 'Lupon Conciliation'} #{proc.proceedingNo}</span>
                              <span className="text-gray-500 font-normal">{formatDateTime(proc.scheduledAt, locale)}</span>
                            </div>
                            <p className="text-gray-600"><span className="font-medium">Venue:</span> {proc.venue}</p>
                            {proc.presidingOfficer && <p className="text-gray-600"><span className="font-medium">Presiding Officer:</span> {proc.presidingOfficer}</p>}
                            {proc.minutes && <p className="text-gray-700 bg-gray-50 rounded p-2"><span className="font-medium">Notes / Minutes:</span> {proc.minutes}</p>}
                            {proc.agreements && <p className="text-emerald-800 bg-emerald-50 rounded p-2"><span className="font-medium">Outcome / Agreement:</span> {proc.agreements}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* CFA & PNP summary */}
                  {selectedReport.cfa && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      <p className="font-semibold">Certificate to File Action (CFA) Issued</p>
                      <p className="mt-1">Cert #: {selectedReport.cfa.certificateNumber} &bull; Issued: {selectedReport.cfa.dateIssued} &bull; Recipient: {selectedReport.cfa.recipientName}</p>
                    </div>
                  )}
                  {selectedReport.pnpReferral && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                      <p className="font-semibold">Referred to Philippine National Police (PNP)</p>
                      <p className="mt-1">Unit: {selectedReport.pnpReferral.receivingUnit} &bull; Ref #: {selectedReport.pnpReferral.referenceNumber || 'N/A'} &bull; Date: {selectedReport.pnpReferral.dateReferred}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ---- TAB: Community Concern / Blotter Record ---- */}
              {activeTab === 'action' && (
                <div className="p-6 grid gap-5 text-sm">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-emerald-950">
                    <p className="font-semibold">{locale === 'fil' ? 'Walang hiniling na meeting' : 'No meeting requested'}</p>
                    <p className="mt-1 text-xs text-emerald-900">
                      {locale === 'fil'
                        ? 'Markahan bilang resolved ang incident o concern para maisara ang report.'
                        : 'Mark this incident or concern as resolved to close the report.'}
                    </p>
                  </div>
                  <Button type="button" variant="resident" disabled={isProcessing} onClick={() => void handleResolveWithoutMeeting()}>
                    {locale === 'fil' ? 'Markahang Resolved' : 'Mark as Resolved'}
                  </Button>
                </div>
              )}

              {/* ---- TAB: Barangay Hearing ---- */}
              {activeTab === 'hearing' && (
                <div className="p-6 grid gap-5 text-sm">
                  {!tabAccessible('hearing') ? (
                    <LockedStage
                      title={locale === 'fil' ? 'I-schedule muna ang Barangay Hearing sa Details tab' : 'Schedule Barangay Hearing first'}
                      hint={locale === 'fil' ? 'Pumunta sa Details tab upang magtakda ng petsa at oras ng hearing.' : 'Go to the Details tab to set the initial hearing date and time.'}
                    />
                  ) : (
                    <>
                      {/* Active hearing banner */}
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-4 text-emerald-950">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm text-[#123726]">{locale === 'fil' ? 'Yugto 1 — Pagdinig sa Barangay' : 'Stage 1 — Barangay Hearing'}</p>
                          <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">Hearing In Progress</span>
                        </div>
                        <p className="text-xs text-emerald-900 mt-1">
                          {locale === 'fil'
                            ? 'Itala ang mga napag-usapan (Minutes of the Hearing) at ang kasunduan. Kung hindi nagkasundo, itakda ang petsa para sa Lupon Conciliation meeting.'
                            : 'Record the discussion minutes and any agreements reached. If the parties do not settle, schedule the Lupon Conciliation meeting below.'}
                        </p>
                      </div>

                      {/* Scheduled info reminder */}
                      {selectedReport.proceedings?.filter(p => p.stage === 'barangay_hearing').slice(-1).map(h => (
                        <div key={h.id} className="rounded-lg border bg-gray-50 p-3 text-xs grid sm:grid-cols-3 gap-2">
                          <div><span className="text-gray-500 font-medium">Session:</span> <p className="font-semibold text-gray-900">Hearing #{h.proceedingNo}</p></div>
                          <div><span className="text-gray-500 font-medium">Date & Time:</span> <p className="font-semibold text-gray-900">{formatDateTime(h.scheduledAt, locale)}</p></div>
                          <div><span className="text-gray-500 font-medium">Venue:</span> <p className="font-semibold text-gray-900">{h.venue}</p></div>
                        </div>
                      ))}

                      {/* Record Hearing Outcome form */}
                      <div className="grid gap-4 rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#123726]">
                          {locale === 'fil' ? 'Pormularyo ng Resulta ng Pagdinig' : 'Hearing Minutes & Outcome Form'}
                        </p>

                        <label className="grid gap-1.5">
                          <span className="font-semibold text-xs text-gray-800">
                            {locale === 'fil' ? 'Mga Pinag-usapan / Minutes ng Hearing *' : 'Minutes of the Hearing / Points Discussed *'}
                          </span>
                          <Textarea
                            value={outcomeMinutes}
                            onChange={(e) => setOutcomeMinutes(e.target.value)}
                            placeholder={locale === 'fil' ? 'Isalaysay ang mga pahayag ng bawat panig, mga kaganapan, at detalye ng pagdinig...' : 'Summarize statements from each party, key points, and session highlights...'}
                            className="min-h-[110px]"
                          />
                        </label>

                        <label className="grid gap-1.5">
                          <span className="font-semibold text-xs text-gray-800">
                            {locale === 'fil' ? 'Mga Napagkasunduan / Kasunduan (Kung mayroon)' : 'Agreements Reached / Settlement Terms (If any)'}
                          </span>
                          <Textarea
                            value={outcomeAgreements}
                            onChange={(e) => setOutcomeAgreements(e.target.value)}
                            placeholder={locale === 'fil' ? 'Ilagay ang mga tiyak na napagkasunduan ng mga partido...' : 'State specific terms and commitments agreed by the parties...'}
                            className="min-h-[70px]"
                          />
                        </label>

                        <label className="grid gap-1.5">
                          <span className="font-semibold text-xs text-gray-800">{locale === 'fil' ? 'Resulta ng Pagdinig' : 'Hearing Outcome'}</span>
                          <Select value={hearingOutcome} onChange={(e: any) => setHearingOutcome(e.target.value)}>
                            <option value="settled">Settled / Nagkasundo — Resolve & Close Case</option>
                            <option value="another_hearing">Schedule Another Barangay Hearing</option>
                            <option value="not_settled">Not Settled / Hindi Nagkasundo — Escalate to Lupon Conciliation</option>
                          </Select>
                        </label>

                        {/* Extra fields if another hearing needed */}
                        {hearingOutcome === 'another_hearing' && (
                          <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3.5">
                            <p className="font-semibold text-xs text-amber-900">{locale === 'fil' ? 'Schedule para sa Susunod na Hearing' : 'Next Barangay Hearing Schedule'}</p>
                            <div className="grid sm:grid-cols-3 gap-2">
                              <label className="grid gap-1">
                                <span className="text-[11px] font-medium text-gray-700">Next Date *</span>
                                <Input type="date" value={nextHearingDate} onChange={(e) => setNextHearingDate(e.target.value)} />
                              </label>
                              <label className="grid gap-1">
                                <span className="text-[11px] font-medium text-gray-700">Next Time *</span>
                                <Input type="time" value={nextHearingTime} onChange={(e) => setNextHearingTime(e.target.value)} />
                              </label>
                              <label className="grid gap-1">
                                <span className="text-[11px] font-medium text-gray-700">Venue</span>
                                <Input value={nextHearingVenue} onChange={(e) => setNextHearingVenue(e.target.value)} />
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Extra fields if not settled: Schedule Lupon Meeting! */}
                        {hearingOutcome === 'not_settled' && (
                          <div className="grid gap-3 rounded-lg border border-purple-200 bg-purple-50/60 p-4">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-purple-700 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">Lupon Schedule</span>
                              <p className="font-bold text-xs text-purple-950">
                                {locale === 'fil' ? 'Itakda ang Petsa para sa Lupon Conciliation Meeting' : 'Set Date for Lupon Conciliation Meeting'}
                              </p>
                            </div>
                            <p className="text-[11px] text-purple-800">
                              {locale === 'fil'
                                ? 'Mag-eemail at mag-aabiso ang system sa resident tungkol sa itinakdang Lupon meeting.'
                                : 'The system will immediately email and notify the resident regarding the scheduled Lupon session.'}
                            </p>
                            <div className="grid sm:grid-cols-3 gap-2">
                              <label className="grid gap-1">
                                <span className="text-[11px] font-semibold text-purple-950">Lupon Meeting Date *</span>
                                <Input type="date" value={luponDate} onChange={(e) => setLuponDate(e.target.value)} />
                              </label>
                              <label className="grid gap-1">
                                <span className="text-[11px] font-semibold text-purple-950">Time *</span>
                                <Input type="time" value={luponTime} onChange={(e) => setLuponTime(e.target.value)} />
                              </label>
                              <label className="grid gap-1">
                                <span className="text-[11px] font-semibold text-purple-950">Venue *</span>
                                <Input value={luponVenue} onChange={(e) => setLuponVenue(e.target.value)} />
                              </label>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-2">
                              <label className="grid gap-1">
                                <span className="text-[11px] font-semibold text-purple-950">Presiding Lupon Officer</span>
                                <Input value={luponOfficer} onChange={(e) => setLuponOfficer(e.target.value)} placeholder="e.g., Lupon Chairman / Pangkat Leader" />
                              </label>
                              <label className="grid gap-1">
                                <span className="text-[11px] font-semibold text-purple-950">Agenda Notes for Lupon (Optional)</span>
                                <Input value={luponAgendaNotes} onChange={(e) => setLuponAgendaNotes(e.target.value)} placeholder="Unresolved dispute items to address..." />
                              </label>
                            </div>
                          </div>
                        )}

                        <Button type="button" variant="resident" disabled={isProcessing || !outcomeMinutes.trim()} onClick={() => void handleRecordHearingOutcome()} className="gap-2">
                          {isProcessing ? 'Saving' : locale === 'fil' ? 'I-save ang Resulta at Magpatuloy' : 'Save Outcome & Proceed'}
                        </Button>
                      </div>

                      <CloseCaseEscape note="Case resolved after Barangay Hearing stage." />
                    </>
                  )}
                </div>
              )}

              {/* ---- TAB: Lupon Conciliation ---- */}
              {activeTab === 'lupon' && (
                <div className="p-6 grid gap-5 text-sm">
                  {!tabAccessible('lupon') ? (
                    <LockedStage
                      title={locale === 'fil' ? 'Hindi pa naa-access ang Lupon Conciliation' : 'Lupon Conciliation not yet accessible'}
                      hint={locale === 'fil' ? 'Kailangan munang matapos ang Barangay Hearing na "Not Settled" bago mag-schedule ng Lupon.' : 'The Barangay Hearing must conclude as "Not Settled" to escalate to Lupon.'}
                    />
                  ) : (
                    <>
                      <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-purple-950">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm text-purple-950">Stage 2 — Lupon Conciliation (Pangkat Tagapagkasundo)</p>
                          <span className="rounded-full bg-purple-700 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">Lupon Stage</span>
                        </div>
                        <p className="text-xs text-purple-800 mt-1">
                          {locale === 'fil'
                            ? 'Itala ang mga pinag-usapan sa Lupon Conciliation session. Kung hindi nagkasundo, maaari nang mag-issue ng Certificate to File Action (CFA).'
                            : 'Record the Lupon conciliation proceedings. If conciliation fails, you can proceed to issue a Certificate to File Action (CFA).'}
                        </p>
                      </div>

                      {/* Scheduled Lupon session info */}
                      {selectedReport.proceedings?.filter(p => p.stage === 'lupon_conciliation').slice(-1).map(l => (
                        <div key={l.id} className="rounded-lg border bg-white p-3 text-xs grid sm:grid-cols-3 gap-2">
                          <div><span className="text-gray-500 font-medium">Lupon Session:</span> <p className="font-semibold text-gray-900">Session #{l.proceedingNo}</p></div>
                          <div><span className="text-gray-500 font-medium">Date & Time:</span> <p className="font-semibold text-gray-900">{formatDateTime(l.scheduledAt, locale)}</p></div>
                          <div><span className="text-gray-500 font-medium">Venue:</span> <p className="font-semibold text-gray-900">{l.venue}</p></div>
                        </div>
                      ))}

                      {/* Record Lupon Outcome form */}
                      <div className="grid gap-4 rounded-xl border border-purple-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-purple-900">
                          {locale === 'fil' ? 'Pormularyo ng Lupon Session' : 'Lupon Session Minutes & Outcome'}
                        </p>

                        <label className="grid gap-1.5">
                          <span className="font-semibold text-xs text-gray-800">
                            {locale === 'fil' ? 'Mga Pinag-usapan sa Lupon Session *' : 'Minutes of the Lupon Session / Discussion *'}
                          </span>
                          <Textarea
                            value={luponMinutes}
                            onChange={(e) => setLuponMinutes(e.target.value)}
                            placeholder={locale === 'fil' ? 'Ibuod ang mga kaganapan at diskusyon sa harap ng Lupon / Pangkat...' : 'Summarize conciliation efforts and discussions before the Lupon...'}
                            className="min-h-[110px]"
                          />
                        </label>

                        <label className="grid gap-1.5">
                          <span className="font-semibold text-xs text-gray-800">
                            {locale === 'fil' ? 'Kasunduan sa Lupon (Kung nagkasundo)' : 'Lupon Settlement Terms (If settled)'}
                          </span>
                          <Textarea
                            value={luponAgreements}
                            onChange={(e) => setLuponAgreements(e.target.value)}
                            placeholder={locale === 'fil' ? 'Itala ang napagkasunduang amicable settlement...' : 'Record amicable settlement agreement...'}
                            className="min-h-[70px]"
                          />
                        </label>

                        <label className="grid gap-1.5">
                          <span className="font-semibold text-xs text-gray-800">{locale === 'fil' ? 'Resulta ng Lupon' : 'Lupon Outcome'}</span>
                          <Select value={luponOutcome} onChange={(e: any) => setLuponOutcome(e.target.value)}>
                            <option value="settled">Settled at Lupon / Nagkasundo — Close Case</option>
                            <option value="another_session">Schedule Another Lupon Session</option>
                            <option value="not_settled">Not Settled / Failed Conciliation — Proceed to CFA / PNP</option>
                          </Select>
                        </label>

                        {luponOutcome === 'another_session' && (
                          <div className="grid gap-2 sm:grid-cols-2 rounded-lg border border-purple-200 bg-purple-50/50 p-3">
                            <label className="grid gap-1">
                              <span className="text-[11px] font-medium text-purple-950">Next Lupon Date *</span>
                              <Input type="date" value={nextLuponDate} onChange={(e) => setNextLuponDate(e.target.value)} />
                            </label>
                            <label className="grid gap-1">
                              <span className="text-[11px] font-medium text-purple-950">Next Lupon Time *</span>
                              <Input type="time" value={nextLuponTime} onChange={(e) => setNextLuponTime(e.target.value)} />
                            </label>
                          </div>
                        )}

                        <Button type="button" variant="resident" disabled={isProcessing || !luponMinutes.trim()} onClick={() => void handleRecordLuponOutcome()} className="gap-2">
                          {isProcessing ? 'Saving' : locale === 'fil' ? 'I-save ang Resulta ng Lupon' : 'Save Lupon Outcome'}
                        </Button>
                      </div>

                      <CloseCaseEscape note="Case resolved after Lupon Conciliation stage." />
                    </>
                  )}
                </div>
              )}

              {/* ---- TAB: CFA & PNP Referral ---- */}
              {activeTab === 'cfa_pnp' && (
                <div className="p-6 grid gap-5 text-sm">
                  {!tabAccessible('cfa_pnp') ? (
                    <LockedStage
                      title={locale === 'fil' ? 'Hindi pa naa-access ang CFA / PNP' : 'CFA / PNP not yet accessible'}
                      hint={locale === 'fil' ? 'Kailangan munang matapos ang Lupon Conciliation na "Not Settled" bago mag-issue ng CFA.' : 'The Lupon Conciliation must conclude as "Not Settled" before a CFA can be issued.'}
                    />
                  ) : (
                    <>
                      {/* CFA */}
                      <div className="grid gap-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                        <div>
                          <p className="font-semibold text-amber-950">Stage 3 — Certificate to File Action (CFA)</p>
                          <p className="text-xs text-amber-800 mt-1">Issue a CFA when conciliation has failed, authorizing the complainant to file a case in court.</p>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <label className="grid gap-1">
                            <span className="font-medium text-xs">Certificate Number</span>
                            <Input value={cfaCertNumber} onChange={(e) => setCfaCertNumber(e.target.value)} />
                          </label>
                          <label className="grid gap-1">
                            <span className="font-medium text-xs">Recipient Name</span>
                            <Input value={cfaRecipient} onChange={(e) => setCfaRecipient(e.target.value)} />
                          </label>
                          <label className="grid gap-1 sm:col-span-2">
                            <span className="font-medium text-xs">Issuing Authority</span>
                            <Input value={cfaIssuingAuthority} onChange={(e) => setCfaIssuingAuthority(e.target.value)} />
                          </label>
                        </div>
                        <Button type="button" variant="resident" disabled={isProcessing || !cfaCertNumber.trim()} onClick={() => void handleIssueCfa()}>
                          Issue Certificate to File Action
                        </Button>
                      </div>

                      {/* PNP Referral */}
                      <div className="grid gap-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                        <div>
                          <p className="font-semibold text-blue-950">Stage 4 — Referral to PNP</p>
                          <p className="text-xs text-blue-800 mt-1">Turn over case records to the Philippine National Police after barangay proceedings conclude.</p>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <label className="grid gap-1">
                            <span className="font-medium text-xs">Receiving Police Unit</span>
                            <Input value={pnpReceivingUnit} onChange={(e) => setPnpReceivingUnit(e.target.value)} />
                          </label>
                          <label className="grid gap-1">
                            <span className="font-medium text-xs">Police Reference Number (Optional)</span>
                            <Input value={pnpRefNumber} onChange={(e) => setPnpRefNumber(e.target.value)} placeholder="Ref #" />
                          </label>
                          <label className="grid gap-1 sm:col-span-2">
                            <span className="font-medium text-xs">Referral Notes (Optional)</span>
                            <Textarea value={pnpNotes} onChange={(e) => setPnpNotes(e.target.value)} placeholder="Additional notes for the receiving PNP unit." className="min-h-[70px]" />
                          </label>
                        </div>
                        <Button type="button" variant="secondary" disabled={isProcessing || !pnpReceivingUnit.trim()} onClick={() => void handleReferToPnp()}>
                          Refer Case to PNP & Conclude Barangay Action
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between rounded-b-[24px] border-t border-[color:var(--portal-border-soft)] bg-white px-5 py-4">
                <p className="text-xs text-gray-500">{locale === 'fil' ? 'Opisyal na Dokumentasyon' : 'Official Case Documentation'}</p>
                {isEnded(selectedReport.status) ? (
                  <Button type="button" variant="resident" size="sm" onClick={() => setDocumentModalOpen(true)} className="gap-1.5 text-xs">
                    <FileText size={14} />
                    {locale === 'fil' ? 'I-generate ang Official Report (PDF)' : 'Generate Official Report (PDF)'}
                  </Button>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    {locale === 'fil' ? 'Maibibuo ang PDF kapag natapos na ang kaso.' : 'PDF available once the case is ended.'}
                  </p>
                )}
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
