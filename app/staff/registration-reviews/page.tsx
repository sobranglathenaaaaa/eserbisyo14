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
  const { locale, state } = useAppState();
  const pageCopy = getRolePageCopy('staff/registration-reviews');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'declined'>('all');
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

      // Also supplement with local app state users for registrations that
      // have been forwarded to admin or rejected by staff so they appear in
      // the Approved / Declined filters even though the staff API returns
      // only pending items with signed ID preview URLs.
      const supplemental: RegistrationQueueItem[] = (state?.users ?? [])
        .filter((u) => u.role === 'resident' && !u.isDeleted && (u.approvalStatus === 'staff_forwarded_to_admin' || u.approvalStatus === 'staff_rejected'))
        .map((u) => ({
          id: u.id,
          full_name: u.fullName,
          sex: u.sex ?? null,
          civil_status: u.civilStatus ?? null,
          citizenship: u.citizenship ?? null,
          birthdate: u.birthdate ?? null,
          email: u.email,
          phone: u.phone ?? null,
          address: u.address ?? null,
          address_line: u.addressLine ?? null,
          province: u.province ?? null,
          city: u.city ?? null,
          barangay: u.barangay ?? null,
          id_type: u.idType ?? null,
          id_number: u.idNumber ?? null,
          id_file_name: u.idFileName ?? null,
          id_file_path: u.idFilePath ?? null,
          id_file_url: null,
          id_file_name_back: u.idFileNameBack ?? null,
          id_file_path_back: u.idFilePathBack ?? null,
          id_file_url_back: null,
          approval_status: u.approvalStatus ?? 'pending_staff_review',
          staff_review_note: u.staffReviewNote ?? null,
          created_at: u.createdAt,
          updated_at: u.updatedAt,
        }));

      // Merge API pending items (which include signed preview URLs) with supplemental
      // entries from app state and dedupe by id, preferring the API item when present.
      const map = new Map<string, RegistrationQueueItem>();
      supplemental.forEach((s) => map.set(s.id, s));
      pendingFromApi.forEach((p) => map.set(p.id, p));
      const merged = Array.from(map.values());

      setQueue(merged);
    } finally {
      setLoadingQueue(false);
    }
  }, [state]);

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

  // Reset to first page when search or filter or queue changes
  useEffect(() => {
    setCurrentPage(1);
  }, [userSearch, statusFilter, queue.length]);

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
        {/* red dot moved to Pending filter button below */}

        <div className="mt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-4">
            <label className="grid gap-1 text-sm">
              <span className="sr-only">{locale === 'fil' ? 'Hanapin ang user' : 'Search users'}</span>
              <Input
                className="w-full max-w-[560px]"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={locale === 'fil' ? 'Pangalan, email, o ID' : 'Name, email, or ID'}
              />
            </label>
          </div>
          <div className="ml-4 flex items-center gap-2">
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                className={`rounded px-3 py-1 text-sm ${statusFilter === 'all' ? 'bg-[color:var(--portal-border-soft)]' : 'hover:bg-[color:var(--portal-border-soft)]'}`}
                onClick={() => setStatusFilter('all')}
              >
                {locale === 'fil' ? 'Lahat' : 'All'} ({pendingRegistrations.length})
              </button>
              <button
                type="button"
                className={`rounded px-3 py-1 text-sm ${statusFilter === 'approved' ? 'bg-[color:#ecfdf5]' : 'hover:bg-[color:#ecfdf5]'}`}
                onClick={() => setStatusFilter('approved')}
              >
                {locale === 'fil' ? 'Aprubado' : 'Approved'} ({pendingRegistrations.filter(p => p.approval_status === 'staff_forwarded_to_admin').length})
              </button>
              {
                (() => {
                  const pendingCount = pendingRegistrations.filter((p) => p.approval_status === 'pending_staff_review').length;
                  return (
                    <button
                      type="button"
                      className={`relative rounded px-3 py-1 text-sm ${statusFilter === 'pending' ? 'bg-[color:#fff7ed]' : 'hover:bg-[color:#fff7ed]'}`}
                      onClick={() => setStatusFilter('pending')}
                    >
                      {locale === 'fil' ? 'Pending' : 'Pending'} ({pendingCount})
                      {pendingCount > 0 ? (
                        <span className="absolute -right-2 -top-2 inline-block h-3 w-3 rounded-full bg-red-600" aria-hidden></span>
                      ) : null}
                    </button>
                  );
                })()
              }
              <button
                type="button"
                className={`rounded px-3 py-1 text-sm ${statusFilter === 'declined' ? 'bg-[color:#fff1f2]' : 'hover:bg-[color:#fff1f2]'}`}
                onClick={() => setStatusFilter('declined')}
              >
                {locale === 'fil' ? 'Tinanggihan' : 'Declined'} ({pendingRegistrations.filter(p => p.approval_status === 'staff_rejected').length})
              </button>
            </div>
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
              let base = pendingRegistrations;
              if (statusFilter === 'all') base = pendingRegistrations;
              else if (statusFilter === 'approved') base = pendingRegistrations.filter((p) => p.approval_status === 'staff_forwarded_to_admin');
              else if (statusFilter === 'pending') base = pendingRegistrations.filter((p) => p.approval_status === 'pending_staff_review');
              else base = pendingRegistrations.filter((p) => p.approval_status === 'staff_rejected');
              const query = userSearch.trim().toLowerCase();
              const filtered = !query
                ? base
                : base.filter((p) => `${p.full_name} ${p.email} ${p.id}`.toLowerCase().includes(query));
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
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <thead>
                      <tr className="border-b border-[color:var(--portal-border-soft)] text-[color:var(--portal-ink-700)]">
                        <th className="py-2 pr-2 align-middle text-center" style={{ width: '12%' }}>{locale === 'fil' ? 'ID' : 'ID'}</th>
                        <th className="py-2 pr-2 align-middle text-center" style={{ width: '18%' }}>{locale === 'fil' ? 'Pangalan' : 'Name'}</th>
                        <th className="py-2 pr-2 align-middle text-center" style={{ width: '22%' }}>{locale === 'fil' ? 'Email' : 'Email'}</th>
                        <th className="py-2 pr-2 align-middle text-center" style={{ width: '14%' }}>{locale === 'fil' ? 'Huling update' : 'Last updated'}</th>
                        <th className="py-2 pr-2 align-middle text-center" style={{ width: '8%' }}>{locale === 'fil' ? 'Katayuan' : 'Status'}</th>
                        <th className="py-2 pr-2 align-middle text-center" style={{ width: '10%' }}>{locale === 'fil' ? 'Aksyon' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((item) => (
                        <tr key={item.id} className="border-b border-[color:var(--portal-border-soft)]">
                          <td className="py-2 pr-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[1px] font-mono text-[10px] text-[color:var(--portal-ink-500)] select-all">{item.id}</td>
                          <td className="py-2 pr-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[1px] text-center">{item.full_name}</td>
                          <td className="py-2 pr-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[1px] text-center">{item.email}</td>
                          <td className="py-2 pr-2 text-center align-middle">
                            <div>{formatDateTime(item.updated_at || item.created_at, locale)}</div>
                            <p className="text-xs text-[color:var(--portal-ink-500)]">{relativeTime(item.updated_at || item.created_at, locale)}</p>
                          </td>
                          <td className="py-2 pr-2 text-center align-middle">
                            {(() => {
                              const status = item.approval_status;
                              const tone = status === 'staff_forwarded_to_admin' ? 'success' : status === 'staff_rejected' ? 'danger' : 'warning';
                              const label = status === 'staff_forwarded_to_admin' ? (locale === 'fil' ? 'Aprubado' : 'Approved') : status === 'staff_rejected' ? (locale === 'fil' ? 'Tinanggihan' : 'Declined') : (locale === 'fil' ? 'Pending' : 'Pending');
                              return <StatusBadge tone={tone as any}>{label}</StatusBadge>;
                            })()}
                          </td>
                          <td className="py-2 pr-2">
                            <div className="flex justify-center">
                              <Button
                                variant="ghost"
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
                  {/* pagination controls */}
                  {filtered.length > 0 ? (
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm text-[color:var(--portal-ink-500)]">
                        {filtered.length === 0 ? '' : `Showing ${Math.min(start + 1, filtered.length)}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" disabled={current <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>{locale === 'fil' ? 'Nakaraan' : 'Previous'}</Button>
                        <div className="text-sm text-[color:var(--portal-ink-600)]">{`${current} / ${totalPages}`}</div>
                        <Button type="button" variant="ghost" disabled={current >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>{locale === 'fil' ? 'Susunod' : 'Next'}</Button>
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
                  ? 'I-forwarding...'
                  : 'Forwarding...'
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
                  ? 'Rejecting...'
                  : 'Rejecting...'
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
