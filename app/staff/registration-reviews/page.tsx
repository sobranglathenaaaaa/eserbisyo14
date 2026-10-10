'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PortalShell from '../../../components/portal-shell';
import { EmptyState, FormFeedback, PageGuide, SectionCard, StatusBadge } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import { formatDateTime, relativeTime } from '@/lib/formatters';
import { getSupabaseBrowserClient, getSupabaseSessionSafely } from '@/lib/supabase/client';
import RegistrationReviewModal from '@/components/registration-review-modal';
import { updateUserApproval } from '../../../lib/frontend-data/store';
import { useAppState } from '../../../lib/frontend-data/use-app-state';

type RegistrationQueueItem = {
  id: string;
  full_name: string;
  sex?: string | null;
  civil_status?: string | null;
  citizenship?: string | null;
  birthdate?: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  address_line?: string | null;
  province?: string | null;
  city?: string | null;
  barangay?: string | null;
  id_type: string | null;
  id_number: string | null;
  id_file_name: string | null;
  id_file_path: string | null;
  id_file_url: string | null;
  id_file_name_back: string | null;
  id_file_path_back: string | null;
  id_file_url_back: string | null;
  approval_status: string;
  staff_review_note?: string | null;
  created_at: string;
  updated_at: string;
};

export default function StaffRegistrationReviewsPage() {
  const { locale } = useAppState();
  const pageCopy = getRolePageCopy('staff/registration-reviews');
  const [userSearch, setUserSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queue, setQueue] = useState<RegistrationQueueItem[]>([]);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [processingDecision, setProcessingDecision] = useState<'none' | 'forward' | 'reject'>('none');
  const [idPreviewLoadFailed, setIdPreviewLoadFailed] = useState(false);
  const [idBackPreviewLoadFailed, setIdBackPreviewLoadFailed] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await getSupabaseSessionSafely(supabase);
      const token = sessionData.session?.access_token;
      let pendingFromApi: RegistrationQueueItem[] = [];

      if (token) {
        const response = await fetch('/api/v1/users?registrationQueue=staff', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = (await response.json().catch(() => null)) as
          | { success: true; data: { users: RegistrationQueueItem[] } }
          | { success: false; error?: { message?: string } }
          | null;

        if (response.ok && payload && payload.success) {
          pendingFromApi = payload.data.users ?? [];
        }
      }

      // The staff API is the single source for this queue and returns only
      // registrations waiting for staff review.
      setQueue(pendingFromApi.filter((item) => item.approval_status === 'pending_staff_review'));
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const pendingRegistrations = useMemo(
    () => [...queue].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [queue]
  );

  const selectedRegistration = useMemo(
    () => pendingRegistrations.find((item) => item.id === selectedUserId) ?? null,
    [pendingRegistrations, selectedUserId]
  );

  const deriveProvinceFromAddress = (address?: string | null) => {
    if (!address) return null;
    try {
      const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
      if (!parts.length) return null;
      return parts[parts.length - 1];
    } catch {
      return null;
    }
  };

  const reviewDetailGroups = useMemo(
    () => [
      {
        title: locale === 'fil' ? 'Impormasyon ng User' : 'User Information',
        items: [
          { label: locale === 'fil' ? 'Resident ID' : 'Resident ID', value: selectedRegistration?.id ?? '-' },
          { label: locale === 'fil' ? 'Buong Pangalan' : 'Full Name', value: selectedRegistration?.full_name ?? '-' },
          { label: locale === 'fil' ? 'Kasarian' : 'Sex', value: selectedRegistration?.sex ?? '-' },
          { label: locale === 'fil' ? 'Civil Status' : 'Civil Status', value: selectedRegistration?.civil_status ?? '-' },
          { label: locale === 'fil' ? 'Citizenship' : 'Citizenship', value: selectedRegistration?.citizenship ?? '-' },
          { label: locale === 'fil' ? 'Birthdate' : 'Birthdate', value: selectedRegistration?.birthdate ?? '-' },
        ],
      },
      {
        title: locale === 'fil' ? 'Impormasyon sa Contact' : 'Contact Information',
        items: [
          {
            label: locale === 'fil' ? 'House/Unit/Building/Village/Street' : 'House/Unit/Building/Village/Street',
            value: selectedRegistration?.address_line ?? selectedRegistration?.address ?? '-',
          },
          { label: locale === 'fil' ? 'Province' : 'Province', value: selectedRegistration?.province ?? deriveProvinceFromAddress(selectedRegistration?.address) ?? '-' },
          { label: locale === 'fil' ? 'City' : 'City', value: selectedRegistration?.city ?? '-' },
          { label: locale === 'fil' ? 'Barangay' : 'Barangay', value: selectedRegistration?.barangay ?? '-' },
          { label: locale === 'fil' ? 'Contact Number' : 'Contact Number', value: selectedRegistration?.phone ?? '-' },
        ],
      },
      {
        title: locale === 'fil' ? 'Credentials ng Account' : 'Account Credentials',
        items: [
          { label: locale === 'fil' ? 'Email' : 'Email', value: selectedRegistration?.email ?? '-' },
          { label: locale === 'fil' ? 'ID Type' : 'ID Type', value: selectedRegistration?.id_type ?? '-' },
          { label: locale === 'fil' ? 'ID Number' : 'ID Number', value: selectedRegistration?.id_number ?? '-' },
          { label: locale === 'fil' ? 'Huling update' : 'Last updated', value: selectedRegistration ? formatDateTime(selectedRegistration.updated_at || selectedRegistration.created_at, locale) : '-' },
        ],
      },
    ],
    [locale, selectedRegistration]
  );

  const openReviewModal = (userId: string) => {
    const registration = pendingRegistrations.find((item) => item.id === userId);
    setSelectedUserId(userId);
    setReviewNote(registration?.approval_status === 'staff_rejected' ? registration.staff_review_note ?? '' : '');
    setIdPreviewLoadFailed(false);
    setIdBackPreviewLoadFailed(false);
    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setReviewModalOpen(false);
    setSelectedUserId(null);
    setReviewNote('');
  };

  useEffect(() => {
    setIdPreviewLoadFailed(false);
    setIdBackPreviewLoadFailed(false);
  }, [selectedRegistration?.id, selectedRegistration?.id_file_url, selectedRegistration?.id_file_url_back]);

  useEffect(() => {
    const onFocus = () => void loadQueue();
    const intervalId = window.setInterval(() => void loadQueue(), 30000);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(intervalId);
    };
  }, [loadQueue]);

  // Reset to first page when search or queue changes
  useEffect(() => {
    setCurrentPage(1);
  }, [userSearch, queue.length]);

  const runDecision = async (decision: 'staff_forwarded_to_admin' | 'staff_rejected') => {
    if (!selectedRegistration) return;
    if (decision === 'staff_rejected' && !reviewNote.trim()) {
      setFeedback({
        tone: 'error',
        text: locale === 'fil' ? 'Kailangan ang note bago mag-reject.' : 'A review note is required before rejecting.',
      });
      return;
    }

    setProcessingDecision(decision === 'staff_forwarded_to_admin' ? 'forward' : 'reject');
    try {
      await updateUserApproval(selectedRegistration.id, decision, reviewNote.trim() || undefined);
      await loadQueue();
      closeReviewModal();
      setFeedback({
        tone: 'success',
        text:
          decision === 'staff_forwarded_to_admin'
            ? locale === 'fil'
              ? 'Na-forward na sa admin para sa final approval.'
              : 'Registration forwarded to admin for final approval.'
            : locale === 'fil'
              ? 'Na-reject na ng staff review.'
              : 'Registration rejected during staff review.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Unable to process registration review.',
      });
    } finally {
      setProcessingDecision('none');
    }
  };

  // Auto-dismiss all feedback after 5 seconds
  useEffect(() => {
    if (feedback) {
      const timeoutId = window.setTimeout(() => {
        setFeedback(null);
      }, 5000);
      return () => window.clearTimeout(timeoutId);
    }
  }, [feedback]);

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

      {feedback?.tone === 'success' ? <FormFeedback tone={feedback.tone} text={feedback.text} /> : null}

      <section className="relative rounded-lg border border-[color:var(--border)] bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h3 className="font-semibold text-lg">{locale === 'fil' ? 'Bagong Registrations' : 'New Registrations'}</h3>
          <p className="text-sm text-[color:var(--portal-ink-500)] mt-1">
            {locale === 'fil'
              ? 'Staff muna ang unang review bago makita ng admin final queue.'
              : 'Staff performs first review before records appear in admin final queue.'}
          </p>
        </div>
        <div className="mt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1 w-full max-w-full md:max-w-[420px]">
            <label className="grid gap-1 text-sm">
              <span className="sr-only">{locale === 'fil' ? 'Hanapin ang user' : 'Search users'}</span>
              <Input
                className="w-full"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={locale === 'fil' ? 'Pangalan, email, o ID' : 'Name, email, or ID'}
              />
            </label>
          </div>
        </div>

        <div className="mt-3">
          {loadingQueue ? (
            <p className="text-sm text-[color:var(--portal-ink-700)]">
              {locale === 'fil' ? 'Naglo-load ng registration queue...' : 'Loading registration queue...'}
            </p>
          ) : !pendingRegistrations.length ? (
            <EmptyState
              title={locale === 'fil' ? 'Walang pending registration' : 'No pending registrations'}
              description={locale === 'fil'
                ? 'Lahat ng bagong rehistro ay na-review na.'
                : 'All newly registered residents have been reviewed.'}
            />
          ) : (
            (() => {
              const query = userSearch.trim().toLowerCase();
              const filtered = !query
                ? pendingRegistrations
                : pendingRegistrations.filter((p) => `${p.full_name} ${p.email} ${p.id}`.toLowerCase().includes(query));
              const PAGE_SIZE = 10;
              if (filtered.length === 0) {
                return (
                  <EmptyState
                    title={locale === 'fil' ? 'Walang user na natagpuan' : 'No users found'}
                    description={locale === 'fil' ? 'Walang tumugmang registrasyon ayon sa iyong filter o paghahanap.' : 'No registrations match your current filter or search.'}
                  />
                );
              }
              const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
              const current = Math.min(currentPage, totalPages);
              const start = (current - 1) * PAGE_SIZE;
              const paginated = filtered.slice(start, start + PAGE_SIZE);

              return (
                <div>
                  {/* Mobile View: Cards */}
                  <div className="block md:hidden space-y-3">
                    {paginated.map((item) => {
                      return (
                        <div key={`mob-reg-${item.id}`} className="rounded-xl border border-[color:var(--portal-border-soft)] bg-white p-3.5 shadow-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-[color:var(--portal-ink-900)] leading-tight">{item.full_name}</h4>
                              <p className="mt-0.5 text-xs text-[color:var(--portal-ink-600)] truncate">{item.email}</p>
                            </div>
                            <StatusBadge tone="warning">{locale === 'fil' ? 'Pending' : 'Pending'}</StatusBadge>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between border-t border-[color:var(--portal-border-soft)] pt-2.5 text-xs text-[color:var(--portal-ink-500)]">
                            <div>
                              <span>{formatDateTime(item.updated_at || item.created_at, locale)}</span>
                              <span className="ml-1 text-[11px] text-[color:var(--portal-ink-400)]">({relativeTime(item.updated_at || item.created_at, locale)})</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              type="button"
                              className="font-semibold text-emerald-800 hover:text-emerald-950 px-3"
                              onClick={() => openReviewModal(item.id)}
                            >
                              {locale === 'fil' ? 'Review' : 'Review'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop View: Table */}
                  <div className="hidden md:block mt-2 overflow-x-auto rounded-xl border border-[color:var(--portal-border-soft)]">
                    <table className="w-full text-sm table-fixed min-w-[760px]">
                      <thead>
                        <tr className="border-b border-[color:var(--portal-border-soft)] bg-emerald-50/40 text-[color:var(--portal-ink-700)]">
                          <th className="py-2.5 px-3 align-middle text-left font-bold" style={{ width: '15%' }}>{locale === 'fil' ? 'ID' : 'ID'}</th>
                          <th className="py-2.5 px-3 align-middle text-left font-bold" style={{ width: '22%' }}>{locale === 'fil' ? 'Pangalan' : 'Name'}</th>
                          <th className="py-2.5 px-3 align-middle text-left font-bold" style={{ width: '25%' }}>{locale === 'fil' ? 'Email' : 'Email'}</th>
                          <th className="py-2.5 px-3 align-middle text-center font-bold" style={{ width: '18%' }}>{locale === 'fil' ? 'Huling update' : 'Last updated'}</th>
                          <th className="py-2.5 px-2 align-middle text-center font-bold" style={{ width: '10%' }}>{locale === 'fil' ? 'Katayuan' : 'Status'}</th>
                          <th className="py-2.5 px-3 align-middle text-center font-bold" style={{ width: '10%' }}>{locale === 'fil' ? 'Aksyon' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((item) => (
                          <tr key={item.id} className="border-b border-[color:var(--portal-border-soft)] hover:bg-emerald-50/20">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[color:var(--portal-ink-500)] select-all truncate">{item.id}</td>
                            <td className="py-2.5 px-3 font-semibold text-[color:var(--portal-ink-900)] text-left truncate">{item.full_name}</td>
                            <td className="py-2.5 px-3 text-[color:var(--portal-ink-700)] text-left truncate">{item.email}</td>
                            <td className="py-2.5 px-3 text-center align-middle text-xs">
                              <div>{formatDateTime(item.updated_at || item.created_at, locale)}</div>
                              <p className="text-[11px] text-[color:var(--portal-ink-500)]">{relativeTime(item.updated_at || item.created_at, locale)}</p>
                            </td>
                            <td className="py-2.5 px-2 text-center align-middle">
                              {(() => {
                                return <StatusBadge tone="warning">{locale === 'fil' ? 'Pending' : 'Pending'}</StatusBadge>;
                              })()}
                            </td>
                            <td className="py-2.5 px-3 text-center align-middle">
                              <div className="flex justify-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  type="button"
                                  onClick={() => openReviewModal(item.id)}
                                >
                                  {locale === 'fil' ? 'Review' : 'Review'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* pagination controls */}
                  {filtered.length > 0 ? (
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[color:var(--portal-border-soft)] pt-3">
                      <div className="text-xs sm:text-sm text-[color:var(--portal-ink-500)] text-center sm:text-left">
                        {filtered.length === 0 ? '' : `Showing ${Math.min(start + 1, filtered.length)}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length}`}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Button type="button" variant="ghost" size="sm" disabled={current <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>{locale === 'fil' ? 'Nakaraan' : 'Previous'}</Button>
                        <div className="text-xs sm:text-sm font-semibold px-2 text-[color:var(--portal-ink-600)]">{`${current} / ${totalPages}`}</div>
                        <Button type="button" variant="ghost" size="sm" disabled={current >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>{locale === 'fil' ? 'Susunod' : 'Next'}</Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })()
          )}
        </div>
      </section>

      <RegistrationReviewModal
        open={reviewModalOpen}
        title={locale === 'fil' ? 'I-review ang Registration' : 'Review Registration'}
        onClose={closeReviewModal}
        detailsTitle={locale === 'fil' ? 'Review Your Details' : 'Review Your Details'}
        detailGroups={reviewDetailGroups}
        verificationTitle={locale === 'fil' ? 'ID Verification' : 'ID Verification'}
        frontLabel={locale === 'fil' ? 'Front View' : 'Front View'}
        backLabel={locale === 'fil' ? 'Back View' : 'Back View'}
        frontPreviewUrl={reviewModalOpen && !idPreviewLoadFailed ? (selectedRegistration?.id_file_url ?? null) : null}
        backPreviewUrl={reviewModalOpen && !idBackPreviewLoadFailed ? (selectedRegistration?.id_file_url_back ?? null) : null}
        frontPreviewAlt={locale === 'fil' ? 'Preview ng uploaded ID' : 'Uploaded ID preview'}
        backPreviewAlt={locale === 'fil' ? 'Preview ng uploaded ID (back)' : 'Uploaded ID preview (back)'}
        frontPreviewUnavailableText={locale === 'fil' ? 'Hindi available ang preview ngayon.' : 'ID preview is not available right now.'}
        backPreviewUnavailableText={locale === 'fil' ? 'Hindi available ang preview ngayon.' : 'ID preview is not available right now.'}
        onFrontPreviewError={() => setIdPreviewLoadFailed(true)}
        onBackPreviewError={() => setIdBackPreviewLoadFailed(true)}
        onFrontPreviewClick={() => {
          if (selectedRegistration?.id_file_url) {
            window.open(selectedRegistration.id_file_url, '_blank');
          }
        }}
        onBackPreviewClick={() => {
          if (selectedRegistration?.id_file_url_back) {
            window.open(selectedRegistration.id_file_url_back, '_blank');
          }
        }}
        noteLabel={locale === 'fil' ? 'Review note' : 'Review note'}
        notePlaceholder={locale === 'fil' ? 'Required kapag reject' : 'Required when rejecting'}
        noteValue={reviewNote}
        onNoteChange={setReviewNote}
        noteDisabled={selectedRegistration?.approval_status === 'staff_rejected'}
        actions={
          <>
            <Button
              type="button"
              variant="resident"
              onClick={() => void runDecision('staff_forwarded_to_admin')}
              disabled={processingDecision !== 'none' || selectedRegistration?.approval_status !== 'pending_staff_review'}
            >
              {processingDecision === 'forward'
                ? locale === 'fil'
                  ? 'I-forwarding'
                  : 'Forwarding'
                : locale === 'fil'
                  ? 'I-forward sa Admin'
                  : 'Forward to Admin'}
            </Button>
            <Button
              variant="destructiveOutline"
              type="button"
              onClick={() => void runDecision('staff_rejected')}
              className="text-[color:var(--portal-ink-900)]"
              disabled={!reviewNote.trim() || processingDecision !== 'none' || selectedRegistration?.approval_status !== 'pending_staff_review'}
            >
              {processingDecision === 'reject'
                ? locale === 'fil'
                  ? 'Rejecting'
                  : 'Rejecting'
                : locale === 'fil'
                  ? 'Reject Registration'
                  : 'Reject Registration'}
            </Button>
          </>
        }
        footerNote={null}
        secondaryMessage={feedback?.tone === 'error' ? <FormFeedback tone={feedback.tone} text={feedback.text} /> : null}
      />
    </PortalShell>
  );
}
