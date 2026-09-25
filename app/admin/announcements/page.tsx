'use client';

import { FormEvent, useState, useMemo, useEffect, useRef } from 'react';
import { isAnnouncementActiveWindow } from '@/lib/announcements/schedule';
import { FieldLabel, PageGuide, SectionCard, StatusBadge, FormFeedback } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import { formatDateTime } from '@/lib/formatters';
import type { Announcement } from '@/lib/types/models';
import PortalShell from '../../../components/portal-shell';
import { deleteAnnouncement, upsertAnnouncement } from '../../../lib/frontend-data/store';
import { useAppState } from '../../../lib/frontend-data/use-app-state';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

// Removed schedule draft type; using end datetime instead


function padTwo(value: number) {
  return String(value).padStart(2, '0');
}



// No explicit start time; start is set to current time on submit

// Helper constant
const ONE_HOUR_MS = 60 * 60 * 1000;

// Default end time (24 hours from now) in ISO string
function getDefaultEndAtISO(): string {
  const end = new Date(Date.now() + 24 * ONE_HOUR_MS);
  return end.toISOString();
}

// Helper to format ISO for datetime-local input
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Helper to get current datetime in format suitable for datetime-local input
function getNowLocalInput(): string {
  return isoToLocalInput(new Date().toISOString());
}


// Helper to compute end datetime ISO from duration hours
function calculateEndAtFromDuration(durationHours: number): string {
  const end = new Date(Date.now() + durationHours * ONE_HOUR_MS);
  return end.toISOString();
}

function getDurationHoursFromAnnouncement(item: Announcement): number {
  if (!item.endAt) return 24;
  const start = new Date(item.startAt ?? item.createdAt ?? 0).getTime();
  const end = new Date(item.endAt).getTime();
  return Math.max(1, Math.round((end - start) / ONE_HOUR_MS));
}

// Not needed for duration UI



function formatAnnouncementWindow(item: Announcement, locale: 'en' | 'fil') {
  const start = item.startAt ?? item.createdAt;
  const end = item.endAt;
  return end
    ? `${formatDateTime(start, locale)} - ${formatDateTime(end, locale)}`
    : `${formatDateTime(start, locale)} - ${locale === 'fil' ? 'Walang end date' : 'No end date'}`;
}

export default function AdminAnnouncementsPage() {
  const { state, locale } = useAppState();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'resident' | 'staff'>('all');
  const [endAtInput, setEndAtInput] = useState<string>(isoToLocalInput(getDefaultEndAtISO()));
  const [viewing, setViewing] = useState<Announcement | null>(null);
  useBodyScrollLock(Boolean(viewing));
  const [openActionsForAnnouncementId, setOpenActionsForAnnouncementId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ left: number; top: number } | null>(null);
  const [menuPlacement, setMenuPlacement] = useState<'above' | 'below'>('above');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [showPublishedPanel, setShowPublishedPanel] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const pageCopy = getRolePageCopy('admin/announcements');

  const sortedAnnouncements = useMemo(() => {
    return [...state.announcements].sort((a, b) => {
      const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return bTime - aTime;
    });
  }, [state.announcements]);

  const visibleAnnouncements = useMemo(() => {
    return sortedAnnouncements.filter((a) => isAnnouncementActiveWindow({ startAt: a.startAt ?? null, endAt: a.endAt ?? null, createdAt: a.createdAt ?? null }));
  }, [sortedAnnouncements]);

  const totalPages = showPublishedPanel ? Math.max(1, Math.ceil(visibleAnnouncements.length / PAGE_SIZE)) : 1;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages]);

  useEffect(() => {
    if (editingId) {
      const item = state.announcements.find((a) => a.id === editingId);
      if (!item) return;
      setTitle(item.title);
      setBody(item.body);
      const endISO = item.endAt ?? getDefaultEndAtISO();
      setEndAtInput(isoToLocalInput(endISO));
    }
  }, [editingId, state.announcements]);

  // Reposition or close actions menu on scroll/resize or outside clicks
  useEffect(() => {
    if (!openActionsForAnnouncementId) return;

    function recompute() {
      const btn = document.querySelector<HTMLElement>(`[data-action-btn="${openActionsForAnnouncementId}"]`);
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuWidth = 224;
      const menuEstimateHeight = 200;
      let left = rect.right - menuWidth;
      left = Math.min(Math.max(left, 12), window.innerWidth - 12 - menuWidth);

      const spaceBelow = window.innerHeight - rect.bottom;
      const placeBelow = spaceBelow >= menuEstimateHeight + 12;
      if (placeBelow) {
        setMenuPlacement('below');
        setMenuCoords({ left, top: rect.bottom + 12 });
      } else {
        setMenuPlacement('above');
        setMenuCoords({ left, top: rect.top - 12 });
      }
    }

    function onDocClick(ev: MouseEvent) {
      const target = ev.target as Node;
      if (!menuRef.current) return;
      const btn = document.querySelector<HTMLElement>(`[data-action-btn="${openActionsForAnnouncementId}"]`);
      if (btn && (btn === target || btn.contains(target))) return;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenActionsForAnnouncementId(null);
        setMenuCoords(null);
      }
    }

    recompute();
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);
    document.addEventListener('mousedown', onDocClick);

    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [openActionsForAnnouncementId]);

  const paginatedAnnouncements = useMemo(() => {
    if (!showPublishedPanel) return [] as typeof visibleAnnouncements;
    const start = (currentPage - 1) * PAGE_SIZE;
    return visibleAnnouncements.slice(start, start + PAGE_SIZE);
  }, [visibleAnnouncements, currentPage, showPublishedPanel]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setIsPublishing(true);
    const now = new Date();
    const startAt = now.toISOString();
    const selectedEnd = new Date(endAtInput);
    if (selectedEnd <= now) {
      setFeedback({ tone: 'error', text: locale === 'fil' ? 'Hindi pwede ang nakalipas na oras.' : 'End time cannot be in the past.' });
      setIsPublishing(false);
      return;
    }
    const endAt = selectedEnd.toISOString();
    try {
      await upsertAnnouncement({ id: editingId ?? undefined, title, body, audience, startAt, endAt });
      setFeedback({ tone: 'success', text: editingId ? (locale === 'fil' ? 'Na-update na ang anunsyo.' : 'Announcement updated successfully.') : (locale === 'fil' ? 'Na-publish na ang anunsyo.' : 'Announcement published successfully.') });
      setTitle('');
      setBody('');
      setEndAtInput(isoToLocalInput(getDefaultEndAtISO()));
      setEditingId(null);
    } catch (err: any) {
      setFeedback({ tone: 'error', text: err?.message ?? (locale === 'fil' ? 'Nabigo ang pag-publish.' : 'Failed to publish announcement.') });
    } finally {
      setIsPublishing(false);
    }
    window.setTimeout(() => setFeedback(null), 4000);
  };

  async function handleDelete(id: string) {
    setFeedback(null);
    try {
      await deleteAnnouncement(id);
      setFeedback({ tone: 'error', text: locale === 'fil' ? 'Na-delete na ang anunsyo.' : 'Announcement deleted successfully.' });
    } catch (err: any) {
      setFeedback({ tone: 'error', text: err?.message ?? (locale === 'fil' ? 'Hindi natapos ang pagbura.' : 'Unable to delete announcement.') });
    }
    window.setTimeout(() => setFeedback(null), 4000);
  }

  async function handleHide(id: string) {
    setFeedback(null);
    const item = state.announcements.find((a) => a.id === id);
    if (!item) {
      setFeedback({ tone: 'error', text: locale === 'fil' ? 'Hindi nakita ang anunsyo.' : 'Announcement not found.' });
      window.setTimeout(() => setFeedback(null), 4000);
      return;
    }
    try {
      await upsertAnnouncement({
        id: item.id,
        title: item.title,
        body: item.body,
        audience: item.audience,
        startAt: item.startAt ?? item.createdAt,
        endAt: new Date().toISOString(),
      });
      setFeedback({ tone: 'info', text: locale === 'fil' ? 'Na-itago na ang anunsyo.' : 'Announcement hidden.' });
    } catch (err: any) {
      setFeedback({ tone: 'error', text: err?.message ?? (locale === 'fil' ? 'Hindi natapos ang pag-itago.' : 'Unable to hide announcement.') });
    }
    window.setTimeout(() => setFeedback(null), 4000);
  }

  return (
    <PortalShell role="admin" allowedRoles={['admin', 'staff']} title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {pageCopy.guide ? (
        <PageGuide
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}

      <SectionCard
        title={editingId ? (locale === 'fil' ? 'I-edit ang Anunsyo' : 'Edit Announcement') : locale === 'fil' ? 'Bagong Anunsyo' : 'New Announcement'}
        description={
          locale === 'fil'
            ? 'Mag-post ng malinaw na update para sa tamang audience.'
            : 'Post a clear update for the right audience.'
        }
        
      >
        <form className="grid gap-3 md:grid-cols-4" onSubmit={onSubmit}>
          <FieldLabel label={locale === 'fil' ? 'Pamagat' : 'Title'} className="md:col-span-2">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </FieldLabel>

          <FieldLabel label={locale === 'fil' ? 'End Time' : 'End Time'}>
            <Input
              type="datetime-local"
              value={endAtInput}
              min={getNowLocalInput()}
              onChange={(e) => setEndAtInput(e.target.value)}
              required
            />
          </FieldLabel>
          <FieldLabel label={locale === 'fil' ? 'Audience' : 'Audience'} className="md:col-span-1">
            <Select value={audience} onChange={(event) => setAudience(event.target.value as 'all' | 'resident' | 'staff')}>
              <option value="all">{locale === 'fil' ? 'Lahat' : 'All'}</option>
              <option value="resident">{locale === 'fil' ? 'Residents' : 'Residents'}</option>
              <option value="staff">{locale === 'fil' ? 'Staff' : 'Staff'}</option>
            </Select>
          </FieldLabel>
          <FieldLabel label={locale === 'fil' ? 'Nilalaman' : 'Body'} className="md:col-span-4">
            <Textarea value={body} onChange={(event) => setBody(event.target.value)} required className="min-h-[100px]" />
          </FieldLabel>
          <div className="flex items-center justify-between md:col-span-4">
            <div className="flex items-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full px-3 py-1 text-sm text-[color:var(--portal-ink-700)] border-[color:var(--portal-border-soft)]"
                onClick={() => {
                  setShowPublishedPanel((p) => !p);
                  setCurrentPage(1);
                }}
              >
                {showPublishedPanel ? (locale === 'fil' ? 'Itago ang Mga Na-publish na Anunsyo' : 'Hide Published Announcements') : (locale === 'fil' ? 'Tingnan ang Mga Na-publish na Anunsyo' : 'View Published Announcements')}
              </Button>
            </div>
            <div className="flex items-center">
              <Button
                type="submit"
                disabled={isPublishing}
                className="w-full md:w-auto border border-[color:#14543a] bg-[linear-gradient(180deg,#1d7a53_0%,#155f40_100%)] px-6 text-white shadow-[0_10px_24px_rgba(21,95,64,0.32)] hover:bg-[linear-gradient(180deg,#176745_0%,#114f36_100%)] disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isPublishing ? (locale === 'fil' ? 'Nag-pub-publish...' : 'Publishing...') : (locale === 'fil' ? 'I-publish' : 'Publish')}
              </Button>
              {editingId ? (
                <Button
                  variant="residentOutlineGray"
                  type="button"
                  className="ml-2"
                  onClick={() => {
                    setEditingId(null);
                    setTitle('');
                    setBody('');
                    setAudience('all');
                    setEndAtInput(isoToLocalInput(getDefaultEndAtISO()));
                  }}
                >
                  {locale === 'fil' ? 'Cancel Edit' : 'Cancel Edit'}
                </Button>
              ) : null}
            </div>
          </div>
        </form>
      </SectionCard>

      {feedback ? <FormFeedback tone={feedback.tone} text={feedback.text} /> : null}

      {showPublishedPanel ? (
        <SectionCard title={locale === 'fil' ? 'Mga Na-publish' : 'Published Announcements'}>
          <Table>
          <TableHeader>
            <TableRow>
              <th className="py-2 pr-2 align-middle text-center" style={{ width: '30%' }}>{locale === 'fil' ? 'Pamagat' : 'Title'}</th>
              <th className="py-2 pr-2 align-middle text-center" style={{ width: '14%' }}>{locale === 'fil' ? 'Audience' : 'Audience'}</th>
              <th className="py-2 pr-2 align-middle text-center" style={{ width: '28%' }}>{locale === 'fil' ? 'Schedule' : 'Schedule'}</th>
              <th className="py-2 pr-2 align-middle text-center" style={{ width: '14%' }}>{locale === 'fil' ? 'Nilikha' : 'Created'}</th>
              <th className="py-2 pr-2 align-middle text-center" style={{ width: '14%' }}>{locale === 'fil' ? 'Aksyon' : 'Action'}</th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedAnnouncements.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-center">{item.title}</TableCell>
                  <TableCell className="text-center">
                    <span className="capitalize">
                      <StatusBadge tone="neutral">{item.audience}</StatusBadge>
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-[color:var(--portal-ink-700)]">{formatAnnouncementWindow(item, locale)}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-[color:var(--portal-ink-700)]">{formatDateTime(item.createdAt || item.updatedAt, locale)}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="relative inline-block text-left">
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={(e) => {
                          const button = e.currentTarget as HTMLElement;
                          const rect = button.getBoundingClientRect();
                          const menuWidth = 224;
                          const menuEstimateHeight = 200;
                          let left = rect.right - menuWidth;
                          left = Math.min(Math.max(left, 12), window.innerWidth - 12 - menuWidth);

                          const spaceBelow = window.innerHeight - rect.bottom;
                          const placeBelow = spaceBelow >= menuEstimateHeight + 12;

                          const isOpening = openActionsForAnnouncementId !== item.id;
                          setOpenActionsForAnnouncementId(isOpening ? item.id : null);
                          if (isOpening) {
                            if (placeBelow) {
                              setMenuPlacement('below');
                              setMenuCoords({ left, top: rect.bottom + 12 });
                            } else {
                              setMenuPlacement('above');
                              setMenuCoords({ left, top: rect.top - 12 });
                            }
                          } else {
                            setMenuCoords(null);
                          }
                        }}
                        data-action-btn={item.id}
                      >
                        {locale === 'fil' ? 'Mga Aksyon' : 'Actions'}
                      </Button>

                      {openActionsForAnnouncementId === item.id && menuCoords ? (
                        <div
                          ref={menuRef}
                          className="z-50 w-56 rounded-md border border-[color:var(--portal-border-soft)] bg-white p-2 shadow-lg"
                          style={{ position: 'fixed', left: menuCoords.left, top: menuCoords.top, transform: menuPlacement === 'above' ? 'translateY(-100%)' : 'none' }}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            className="mb-1 w-full justify-start rounded-xl px-3 py-2 text-sm last:mb-0"
                            onClick={() => {
                              setOpenActionsForAnnouncementId(null);
                              setMenuCoords(null);
                              setViewing(item);
                            }}
                          >
                            {locale === 'fil' ? 'Tingnan' : 'View'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            className="mb-1 w-full justify-start rounded-xl px-3 py-2 text-sm text-[color:#b45309] hover:bg-[color:#fffbeb] hover:text-[color:#92400e] last:mb-0"
                            onClick={() => {
                              setOpenActionsForAnnouncementId(null);
                              setMenuCoords(null);
                              void handleHide(item.id);
                            }}
                          >
                            {locale === 'fil' ? 'Itago' : 'Hide'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            className="w-full justify-start rounded-xl px-3 py-2 text-sm text-[color:#9f1239] hover:bg-[color:#fff1f2] hover:text-[color:#881337]"
                            onClick={() => {
                              setOpenActionsForAnnouncementId(null);
                              setMenuCoords(null);
                              void handleDelete(item.id);
                            }}
                          >
                            {locale === 'fil' ? 'Burahin' : 'Delete'}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-[color:var(--portal-ink-600)]">
              {`Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, visibleAnnouncements.length)} of ${visibleAnnouncements.length}`}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                {locale === 'fil' ? 'Nakaraan' : 'Previous'}
              </Button>
              <div className="text-sm text-[color:var(--portal-ink-600)]">{`${currentPage} / ${totalPages}`}</div>
              <Button type="button" variant="ghost" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                {locale === 'fil' ? 'Susunod' : 'Next'}
              </Button>
            </div>
          </div>

        </SectionCard>
      ) : null}
      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setViewing(null)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-0 flex items-start justify-between">
                <div>
                  <div className="text-xs text-[color:var(--portal-ink-600)] mb-1">
                    {(() => {
                      const author = state.users.find((u) => u.id === viewing.createdBy);
                      const roleLabel = author ? (author.role === 'admin' ? (locale === 'fil' ? 'Admin' : 'Admin') : author.role === 'staff' ? (locale === 'fil' ? 'Staff' : 'Staff') : author.role) : '';
                      return `${locale === 'fil' ? 'Mula sa:' : 'From:'} ${roleLabel}`;
                    })()}
                  </div>
                  <h3 className="font-heading text-lg font-semibold">{locale === 'fil' ? 'Tingnan ang Anunsyo' : 'View Announcement'}</h3>
                </div>
                <Button type="button" variant="ghost" onClick={() => setViewing(null)}>×</Button>
              </div>
              <div className="border-t border-[color:var(--portal-border-soft)] mt-2 mb-3" />
              <div className="text-sm text-[color:var(--portal-ink-700)] mb-2">
                {locale === 'fil' ? 'Nai-post:' : 'Posted date:'} {formatDateTime(viewing.createdAt || viewing.startAt || '', locale)}
              </div>
              <div className="grid gap-3">
                <div className="rounded-lg border border-[color:var(--portal-border-soft)] bg-[color:#eef9f2] p-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[color:var(--portal-ink-900)]">{viewing.title}</h3>
                  </div>
                  <div className="mt-3">
                    <div className="text-sm text-[color:var(--portal-ink-700)]">
                      <span className="font-normal">{locale === 'fil' ? 'Audience:' : 'Audience:'}</span>
                      <span className="ml-2 font-semibold capitalize">{viewing.audience === 'all' ? (locale === 'fil' ? 'Lahat' : 'All') : viewing.audience === 'resident' ? (locale === 'fil' ? 'Residents' : 'Residents') : (locale === 'fil' ? 'Staff' : 'Staff')}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-sm text-[color:var(--portal-ink-700)]">
                      <span className="font-normal">{locale === 'fil' ? 'Schedule:' : 'Schedule:'}</span>
                      <span className="ml-2 font-semibold">{formatAnnouncementWindow(viewing, locale)}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-sm text-[color:var(--portal-ink-700)]">
                      <span className="font-normal">{locale === 'fil' ? 'Nilalaman:' : 'Body:'}</span>
                      <span className="ml-2 font-semibold whitespace-pre-wrap">{viewing.body}</span>
                    </div>
                  </div>
                </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setViewing(null)}>{locale === 'fil' ? 'Close' : 'Close'}</Button>
                <Button
                  type="button"
                  className="w-full md:w-auto border border-[color:#14543a] bg-[linear-gradient(180deg,#1d7a53_0%,#155f40_100%)] px-6 text-white shadow-[0_10px_24px_rgba(21,95,64,0.32)] hover:bg-[linear-gradient(180deg,#176745_0%,#114f36_100%)]"
                  onClick={() => {
                    setEditingId(viewing.id);
                    setTitle(viewing.title);
                    setBody(viewing.body);
                    setAudience(viewing.audience);
                    setEndAtInput(viewing.endAt ? isoToLocalInput(viewing.endAt) : isoToLocalInput(getDefaultEndAtISO()));
                    setViewing(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  {locale === 'fil' ? 'I-edit' : 'Edit'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
}
