'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FormFeedback, PageGuide } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/formatters';
import { addFeedback } from '@/lib/frontend-data/store';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { copyText } from '@/features/resident/model/copy';
import { getResidentCompletedRequests, getResidentFeedback } from '@/features/resident/model/selectors';
import { ResidentScrollTable, ResidentSection } from '@/features/resident/view/resident-primitives';
import { ResidentShell } from '@/features/resident/view/resident-shell';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';

export default function ResidentFeedbackPage() {
  const { state, user, locale } = useAppState();
  const [requestId, setRequestId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const pageCopy = getRolePageCopy('resident/request-feedback');

  const completedRequests = useMemo(() => getResidentCompletedRequests(state, user?.id), [state, user?.id]);
  useEffect(() => {
    const requestedId = new URLSearchParams(window.location.search).get('requestId');
    if (requestedId && completedRequests.some((item) => item.id === requestedId)) {
      setRequestId(requestedId);
    }
  }, [completedRequests]);

  const myFeedback = useMemo(() => getResidentFeedback(state, user?.id), [state, user?.id]);
  const requestIndex = useMemo(
    () => new Map(state.documentRequests.map((request) => [request.id, request])),
    [state.documentRequests]
  );

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requestId || isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await addFeedback({ requestId, rating, comment });
      setComment('');
      setFeedback({
        tone: 'success',
        text: copyText(locale, 'Feedback submitted successfully.', 'Matagumpay na naipadala ang feedback.'),
      });
    } catch {
      setFeedback({
        tone: 'error',
        text: copyText(locale, 'Unable to submit feedback. Please try again.', 'Hindi naipadala ang feedback. Pakisubukan muli.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResidentShell title={pageCopy.title} description={pageCopy.description} showHero={false}>
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
        title={copyText(locale, 'Submit Feedback', 'Magbigay ng Puna')}
        description={copyText(locale, 'Rate completed transactions so the barangay team can improve service quality.', 'I-rate ang natapos na transaksyon para mapahusay ang kalidad ng serbisyo.')}
      >
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Completed Request', 'Natapos na Kahilingan')}</span>
            <Select value={requestId} onChange={(event) => setRequestId(event.target.value)} required>
              <option value="">{copyText(locale, 'Select request', 'Pumili ng kahilingan')}</option>
              {completedRequests.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.referenceNumber} - {item.typeLabel}
                </option>
              ))}
            </Select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Rating (1-5)', 'Rating (1-5)')}</span>
            <Input type="number" min={1} max={5} value={rating} onChange={(event) => setRating(Number(event.target.value))} />
          </label>

          <label className="md:col-span-2 grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Comment (optional)', 'Komento (opsyonal)')}</span>
            <Textarea value={comment} onChange={(event) => setComment(event.target.value)} className="min-h-[100px]" />
          </label>

          {feedback ? (
            <div className="md:col-span-2">
              <FormFeedback tone={feedback.tone} text={feedback.text} />
            </div>
          ) : null}

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" variant="resident" disabled={isSubmitting}>
              {isSubmitting
                ? copyText(locale, 'Submitting', 'Ipinapadala')
                : copyText(locale, 'Submit Feedback', 'Ipadala ang Puna')}
            </Button>
          </div>
        </form>
      </ResidentSection>

      <ResidentSection
        title={copyText(locale, 'My Feedback', 'Mga Puna Ko')}
        description={copyText(locale, 'Review what you already submitted.', 'Tingnan ang mga naipasa mo nang puna.')}
      >
        <ResidentScrollTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copyText(locale, 'Request', 'Kahilingan')}</TableHead>
                <TableHead>{copyText(locale, 'Rating', 'Rating')}</TableHead>
                <TableHead>{copyText(locale, 'Comment', 'Komento')}</TableHead>
                <TableHead>{copyText(locale, 'Date', 'Petsa')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myFeedback.map((item) => {
                const request = item.requestId ? requestIndex.get(item.requestId) : undefined;
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      {request
                        ? `${request.referenceNumber} - ${request.typeLabel}`
                        : copyText(locale, 'Assistant Feedback', 'Feedback sa Assistant')}
                    </TableCell>
                    <TableCell>{item.rating}</TableCell>
                    <TableCell>{item.comment ?? '-'}</TableCell>
                    <TableCell>{formatDateTime(item.createdAt, locale)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ResidentScrollTable>
      </ResidentSection>
    </ResidentShell>
  );
}
