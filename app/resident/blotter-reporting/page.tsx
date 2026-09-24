'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { PageGuide, StatusBadge, statusToneFromState } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime, formatIncidentCaseNumber, getReportStatusLabel } from '@/lib/formatters';
import { submitReport } from '@/lib/frontend-data/store';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { copyText } from '@/features/resident/model/copy';
import { getResidentReports } from '@/features/resident/model/selectors';
import { ResidentScrollTable, ResidentSection } from '@/features/resident/view/resident-primitives';
import { ResidentShell } from '@/features/resident/view/resident-shell';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';

export default function ResidentBlotterReportingPage() {
  const { state, user, locale } = useAppState();
  const [category, setCategory] = useState('');
  const [otherCategoryText, setOtherCategoryText] = useState('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [location, setLocation] = useState('');
  const [dateOfIncident, setDateOfIncident] = useState(new Date().toISOString().slice(0, 10));
  const [submissionToast, setSubmissionToast] = useState<string | null>(null);
  const pageCopy = getRolePageCopy('resident/blotter-reporting');

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
    await submitReport({
      category,
      title,
      details,
      location,
      dateOfIncident,
      otherCategoryText: isOthersCategory ? otherCategoryText : undefined,
    });
    setTitle('');
    setDetails('');
    setLocation('');
    setOtherCategoryText('');
    setSubmissionToast(
      copyText(
        locale,
        'Your incident report has been submitted and is now awaiting review.',
        'Naipadala na ang iyong ulat ng insidente at naghihintay na ito ng review.'
      )
    );
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
                  {copyText(locale, 'Incident report submitted successfully', 'Matagumpay na naipadala ang ulat ng insidente')}
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
      <ResidentSection
        title={copyText(locale, 'Submit New Report', 'Magsumite ng Bagong Ulat')}
        description={copyText(locale, 'Provide complete details for faster case handling.', 'Magbigay ng kumpletong detalye para mas mabilis maaksyunan ang kaso.')}
      >
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Category', 'Kategorya')}</span>
            <Select value={category} onChange={(event) => setCategory(event.target.value)} required>
              {incidentCategories.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label>

          {isOthersCategory ? (
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[color:#123726]">{copyText(locale, 'Others (required)', 'Iba pa (kailangan)')}</span>
              <Input
                value={otherCategoryText}
                onChange={(event) => setOtherCategoryText(event.target.value)}
                required
                className="rounded-none border-0 border-b border-[color:#123726] bg-transparent px-0 focus-visible:ring-0"
                placeholder={copyText(locale, 'Specify category', 'Tukuyin ang kategorya')}
              />
            </label>
          ) : null}

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Title', 'Pamagat')}</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Location', 'Lokasyon')}</span>
            <Input value={location} onChange={(event) => setLocation(event.target.value)} required />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Date of incident', 'Petsa ng insidente')}</span>
            <Input type="date" value={dateOfIncident} onChange={(event) => setDateOfIncident(event.target.value)} required />
          </label>

          <label className="md:col-span-2 grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Details', 'Mga Detalye')}</span>
            <Textarea value={details} onChange={(event) => setDetails(event.target.value)} required className="min-h-[120px]" />
          </label>

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" variant="resident">
              {copyText(locale, 'Submit Report', 'Ipadala ang Ulat')}
            </Button>
          </div>
        </form>
      </ResidentSection>
    </ResidentShell>
  );
}
