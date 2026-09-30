'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Building2, FileText, CheckCircle2 } from 'lucide-react';
import { PageGuide, StatusBadge, statusToneFromState, EmptyState, SectionCard } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { formatDateTime, formatIncidentCaseNumber, getReportStatusLabel } from '@/lib/formatters';
import { submitReport } from '@/lib/frontend-data/store';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { copyText } from '@/features/resident/model/copy';
import { getResidentReports } from '@/features/resident/model/selectors';
import { ResidentSection } from '@/features/resident/view/resident-primitives';
import { ResidentShell } from '@/features/resident/view/resident-shell';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import type { CaseParty, IncidentReport } from '@/lib/types/models';
import CaseReportDocumentModal from '@/components/case-report-document-modal';

type TrackType = 'community_concern' | 'incident';
type DesiredAction = 'record_only' | 'request_meeting';

const BARANGAY_STREETS = [
  'Main Street',
  'Rizal Street',
  'Bonifacio Street',
  'Magsaysay Avenue',
  'Aguinaldo Highway',
  'Luna Street',
  'Del Pilar Street',
  'P. Burgos Street',
  'Sampaguita Street',
  'Iba pang Kalsada / Outside Street',
];

const RELATIONSHIP_OPTIONS = [
  { value: 'Kapitbahay / Neighbor', en: 'Neighbor', fil: 'Kapitbahay' },
  { value: 'Kamag-anak / Relative', en: 'Relative', fil: 'Kamag-anak' },
  { value: 'Tenant / Renter / Landlord', en: 'Tenant / Landlord', fil: 'Umuupa / Landlord' },
  { value: 'Kakilala / Acquaintance', en: 'Acquaintance', fil: 'Kakilala' },
  { value: 'Hindi Kilala / Stranger', en: 'Stranger', fil: 'Hindi Kilala' },
  { value: 'Kasamahan sa Trabaho / Co-worker', en: 'Co-worker', fil: 'Kasamahan sa Trabaho' },
  { value: 'Iba pa / Other', en: 'Other', fil: 'Iba pa' },
];

export default function ResidentBlotterReportingPage() {
  const { state, user, locale } = useAppState();
  const pageCopy = getRolePageCopy('resident/blotter-reporting');

  // Track & Intent
  const [trackType, setTrackType] = useState<TrackType>('community_concern');
  const [desiredAction, setDesiredAction] = useState<DesiredAction>('request_meeting');

  // Basic Form
  const [category, setCategory] = useState('');
  const [otherCategoryText, setOtherCategoryText] = useState('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  
  // Location Fields (Structured)
  const [streetName, setStreetName] = useState(BARANGAY_STREETS[0]);
  const [specificLocation, setSpecificLocation] = useState('');

  // Incident Specific (Parties & Relationship)
  const [complainantName, setComplainantName] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [relationshipToRespondent, setRelationshipToRespondent] = useState(RELATIONSHIP_OPTIONS[0].value);
  const [witnesses, setWitnesses] = useState('');

  // UI & Feedback
  const [submissionToast, setSubmissionToast] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const myReports = useMemo(() => getResidentReports(state, user?.id), [state, user?.id]);
  const incidentCategories = useMemo(
    () =>
      state.incidentCategories
        .filter((item) => item.isActive)
        .sort((a, b) => (a.sortOrder === b.sortOrder ? a.name.localeCompare(b.name) : a.sortOrder - b.sortOrder)),
    [state.incidentCategories]
  );
  const isOthersCategory = category.trim().toLowerCase() === 'others';

  useEffect(() => {
    if (user && !complainantName) {
      setComplainantName(user.fullName);
    }
  }, [user, complainantName]);

  useEffect(() => {
    if (!incidentCategories.length) return;
    if (!category || !incidentCategories.some((item) => item.name === category)) {
      setCategory(incidentCategories[0].name);
    }
  }, [category, incidentCategories]);

  useEffect(() => {
    if (!submissionToast) return;
    const timeoutId = window.setTimeout(() => setSubmissionToast(null), 7000);
    return () => window.clearTimeout(timeoutId);
  }, [submissionToast]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const fullLocation = `${streetName}${specificLocation.trim() ? `, ${specificLocation.trim()}` : ''}`;
      const parties: CaseParty[] = [];
      if (trackType === 'incident') {
        if (complainantName.trim()) {
          parties.push({ role: 'complainant', fullName: complainantName.trim() });
        }
        if (respondentName.trim()) {
          parties.push({
            role: 'respondent',
            fullName: respondentName.trim(),
            relationship: relationshipToRespondent,
          });
        }
        if (witnesses.trim()) {
          parties.push({ role: 'witness', fullName: witnesses.trim() });
        }
      }

      await submitReport({
        trackType,
        desiredAction: trackType === 'incident' ? desiredAction : 'none',
        category: trackType === 'incident' ? category : undefined,
        title,
        details,
        streetName,
        specificLocation,
        location: fullLocation,
        dateOfIncident: new Date().toISOString().slice(0, 10),
        relationshipToRespondent: trackType === 'incident' ? relationshipToRespondent : undefined,
        otherCategoryText: isOthersCategory && trackType === 'incident' ? otherCategoryText : undefined,
        parties: parties.length ? parties : undefined,
      });

      setTitle('');
      setDetails('');
      setSpecificLocation('');
      setRespondentName('');
      setWitnesses('');
      setOtherCategoryText('');

      setSubmissionToast(
        copyText(
          locale,
          trackType === 'community_concern'
            ? 'Your community concern has been submitted to the barangay.'
            : desiredAction === 'record_only'
            ? 'Incident blotter report saved for recording only.'
            : 'Incident report submitted and awaiting barangay review.',
          trackType === 'community_concern'
            ? 'Naipadala na ang iyong ulat ng problema sa barangay.'
            : desiredAction === 'record_only'
            ? 'Naitala na ang insidente sa barangay blotter.'
            : 'Naipadala na ang ulat ng insidente para sa barangay review.'
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResidentShell title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {submissionToast ? (
        <div className="pointer-events-none fixed left-1/2 top-6 z-50 flex w-[min(92vw,760px)] -translate-x-1/2 justify-center">
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-auto w-full rounded-2xl border border-emerald-200/70 bg-[linear-gradient(145deg,#0f5132_0%,#146c43_100%)] px-4 py-3 text-emerald-50 shadow-[0_16px_36px_rgba(8,49,30,0.45)] backdrop-blur"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                ✓
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-5">
                  {copyText(locale, 'Report submitted successfully', 'Matagumpay na naipadala ang ulat')}
                </p>
                <p className="mt-1 text-sm leading-5 text-emerald-50/95">{submissionToast}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pageCopy.guide ? (
        <PageGuide
          tone="resident"
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}

      <div className="grid gap-6">
        {/* Step 1: Select Reporting Track */}
        <ResidentSection
          title={copyText(locale, '1. Select Concern Type', '1. Pumili ng Uri ng Ulat')}
          description={copyText(
            locale,
            'Choose whether you are reporting a public place/facility issue or a person-to-person incident.',
            'Pumili kung ito ay problema sa lugar/pasilidad o insidente sa pagitan ng tao.'
          )}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTrackType('community_concern')}
              className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                trackType === 'community_concern'
                  ? 'border-[#123726] bg-[color:var(--portal-surface-2)] shadow-sm ring-2 ring-[#123726]/30'
                  : 'border-[color:var(--portal-border-soft)] bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-[#123726]">
                  <Building2 size={20} className="text-[#123726]" />
                  {copyText(locale, 'Community Concern', 'Community Concern')}
                </div>
                {trackType === 'community_concern' ? <CheckCircle2 size={18} className="text-[#123726]" /> : null}
              </div>
              <p className="text-xs leading-5 text-gray-600">
                {copyText(
                  locale,
                  'Physical/environmental problem in your area (e.g. fallen branch, broken streetlight, clogged canal, road holes). Requires barangay crew action.',
                  'Problema sa lugar tulad ng naputol na sanga, sirang streetlight, baradong kanal, o sirang daan. Aksyon ng tauhan ng barangay ang kailangan.'
                )}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTrackType('incident')}
              className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                trackType === 'incident'
                  ? 'border-[#123726] bg-[color:var(--portal-surface-2)] shadow-sm ring-2 ring-[#123726]/30'
                  : 'border-[color:var(--portal-border-soft)] bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-[#123726]">
                  <FileText size={20} className="text-[#123726]" />
                  {copyText(locale, 'Incident / Blotter Report', 'Incident / Blotter Report')}
                </div>
                {trackType === 'incident' ? <CheckCircle2 size={18} className="text-[#123726]" /> : null}
              </div>
              <p className="text-xs leading-5 text-gray-600">
                {copyText(
                  locale,
                  'Incident involving persons (e.g. neighborhood dispute, disturbance, harassment, property disagreement). Includes Who/What/When/Where.',
                  'Insidente na involve ang ibang tao (hal. away-kapitbahay, disturbance, harassment, boundary dispute). May detalye ng tao at insidente.'
                )}
              </p>
            </button>
          </div>
        </ResidentSection>

        {/* Step 2: Form Details */}
        <ResidentSection
          title={
            trackType === 'community_concern'
              ? copyText(locale, '2. Community Concern Details', '2. Detalye ng Community Concern')
              : copyText(locale, '2. Incident / Blotter Details', '2. Detalye ng Incident / Blotter')
          }
          description={copyText(
            locale,
            'Fill out the required information accurately.',
            'Punan nang tumpak ang mga kinakailangang detalye.'
          )}
        >
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            {/* Category dropdown ONLY shown for Incident / Blotter */}
            {trackType === 'incident' ? (
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-medium text-[#123726]">{copyText(locale, 'Incident Category', 'Kategorya ng Insidente')}</span>
                <Select value={category} onChange={(event) => setCategory(event.target.value)} required>
                  {incidentCategories.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}

            {isOthersCategory && trackType === 'incident' ? (
              <label className="grid gap-2 text-sm md:col-span-2">
                <span className="font-medium text-[#123726]">{copyText(locale, 'Specify Category', 'Tukuyin ang Kategorya')}</span>
                <Input
                  value={otherCategoryText}
                  onChange={(event) => setOtherCategoryText(event.target.value)}
                  required
                  placeholder={copyText(locale, 'Specify category details', 'Tukuyin ang detalye ng kategorya')}
                />
              </label>
            ) : null}

            <label className="grid gap-2 text-sm md:col-span-2">
              <span className="font-medium text-[#123726]">{copyText(locale, 'Title / Summary', 'Pamagat / Buod')}</span>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                placeholder={
                  trackType === 'community_concern'
                    ? copyText(locale, 'e.g., Fallen tree branch on Main St.', 'hal. Naputol na sanga sa Main St.')
                    : copyText(locale, 'e.g., Altercation with neighbor', 'hal. Away ng magkakapitbahay')
                }
              />
            </label>

            {/* Location Section: Street Dropdown + Typable Place Box */}
            <div className="md:col-span-2 grid gap-3 rounded-xl border border-[color:var(--portal-border-soft)] bg-[#f8faf8] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#123726]">
                📍 {copyText(locale, 'Location Details', 'Detalye ng Lokasyon')}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-gray-700">{copyText(locale, 'Street (Kalsada)', 'Kalsada / Street')}</span>
                  <Select value={streetName} onChange={(e) => setStreetName(e.target.value)}>
                    {BARANGAY_STREETS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-gray-700">
                    {copyText(locale, 'Residence / Purok / Landmark', 'Tirahan / Purok / Landmark')}
                  </span>
                  <Input
                    value={specificLocation}
                    onChange={(e) => setSpecificLocation(e.target.value)}
                    required
                    placeholder={copyText(locale, 'e.g., House #12, Purok 3, Near Chapel', 'hal. House #12, Purok 3, Malapit sa Kapilya')}
                  />
                </label>
              </div>
            </div>

            {/* Additional Fields for Incident / Blotter */}
            {trackType === 'incident' ? (
              <div className="md:col-span-2 grid gap-4 rounded-xl border border-[color:var(--portal-border-soft)] bg-[#f8faf8] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#123726]">
                  👥 {copyText(locale, 'WHO - People Involved', 'WHO - Mga Taong Involve')}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-gray-700">{copyText(locale, 'Reporter / Complainant', 'Reporter / Complainant')}</span>
                    <Input value={complainantName} onChange={(e) => setComplainantName(e.target.value)} required />
                  </label>

                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-gray-700">{copyText(locale, 'Respondent (Involved Person)', 'Respondent (Nire-report na Tao)')}</span>
                    <Input
                      value={respondentName}
                      onChange={(e) => setRespondentName(e.target.value)}
                      required
                      placeholder={copyText(locale, 'Name of person being reported', 'Pangalan ng nire-report na tao')}
                    />
                  </label>

                  {/* Relationship Field */}
                  <label className="grid gap-1.5 text-sm sm:col-span-2">
                    <span className="font-medium text-gray-700">
                      {copyText(locale, 'Relationship to Person Reported', 'Relasyon sa Nire-report na Tao')}
                    </span>
                    <Select
                      value={relationshipToRespondent}
                      onChange={(e) => setRelationshipToRespondent(e.target.value)}
                    >
                      {RELATIONSHIP_OPTIONS.map((rel) => (
                        <option key={rel.value} value={rel.value}>
                          {locale === 'fil' ? rel.fil : rel.en} ({rel.value})
                        </option>
                      ))}
                    </Select>
                  </label>

                  <label className="sm:col-span-2 grid gap-1.5 text-sm">
                    <span className="font-medium text-gray-700">{copyText(locale, 'Witnesses / Other Persons (Optional)', 'Mga Saksi / Iba Pang Tao (Optional)')}</span>
                    <Input
                      value={witnesses}
                      onChange={(e) => setWitnesses(e.target.value)}
                      placeholder={copyText(locale, 'Names or contact details of witnesses', 'Mga pangalan o contact number ng saksi')}
                    />
                  </label>
                </div>
              </div>
            ) : null}

            <label className="md:col-span-2 grid gap-2 text-sm">
              <span className="font-medium text-[#123726]">
                {trackType === 'community_concern'
                  ? copyText(locale, 'Description & Circumstances', 'Deskripsyon at Detalye')
                  : copyText(locale, 'Incident Description & Statements', 'Buong Deskripsyon at Pahayag')}
              </span>
              <Textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                required
                className="min-h-[120px]"
                placeholder={
                  trackType === 'community_concern'
                    ? copyText(locale, 'Describe the problem in detail...', 'Ilarawan ang problema sa lugar...')
                    : copyText(locale, 'Describe what happened, circumstances, and statements...', 'Ilarawan ang buong nangyari...')
                }
              />
            </label>

            {/* Step 3: Desired Action Selection for Incident */}
            {trackType === 'incident' ? (
              <div className="md:col-span-2 grid gap-3 rounded-xl border border-[color:var(--portal-border-soft)] bg-white p-4 shadow-sm">
                <p className="text-[#123726] font-semibold text-sm">
                  {copyText(locale, 'How would you like to proceed?', 'Paano mo gustong i-handle ang ulat?')}
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label
                    className={`flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-all ${
                      desiredAction === 'record_only'
                        ? 'border-[#123726] bg-[color:var(--portal-surface-2)] ring-1 ring-[#123726]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="desiredAction"
                      value="record_only"
                      checked={desiredAction === 'record_only'}
                      onChange={() => setDesiredAction('record_only')}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#123726]">
                        {copyText(locale, 'Record Incident Only (Blotter Entry)', 'I-record lang sa Blotter')}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {copyText(
                          locale,
                          'Documented in official barangay blotter for record purposes. No formal meeting will be called.',
                          'I-re-record lang sa official blotter. Walang ipatatawag na pagdinig sa ngayon.'
                        )}
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-all ${
                      desiredAction === 'request_meeting'
                        ? 'border-[#123726] bg-[color:var(--portal-surface-2)] ring-1 ring-[#123726]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="desiredAction"
                      value="request_meeting"
                      checked={desiredAction === 'request_meeting'}
                      onChange={() => setDesiredAction('request_meeting')}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#123726]">
                        {copyText(locale, 'Request Barangay Meeting / Proceeding', 'Humingi ng Barangay Hearing / Meeting')}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {copyText(
                          locale,
                          'The barangay will review the case and call involved parties for a hearing or conciliation.',
                          'Suriin ng barangay ang kaso at ipatatawag ang mga involve na tao para sa pagdinig.'
                        )}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            ) : null}

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" variant="resident" disabled={isSubmitting}>
                {isSubmitting
                  ? copyText(locale, 'Submitting...', 'Ipinapadala...')
                  : copyText(locale, 'Submit Report', 'Ipadala ang Ulat')}
              </Button>
            </div>
          </form>
        </ResidentSection>

        {/* Step 4: Resident Reports History & Case Tracker */}
        <ResidentSection
          title={copyText(locale, 'My Reported Concerns & Cases', 'Mga Inulat Kong Problema at Kaso')}
          description={copyText(
            locale,
            'Track updates, status, and proceeding history of your submitted reports.',
            'Subaybayan ang estado at kasaysayan ng iyong mga naisumiteng ulat.'
          )}
        >
          {myReports.length ? (
            <div className="overflow-x-auto rounded-xl border border-[color:var(--portal-border-soft)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[color:var(--portal-surface-2)] border-b border-[color:var(--portal-border-soft)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-[#123726]">{copyText(locale, 'Case No.', 'Kaso No.')}</th>
                    <th className="px-4 py-3 font-semibold text-[#123726]">{copyText(locale, 'Type & Title', 'Uri at Pamagat')}</th>
                    <th className="px-4 py-3 font-semibold text-[#123726]">{copyText(locale, 'Location', 'Lokasyon')}</th>
                    <th className="px-4 py-3 font-semibold text-[#123726]">{copyText(locale, 'Status', 'Estado')}</th>
                    <th className="px-4 py-3 font-semibold text-[#123726]">{copyText(locale, 'Date', 'Petsa')}</th>
                    <th className="px-4 py-3 font-semibold text-[#123726]">{copyText(locale, 'Action', 'Aksyon')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {myReports.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">
                        {formatIncidentCaseNumber(item.id, item.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                            {item.trackType === 'community_concern'
                              ? copyText(locale, 'Concern', 'Concern')
                              : item.desiredAction === 'record_only'
                              ? copyText(locale, 'Blotter Record', 'Blotter Record')
                              : copyText(locale, 'Incident', 'Incident')}
                          </span>
                          <span className="font-medium text-gray-900 line-clamp-1">{item.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.location}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={statusToneFromState(item.status)}>
                          {getReportStatusLabel(item.status, locale)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(item.createdAt, locale)}</td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="residentOutline"
                          onClick={() => {
                            setSelectedReport(item);
                            setDetailsOpen(true);
                          }}
                        >
                          {copyText(locale, 'View Details', 'Tingnan')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={copyText(locale, 'No reports submitted yet', 'Wala pang naisumiteng ulat')}
              description={copyText(
                locale,
                'When you report a community concern or incident, it will appear here for tracking.',
                'Kapag nag-ulat ka ng problema o insidente, lalabas ito rito para masubaybayan.'
              )}
            />
          )}
        </ResidentSection>
      </div>

      {/* Details & Proceedings History Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
          {selectedReport ? (
            <div className="grid gap-5">
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <p className="font-mono text-xs text-gray-500 uppercase">
                    {formatIncidentCaseNumber(selectedReport.id, selectedReport.createdAt)}
                  </p>
                  <DialogTitle className="text-xl font-semibold text-[#123726] mt-1">{selectedReport.title}</DialogTitle>
                  <DialogDescription className="mt-1 text-xs text-gray-500">
                    {formatDateTime(selectedReport.createdAt, locale)}
                  </DialogDescription>
                </div>
                <StatusBadge tone={statusToneFromState(selectedReport.status)}>
                  {getReportStatusLabel(selectedReport.status, locale)}
                </StatusBadge>
              </div>

              {/* Case Details Card */}
              <div className="grid gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <p><strong className="text-gray-700">{copyText(locale, 'Type', 'Uri')}:</strong> {selectedReport.trackType === 'community_concern' ? 'Community Concern' : 'Incident / Blotter'}</p>
                  <p><strong className="text-gray-700">{copyText(locale, 'Location', 'Lokasyon')}:</strong> {selectedReport.location}</p>
                  {selectedReport.relationshipToRespondent ? (
                    <p><strong className="text-gray-700">{copyText(locale, 'Relationship', 'Relasyon sa Nire-report')}:</strong> {selectedReport.relationshipToRespondent}</p>
                  ) : null}
                  {selectedReport.desiredAction ? (
                    <p><strong className="text-gray-700">{copyText(locale, 'Resident Request', 'Hiling ng Resident')}:</strong> {selectedReport.desiredAction === 'record_only' ? 'Record Only' : selectedReport.desiredAction === 'request_meeting' ? 'Barangay Meeting' : 'N/A'}</p>
                  ) : null}
                </div>

                <div className="mt-2 border-t pt-3">
                  <p className="font-semibold text-gray-800 text-xs uppercase tracking-wide">{copyText(locale, 'Description / Details', 'Buong Deskripsyon')}</p>
                  <p className="mt-1 text-gray-700 whitespace-pre-wrap">{selectedReport.details}</p>
                </div>
              </div>

              {/* Proceedings Timeline */}
              {selectedReport.proceedings?.length ? (
                <div className="grid gap-3">
                  <h4 className="font-semibold text-[#123726] text-sm uppercase tracking-wide">
                    {copyText(locale, 'Case Proceedings History', 'Kasaysayan ng Pagdinig')}
                  </h4>
                  <div className="grid gap-3 border-l-2 border-[#123726] pl-4">
                    {selectedReport.proceedings.map((proc, index) => (
                      <div key={proc.id || index} className="rounded-lg border bg-white p-3 shadow-xs">
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-sm text-[#123726]">
                            {proc.stage === 'barangay_hearing'
                              ? `${copyText(locale, 'Barangay Hearing', 'Pagdinig sa Barangay')} #${proc.proceedingNo}`
                              : `${copyText(locale, 'Lupon Conciliation', 'Lupon Conciliation')} #${proc.proceedingNo}`}
                          </p>
                          <span className="text-xs text-gray-500">{formatDateTime(proc.scheduledAt, locale)}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1"><strong>{copyText(locale, 'Venue', 'Lugar')}:</strong> {proc.venue}</p>
                        {proc.agreements ? (
                          <p className="text-xs text-emerald-800 bg-emerald-50 p-2 rounded mt-2">
                            <strong>{copyText(locale, 'Agreement / Outcome', 'Kasunduan / Resulta')}:</strong> {proc.agreements}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* CFA & PNP Referral Badges if issued */}
              {selectedReport.cfa ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-semibold">📜 {copyText(locale, 'Certificate to File Action (CFA) Issued', 'Na-issue na ang CFA')}</p>
                  <p className="mt-1">Cert #: {selectedReport.cfa.certificateNumber} • Date Issued: {selectedReport.cfa.dateIssued}</p>
                </div>
              ) : null}

              {selectedReport.pnpReferral ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                  <p className="font-semibold">👮 {copyText(locale, 'Referred to Philippine National Police (PNP)', 'Inilipat sa PNP')}</p>
                  <p className="mt-1">Receiving Unit: {selectedReport.pnpReferral.receivingUnit} • Ref #: {selectedReport.pnpReferral.referenceNumber || 'N/A'}</p>
                </div>
              ) : null}

              {/* Action Button: Generate Printable Report Document */}
              <div className="mt-3 border-t pt-4 flex justify-end">
                <Button
                  type="button"
                  variant="resident"
                  onClick={() => setDocumentModalOpen(true)}
                  className="gap-2 text-xs"
                >
                  📄 {copyText(locale, 'Generate Official Case Document Report (PDF)', 'I-generate ang Opisyal na Report Document (PDF)')}
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
    </ResidentShell>
  );
}
