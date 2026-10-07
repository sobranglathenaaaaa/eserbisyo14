'use client';

import { FormEvent, useMemo, useState, useEffect, useRef } from 'react';
import PortalShell from '../../../components/portal-shell';
import { EmptyState, FormFeedback, PageGuide, StatusBadge } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Select } from '@/components/ui/select';
import RegistrationReviewModal from '@/components/registration-review-modal';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import { formatDateTime, relativeTime } from '@/lib/formatters';
import { getSupabaseBrowserClient, getSupabaseSessionSafely } from '@/lib/supabase/client';
import { hardDeleteUser, softDeleteUser, updateUserApproval, updateUserRole } from '../../../lib/frontend-data/store';
import { useAppState } from '../../../lib/frontend-data/use-app-state';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

type AccountRole = 'admin' | 'resident' | 'staff';

function approvalTone(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'admin_approved') return 'success';
  if (status === 'staff_rejected' || status === 'admin_rejected') return 'danger';
  return 'warning';
}

function approvalLabel(status: string, locale: 'en' | 'fil'): string {
  if (status === 'pending_staff_review') return locale === 'fil' ? 'Pending Staff Review' : 'Pending Staff Review';
  if (status === 'staff_forwarded_to_admin') return locale === 'fil' ? 'Pending Admin Approval' : 'Pending Admin Approval';
  if (status === 'staff_rejected') return locale === 'fil' ? 'Rejected by Staff' : 'Rejected by Staff';
  if (status === 'admin_rejected') return locale === 'fil' ? 'Rejected by Admin' : 'Rejected by Admin';
  return locale === 'fil' ? 'Approved' : 'Approved';
}

export default function AdminUsersPage() {
  const { state, user, locale } = useAppState();
  const pageCopy = getRolePageCopy('admin/users');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [userSearch, setUserSearch] = useState('');
  const [openActionsForUserId, setOpenActionsForUserId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ left: number; top: number } | null>(null);
  const [menuPlacement, setMenuPlacement] = useState<'above' | 'below'>('above');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<
    | { open: false }
    | { open: true; type: 'soft' | 'permanent'; userId: string; fullName: string }
  >({ open: false });
  const [confirmInput, setConfirmInput] = useState('');
  const [reviewDialog, setReviewDialog] = useState<
    | { open: false }
    | { open: true; userId: string; fullName: string; email?: string; phone?: string; addressLine?: string; sex?: string; civilStatus?: string; citizenship?: string; birthdate?: string; province?: string; city?: string; barangay?: string; idType?: string; idNumber?: string; idFileName?: string; staffReviewNote?: string; staffReviewedAt?: string; idFilePathFront?: string; idFilePathBack?: string; updatedAt?: string; approvalStatus?: string }
  >({ open: false });
  const [adminReviewNote, setAdminReviewNote] = useState('');
  const [adminIdFrontPreviewLoadFailed, setAdminIdFrontPreviewLoadFailed] = useState(false);
  const [adminIdBackPreviewLoadFailed, setAdminIdBackPreviewLoadFailed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected' | 'archived'>('all');
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  useBodyScrollLock(Boolean(isCreateFormOpen || confirmDialog.open || reviewDialog.open));

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    const matches = !query
      ? state.users
      : state.users.filter((item) => {
        // If the user typed an exact role name, match by role exactly
        if (['admin', 'staff', 'resident'].includes(query)) {
          return item.role === query;
        }
        // General search: match name, email, or role (but not approvalStatus)
        const searchable = `${item.fullName} ${item.email} ${item.role}`.toLowerCase();
        return searchable.includes(query);
      });

    return [...matches].sort((a, b) => {
      const aSortAt = new Date(a.updatedAt || a.createdAt).getTime();
      const bSortAt = new Date(b.updatedAt || b.createdAt).getTime();
      if (aSortAt !== bSortAt) return bSortAt - aSortAt;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [state.users, userSearch]);

  // Active visible users: normally exclude pending_staff_review for admins,
  // but if an admin specifically searches for a resident or filters by status,
  // show them all statuses so they can perform early reviews if needed.
  const activeVisible = useMemo(() => {
    return filteredUsers.filter((u) => {
      if (u.isDeleted) return false;
      // Hide accounts still pending staff review from admin listing.
      // Do NOT bypass this when the admin uses the search box.
      return u.approvalStatus !== 'pending_staff_review';
    });
  }, [filteredUsers, userSearch]);

  // Pagination
  const PAGE_SIZE = 10;

  function classifyStatus(status: string, isDeleted?: boolean): 'approved' | 'pending' | 'rejected' | 'archived' {
    if (isDeleted) return 'archived';
    if (status === 'admin_approved') return 'approved';
    if (status === 'staff_rejected' || status === 'admin_rejected') return 'rejected';
    return 'pending';
  }

  const statusFilteredUsers = useMemo(() => {
    // Base set depends on whether we're viewing archived-only or active users
    const base = showArchivedOnly ? filteredUsers.filter((u) => u.isDeleted) : activeVisible;
    // When viewing archived (deleted) accounts, show all deleted accounts
    // regardless of any approval/status filter.
    if (showArchivedOnly) return base;
    if (statusFilter === 'all') return base;
    return base.filter((u) => classifyStatus(u.approvalStatus, u.isDeleted) === statusFilter);
  }, [filteredUsers, statusFilter, showArchivedOnly]);

  const reviewDetailGroups = useMemo(
    () => [
      {
        title: locale === 'fil' ? 'Impormasyon ng User' : 'User Information',
        items: [
          { label: locale === 'fil' ? 'Resident ID' : 'Resident ID', value: reviewDialog.open ? reviewDialog.userId : '-' },
          { label: locale === 'fil' ? 'Buong Pangalan' : 'Full Name', value: reviewDialog.open ? reviewDialog.fullName ?? '-' : '-' },
          { label: locale === 'fil' ? 'Kasarian' : 'Sex', value: reviewDialog.open ? reviewDialog.sex ?? '-' : '-' },
          { label: locale === 'fil' ? 'Civil Status' : 'Civil Status', value: reviewDialog.open ? reviewDialog.civilStatus ?? '-' : '-' },
          { label: locale === 'fil' ? 'Citizenship' : 'Citizenship', value: reviewDialog.open ? reviewDialog.citizenship ?? '-' : '-' },
          { label: locale === 'fil' ? 'Birthdate' : 'Birthdate', value: reviewDialog.open ? reviewDialog.birthdate ?? '-' : '-' },
        ],
      },
      {
        title: locale === 'fil' ? 'Impormasyon sa Contact' : 'Contact Information',
        items: [
          {
            label: locale === 'fil' ? 'House/Unit/Building/Village/Street' : 'House/Unit/Building/Village/Street',
            value: reviewDialog.open ? reviewDialog.addressLine ?? '-' : '-',
          },
          { label: locale === 'fil' ? 'Province' : 'Province', value: reviewDialog.open ? reviewDialog.province ?? '-' : '-' },
          { label: locale === 'fil' ? 'City' : 'City', value: reviewDialog.open ? reviewDialog.city ?? '-' : '-' },
          { label: locale === 'fil' ? 'Barangay' : 'Barangay', value: reviewDialog.open ? reviewDialog.barangay ?? '-' : '-' },
          { label: locale === 'fil' ? 'Contact Number' : 'Contact Number', value: reviewDialog.open ? reviewDialog.phone ?? '-' : '-' },
        ],
      },
      {
        title: locale === 'fil' ? 'Account Credentials' : 'Account Credentials',
        items: [
          { label: 'Email', value: reviewDialog.open ? reviewDialog.email ?? '-' : '-' },
          { label: 'ID Type', value: reviewDialog.open ? reviewDialog.idType ?? '-' : '-' },
          { label: 'ID Number', value: reviewDialog.open ? reviewDialog.idNumber ?? '-' : '-' },
        ],
      },
      {
        title: locale === 'fil' ? 'Dokumento ng ID' : 'ID Document',
        items: [
          { label: locale === 'fil' ? 'Staff Note' : 'Staff Note', value: reviewDialog.open ? reviewDialog.staffReviewNote ?? '-' : '-' },
          { label: locale === 'fil' ? 'Huling Update' : 'Last updated', value: reviewDialog.open && reviewDialog.updatedAt ? formatDateTime(reviewDialog.updatedAt, locale) : '-' },
        ],
      },
    ],
    [locale, reviewDialog]
  );

  // Reposition or close menu on scroll/resize or outside clicks
  useEffect(() => {
    if (!openActionsForUserId) return;

    function recompute() {
      const btn = document.querySelector<HTMLElement>(`[data-action-btn=\"${openActionsForUserId}\"]`);
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
      const btn = document.querySelector<HTMLElement>(`[data-action-btn=\"${openActionsForUserId}\"]`);
      if (btn && (btn === target || btn.contains(target))) return;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenActionsForUserId(null);
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
  }, [openActionsForUserId]);

  // Prevent background scrolling when any modal/pop-up is open
  useEffect(() => {
    const anyOpen = (reviewDialog as any).open || (confirmDialog as any).open || isCreateFormOpen;
    if (typeof window === 'undefined') return;
    if (anyOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [reviewDialog, confirmDialog, isCreateFormOpen]);

  // Helper to show transient feedback
  function showActionFeedback(tone: 'success' | 'error' | 'info', text: string) {
    setActionFeedback({ tone, text });
    window.setTimeout(() => setActionFeedback(null), 4000);
  }

  // Action handlers with feedback
  async function handleUpdateRole(userId: string, role: AccountRole) {
    setOpenActionsForUserId(null);
    setMenuCoords(null);
    try {
      await updateUserRole(userId, role);
      showActionFeedback('success', locale === 'fil' ? 'Nagbago na ang role.' : 'Role updated successfully.');
    } catch (err: any) {
      showActionFeedback('error', err?.message ?? (locale === 'fil' ? 'Hindi nagbago ang role.' : 'Unable to update role.'));
    }
  }

  async function handleUpdateApproval(userId: string, status: string, reviewNote?: string) {
    setOpenActionsForUserId(null);
    setMenuCoords(null);
    try {
      await updateUserApproval(userId, status as any, reviewNote);
      showActionFeedback('success', locale === 'fil' ? 'Nagbago na ang status.' : 'Status updated successfully.');
    } catch (err: any) {
      showActionFeedback('error', err?.message ?? (locale === 'fil' ? 'Hindi nagbago ang status.' : 'Unable to update status.'));
    }
  }

  async function handleSoftDelete(userId: string, isDeleted: boolean) {
    setOpenActionsForUserId(null);
    setMenuCoords(null);
    try {
      await softDeleteUser(userId, isDeleted);
      showActionFeedback('success', isDeleted ? (locale === 'fil' ? 'Na-delete na.' : 'Deleted successfully.') : (locale === 'fil' ? 'Na-restore na.' : 'Restored successfully.'));
    } catch (err: any) {
      showActionFeedback('error', err?.message ?? (locale === 'fil' ? 'Hindi natapos ang aksyon.' : 'Unable to complete action.'));
    }
  }

  async function handleHardDelete(userId: string) {
    setOpenActionsForUserId(null);
    setMenuCoords(null);
    try {
      await hardDeleteUser(userId);
      showActionFeedback('success', locale === 'fil' ? 'Permanenteng nabura.' : 'Permanently deleted.');
    } catch (err: any) {
      showActionFeedback('error', err?.message ?? (locale === 'fil' ? 'Hindi natapos ang permanenteng pagbura.' : 'Unable to permanently delete.'));
    }
  }

  const totalPages = Math.max(1, Math.ceil(statusFilteredUsers.length / PAGE_SIZE));
  useEffect(() => {
    setCurrentPage((p) => (p > totalPages ? totalPages : p));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [userSearch, filteredUsers.length, statusFilter]);

  useEffect(() => {
    // Reset page when toggling archived view
    setCurrentPage(1);
  }, [showArchivedOnly]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return statusFilteredUsers.slice(start, start + PAGE_SIZE);
  }, [statusFilteredUsers, currentPage]);

  const newestAccountTimestamp = useMemo(() => {
    if (!statusFilteredUsers.length) return null;
    return statusFilteredUsers[0]?.updatedAt || statusFilteredUsers[0]?.createdAt || null;
  }, [statusFilteredUsers]);

  const recentSortDescription = locale === 'fil'
    ? 'Nakaayos mula pinakahuling na-update o nalikhang account.'
    : 'Sorted by most recently updated or created account.';

  const usersCountText = locale === 'fil'
    ? `${statusFilteredUsers.length} user${statusFilteredUsers.length === 1 ? '' : 's'}`
    : `${statusFilteredUsers.length} user${statusFilteredUsers.length === 1 ? '' : 's'}`;

  const onCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateFeedback(null);
    setIsCreating(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await getSupabaseSessionSafely(supabase);
      const token = sessionData.session?.access_token;
      if (!token) {
        setCreateFeedback({
          tone: 'error',
          text: locale === 'fil' ? 'Kailangan muna ng valid admin session.' : 'A valid admin session is required first.',
        });
        return;
      }

      const response = await fetch('/api/admin/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName,
          middleName: middleName.trim() || undefined,
          lastName,
          email,
          password,
          role,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setCreateFeedback({
          tone: 'error',
          text: payload.error ?? (locale === 'fil' ? 'Hindi nagawa ang account.' : 'Unable to create the account.'),
        });
        return;
      }

      setFirstName('');
      setMiddleName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setRole('staff');
      setCreateFeedback({
        tone: 'success',
        text: locale === 'fil' ? 'Nagawa na ang account at naka-assign ang role.' : 'Account created and role assigned successfully.',
      });
      setIsCreateFormOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <PortalShell role="admin" title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {/* Top guide card removed per request */}

      {/* Create Account card removed — replaced by a popup trigger inside the Users section */}

      <section className="rounded-lg border border-[color:var(--border)] bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h3 className="font-semibold text-lg">{locale === 'fil' ? 'Access ng User' : 'User Access'}</h3>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="w-full flex-1 md:max-w-[420px]">
            <label className="grid gap-1 text-sm">
              <span>{locale === 'fil' ? 'Hanapin ang user' : 'Search users'}</span>
              <Input
                className="w-full"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder={locale === 'fil' ? 'Pangalan, email, o role' : 'Name, email, or role'}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!showArchivedOnly ? (
              <Button
                type="button"
                variant="residentOutline"
                onClick={() => setIsCreateFormOpen(true)}
                className="whitespace-nowrap"
              >
                {locale === 'fil' ? 'Gumawa ng Account' : 'Create Account'}
              </Button>
            ) : null}
            {/* Toggle between viewing deleted accounts and viewing all accounts */}
            <Button
              type="button"
              variant="destructiveOutline"
              onClick={() => {
                setShowArchivedOnly((prev) => !prev);
                setOpenActionsForUserId(null);
                setCurrentPage(1);
                // When switching to archived view, clear status filtering so
                // all deleted accounts are shown regardless of previous filter
                setStatusFilter('all');
              }}
              className="whitespace-nowrap"
            >
              {showArchivedOnly
                ? (locale === 'fil' ? 'Tingnan lahat ng account' : 'View Active Accounts')
                : (locale === 'fil' ? 'Mga Tinanggal na Account' : 'Deleted Accounts')}
            </Button>
          </div>
        </div>
        <div className="mt-3">
          <div className="mt-2 flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-[color:var(--portal-ink-500)]">
              {usersCountText} · {recentSortDescription}
              {newestAccountTimestamp ? ` · ${locale === 'fil' ? 'Pinakahuli' : 'Latest'}: ${relativeTime(newestAccountTimestamp, locale)}` : ''}
            </p>
            {!showArchivedOnly ? (
              <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`rounded px-3 py-1 text-sm ${statusFilter === 'all' ? 'bg-[color:var(--portal-border-soft)]' : 'hover:bg-[color:var(--portal-border-soft)]'}`}
                onClick={() => setStatusFilter('all')}
              >
                  {locale === 'fil' ? 'Lahat' : 'All'} ({activeVisible.length})
              </button>
              <button
                type="button"
                className={`rounded px-3 py-1 text-sm ${statusFilter === 'approved' ? 'bg-[color:#ecfdf5]' : 'hover:bg-[color:#ecfdf5]'}`}
                onClick={() => setStatusFilter('approved')}
              >
                {locale === 'fil' ? 'Aprubado' : 'Approved'} ({activeVisible.filter(u => classifyStatus(u.approvalStatus, u.isDeleted) === 'approved').length})
              </button>
              <div className="relative">
                <button
                  type="button"
                  className={`rounded px-3 py-1 text-sm ${statusFilter === 'pending' ? 'bg-[color:#fff7ed]' : 'hover:bg-[color:#fff7ed]'}`}
                  onClick={() => setStatusFilter('pending')}
                >
                  {locale === 'fil' ? 'Pending' : 'Pending'} ({activeVisible.filter(u => classifyStatus(u.approvalStatus, u.isDeleted) === 'pending').length})
                </button>
                {activeVisible.filter(u => classifyStatus(u.approvalStatus, u.isDeleted) === 'pending').length > 0 && (
                  <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full" />
                )}
              </div>
              <button
                type="button"
                className={`rounded px-3 py-1 text-sm ${statusFilter === 'rejected' ? 'bg-[color:#fff1f2]' : 'hover:bg-[color:#fff1f2]'}`}
                onClick={() => setStatusFilter('rejected')}
              >
                {locale === 'fil' ? 'Tinanggihan' : 'Rejected'} ({activeVisible.filter(u => classifyStatus(u.approvalStatus, u.isDeleted) === 'rejected').length})
              </button>
              {/* Archived filter removed from sort buttons per request */}
              
            </div>
            ) : null}
          </div>
        </div>
        {actionFeedback ? (
          <div className="mt-3">
            <FormFeedback tone={actionFeedback.tone} text={actionFeedback.text} />
          </div>
        ) : null}
        {!state.users.length ? (
          <div className="mt-3">
            <EmptyState
              title={locale === 'fil' ? 'Walang users pa' : 'No users yet'}
              description={locale === 'fil'
                ? 'Lalabas dito ang mga account kapag may rehistrasyon.'
                : 'Registered user accounts will appear here.'}
            />
          </div>
        ) : statusFilteredUsers.length === 0 ? (
          <div className="mt-3">
            {(() => {
              const query = userSearch.trim();
              if (query) {
                return (
                  <EmptyState
                    title={locale === 'fil' ? 'Walang match' : 'No match'}
                    description={locale === 'fil' ? 'Walang resulta para sa iyong hinanap.' : 'No results for your search.'}
                  />
                );
              }

              // No search query — show a status-specific message when filters produce no results
              if (!query && statusFilter !== 'all') {
                const label = statusFilter === 'pending' ? (locale === 'fil' ? 'Walang pending users' : 'No pending users') : statusFilter === 'approved' ? (locale === 'fil' ? 'Walang aprubadong users' : 'No approved users') : (locale === 'fil' ? 'Walang tugmang user' : 'No matching users');
                const desc = statusFilter === 'pending'
                  ? (locale === 'fil' ? 'Walang account na naka-pending sa staff review.' : 'There are no accounts pending staff review.')
                  : statusFilter === 'approved'
                    ? (locale === 'fil' ? 'Walang aprubadong account sa kasalukuyan.' : 'There are no approved accounts at the moment.')
                    : (locale === 'fil' ? 'Walang tugmang user' : 'No matching users');

                return (
                  <EmptyState
                    title={label}
                    description={desc}
                  />
                );
              }

              // Fallback when no results and no special case
              return (
                <EmptyState
                  title={locale === 'fil' ? 'Walang tugmang user' : 'No matching users'}
                  description={locale === 'fil' ? 'Subukang baguhin ang search keyword.' : 'Try adjusting your search keyword.'}
                />
              );
            })()}
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="block md:hidden space-y-3 mt-3">
              {paginatedUsers.map((item) => {
                const cls = classifyStatus(item.approvalStatus, item.isDeleted);
                const tone = cls === 'approved' ? 'success' : cls === 'rejected' || cls === 'archived' ? 'danger' : 'warning';
                const label = cls === 'approved'
                  ? (locale === 'fil' ? 'Aprubado' : 'Approved')
                  : cls === 'rejected'
                    ? (locale === 'fil' ? 'Tinanggihan' : 'Rejected')
                    : cls === 'archived'
                      ? (locale === 'fil' ? 'Nabura' : 'Deleted')
                      : (locale === 'fil' ? 'Pending' : 'Pending');

                return (
                  <div key={`mob-user-${item.id}`} className="rounded-xl border border-[color:var(--portal-border-soft)] bg-white p-3.5 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="font-mono text-[10px] text-[color:var(--portal-ink-500)] bg-[color:var(--portal-surface-2)] px-1.5 py-0.5 rounded select-all">
                            {item.id}
                          </span>
                          <StatusBadge tone="neutral">{item.role}</StatusBadge>
                          <StatusBadge tone={item.isVerified ? 'success' : 'warning'}>
                            {item.isVerified ? (locale === 'fil' ? 'Verified' : 'Verified') : locale === 'fil' ? 'Unverified' : 'Unverified'}
                          </StatusBadge>
                        </div>
                        <h4 className="text-sm font-bold text-[color:var(--portal-ink-900)] leading-tight">{item.fullName}</h4>
                        <p className="mt-0.5 text-xs text-[color:var(--portal-ink-600)] truncate">{item.email}</p>
                      </div>
                      <StatusBadge tone={tone}>{label}</StatusBadge>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-[color:var(--portal-border-soft)] pt-2.5 text-xs text-[color:var(--portal-ink-500)]">
                      <div>
                        <span>{formatDateTime(item.updatedAt || item.createdAt, locale)}</span>
                        <span className="ml-1 text-[11px] text-[color:var(--portal-ink-400)]">({relativeTime(item.updatedAt || item.createdAt, locale)})</span>
                      </div>
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          className="font-semibold text-emerald-800 hover:text-emerald-950 px-3"
                          onClick={(e) => {
                            const button = e.currentTarget as HTMLElement;
                            const rect = button.getBoundingClientRect();
                            const menuWidth = 224;
                            const menuEstimateHeight = 200;
                            let left = rect.right - menuWidth;
                            left = Math.min(Math.max(left, 12), window.innerWidth - 12 - menuWidth);

                            const spaceBelow = window.innerHeight - rect.bottom;
                            const spaceAbove = rect.top;
                            const placeBelow = spaceBelow >= menuEstimateHeight + 12;

                            const isOpening = openActionsForUserId !== item.id;
                            setOpenActionsForUserId(isOpening ? item.id : null);
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
                          disabled={item.id === user?.id}
                          data-action-btn={item.id}
                        >
                          {locale === 'fil' ? 'Aksyon' : 'Actions'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Table */}
            <div className="mt-3 hidden md:block overflow-x-auto rounded-xl border border-[color:var(--portal-border-soft)]">
              <table className="w-full text-sm table-fixed min-w-[900px]">
                <thead>
                  <tr className="border-b border-[color:var(--portal-border-soft)] bg-emerald-50/40 text-[color:var(--portal-ink-700)]">
                    <th className="py-2.5 px-3 align-middle text-left font-bold" style={{ width: '12%' }}>ID</th>
                    <th className="py-2.5 px-3 align-middle text-left font-bold" style={{ width: '18%' }}>{locale === 'fil' ? 'Pangalan' : 'Name'}</th>
                    <th className="py-2.5 px-3 align-middle text-left font-bold" style={{ width: '22%' }}>{locale === 'fil' ? 'Email' : 'Email'}</th>
                    <th className="py-2.5 px-2 align-middle text-center font-bold" style={{ width: '8%' }}>{locale === 'fil' ? 'Role' : 'Role'}</th>
                    <th className="py-2.5 px-3 align-middle text-center font-bold" style={{ width: '14%' }}>{locale === 'fil' ? 'Huling update' : 'Last updated'}</th>
                    <th className="py-2.5 px-2 align-middle text-center font-bold" style={{ width: '8%' }}>{locale === 'fil' ? 'Verification' : 'Verification'}</th>
                    <th className="py-2.5 px-2 align-middle text-center font-bold" style={{ width: '8%' }}>{locale === 'fil' ? 'Katayuan' : 'Status'}</th>
                    <th className="py-2.5 px-3 align-middle text-center font-bold" style={{ width: '10%' }}>{locale === 'fil' ? 'Aksyon' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((item) => (
                    <tr key={item.id} className="border-b border-[color:var(--portal-border-soft)] hover:bg-emerald-50/20">
                      <td className="py-2.5 px-3 font-mono text-[10px] text-[color:var(--portal-ink-500)] select-all truncate">{item.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-[color:var(--portal-ink-900)] text-left truncate">{item.fullName}</td>
                      <td className="py-2.5 px-3 text-[color:var(--portal-ink-700)] text-left truncate">{item.email}</td>
                      <td className="py-2.5 px-2 text-center align-middle">
                        <StatusBadge tone="neutral">{item.role}</StatusBadge>
                      </td>
                      <td className="py-2.5 px-3 text-center align-middle text-xs">
                        <div>{formatDateTime(item.updatedAt || item.createdAt, locale)}</div>
                        <p className="text-[11px] text-[color:var(--portal-ink-500)]">{relativeTime(item.updatedAt || item.createdAt, locale)}</p>
                      </td>
                      <td className="py-2.5 px-2 text-center align-middle">
                        <StatusBadge tone={item.isVerified ? 'success' : 'warning'}>
                          {item.isVerified ? (locale === 'fil' ? 'Verified' : 'Verified') : locale === 'fil' ? 'Pending' : 'Pending'}
                        </StatusBadge>
                      </td>
                      <td className="py-2 pr-2 text-center align-middle">
                        {(() => {
                          const cls = classifyStatus(item.approvalStatus, item.isDeleted);
                          const tone = cls === 'approved' ? 'success' : cls === 'rejected' || cls === 'archived' ? 'danger' : 'warning';
                          const label = cls === 'approved'
                            ? (locale === 'fil' ? 'Aprubado' : 'Approved')
                            : cls === 'rejected'
                              ? (locale === 'fil' ? 'Tinanggihan' : 'Rejected')
                                : cls === 'archived'
                                ? (locale === 'fil' ? 'Nabura' : 'Deleted')
                                : (locale === 'fil' ? 'Pending' : 'Pending');
                          return <StatusBadge tone={tone}>{label}</StatusBadge>;
                        })()}
                      </td>
                      {/* Archived cell removed */}
                      <td className="py-2 pr-2">
                        <div className="relative inline-block text-left">
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={(e) => {
                              const button = e.currentTarget as HTMLElement;
                              const rect = button.getBoundingClientRect();
                              const menuWidth = 224; // matches w-56
                              const menuEstimateHeight = 200; // approx height
                              let left = rect.right - menuWidth;
                              left = Math.min(Math.max(left, 12), window.innerWidth - 12 - menuWidth);

                              const spaceBelow = window.innerHeight - rect.bottom;
                              const spaceAbove = rect.top;
                              const placeBelow = spaceBelow >= menuEstimateHeight + 12;

                              const isOpening = openActionsForUserId !== item.id;
                              setOpenActionsForUserId(isOpening ? item.id : null);
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
                            disabled={item.id === user?.id}
                            data-action-btn={item.id}
                          >
                            {locale === 'fil' ? 'Mga Aksyon' : 'Actions'}
                          </Button>

                          {openActionsForUserId === item.id && menuCoords ? (
                            <div
                              ref={menuRef}
                              className="z-50 w-56 rounded-md border border-[color:var(--portal-border-soft)] bg-white p-2 shadow-lg"
                              style={{ position: 'fixed', left: menuCoords.left, top: menuCoords.top, transform: menuPlacement === 'above' ? 'translateY(-100%)' : 'none' }}
                            >
                              {item.isDeleted ? (
                                // When viewing deleted accounts, only offer Restore and Permanently Delete
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    className="mb-1 w-full justify-start rounded-xl px-3 py-2 text-sm last:mb-0"
                                    onClick={() => { void handleSoftDelete(item.id, false); }}
                                  >
                                    {locale === 'fil' ? 'Ibalik' : 'Restore'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    className="w-full justify-start rounded-xl px-3 py-2 text-sm text-[color:#9f1239] hover:bg-[color:#fff1f2] hover:text-[color:#881337]"
                                    onClick={() => {
                                      setConfirmInput('');
                                      setConfirmDialog({ open: true, type: 'permanent', userId: item.id, fullName: item.fullName });
                                    }}
                                    disabled={item.id === user?.id}
                                  >
                                    {locale === 'fil' ? 'Permanenteng Burahin' : 'Permanently Delete'}
                                  </Button>
                                </>
                              ) : (
                                // Normal actions for active users
                                <>
                                  {item.role === 'admin' && item.id !== user?.id ? (
                                    <p className="px-2 py-1 text-xs text-[color:var(--text-700)]">
                                      {locale === 'fil'
                                        ? 'Hindi puwedeng baguhin ang role ng ibang admin.'
                                        : "You can't change another admin's role."}
                                    </p>
                                  ) : null}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    className="mb-1 w-full justify-start rounded-xl px-3 py-2 text-sm last:mb-0"
                                    onClick={() => { void handleUpdateRole(item.id, 'resident'); }}
                                    disabled={
                                      item.role === 'resident' ||
                                      (item.role === 'admin' && item.id !== user?.id) ||
                                      item.approvalStatus === 'staff_rejected' ||
                                      item.approvalStatus === 'admin_rejected'
                                    }
                                  >
                                    {locale === 'fil' ? 'Gawing Resident' : 'Set as Resident'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    className="mb-1 w-full justify-start rounded-xl px-3 py-2 text-sm last:mb-0"
                                    onClick={() => { void handleUpdateRole(item.id, 'staff'); }}
                                    disabled={
                                      item.role === 'staff' ||
                                      (item.role === 'admin' && item.id !== user?.id) ||
                                      item.approvalStatus === 'staff_rejected' ||
                                      item.approvalStatus === 'admin_rejected'
                                    }
                                  >
                                    {locale === 'fil' ? 'Gawing Staff' : 'Set as Staff'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    className="mb-1 w-full justify-start rounded-xl px-3 py-2 text-sm last:mb-0"
                                    onClick={() => { void handleUpdateRole(item.id, 'admin'); }}
                                    disabled={
                                      item.role === 'admin' ||
                                      item.approvalStatus === 'staff_rejected' ||
                                      item.approvalStatus === 'admin_rejected'
                                    }
                                  >
                                    {locale === 'fil' ? 'Gawing Admin' : 'Set as Admin'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    className="mb-1 w-full justify-start rounded-xl px-3 py-2 text-sm last:mb-0"
                                    onClick={async () => {
                                      setAdminReviewNote('');
                                      setAdminIdFrontPreviewLoadFailed(false);
                                      setAdminIdBackPreviewLoadFailed(false);

                                      // Get fresh links
                                      let idFilePathFront = item.idFilePath;
                                      let idFilePathBack = item.idFilePathBack;

                                      try {
                                        const supabase = getSupabaseBrowserClient();
                                        const { data: sessionData } = await getSupabaseSessionSafely(supabase);
                                        const token = sessionData.session?.access_token;

                                        if (token) {
                                          // Prefer loading the registration review record (same source as staff)
                                          const response = await fetch(`/api/v1/users?role=resident&search=${encodeURIComponent(item.fullName)}`, {
                                            headers: { Authorization: `Bearer ${token}` }
                                          });
                                          const payload = await response.json();
                                          if (payload && payload.success && payload.data.users.length > 0) {
                                            const match = payload.data.users.find((u: any) => u.id === item.id) ?? payload.data.users[0];
                                            if (match) {
                                              idFilePathFront = match.id_file_url ?? match.id_file_path ?? idFilePathFront;
                                              idFilePathBack = match.id_file_url_back ?? match.id_file_path_back ?? idFilePathBack;
                                              // attach the API result to the item so we can prefer those fields
                                              (item as any)._apiMatch = match;
                                            }
                                          }
                                        }
                                      } catch (err) {
                                        console.error('Failed to fetch fresh ID links', err);
                                      }
                                      // If we loaded an API match, prefer its registration fields (including province)
                                      const api = (item as any)._apiMatch;
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

                                      setReviewDialog({
                                        open: true,
                                        userId: item.id,
                                        fullName: item.fullName,
                                        email: api?.email ?? item.email,
                                        phone: api?.phone ?? item.phone,
                                        addressLine: api?.address_line ?? api?.address ?? item.addressLine,
                                        sex: api?.sex ?? (item as any).sex,
                                        civilStatus: api?.civil_status ?? (item as any).civilStatus,
                                        citizenship: api?.citizenship ?? (item as any).citizenship,
                                        birthdate: api?.birthdate ?? (item as any).birthdate,
                                        province: api?.province ?? deriveProvinceFromAddress(api?.address) ?? (item as any).province,
                                        city: api?.city ?? (item as any).city,
                                        barangay: api?.barangay ?? (item as any).barangay,
                                        idType: api?.id_type ?? (item as any).idType,
                                        idNumber: api?.id_number ?? (item as any).idNumber,
                                        idFileName: api?.id_file_name ?? item.idFileName,
                                        staffReviewNote: api?.staff_review_note ?? item.staffReviewNote,
                                        staffReviewedAt: api?.staff_reviewed_at ?? item.staffReviewedAt,
                                        idFilePathFront,
                                        idFilePathBack,
                                        updatedAt: api?.updated_at ?? item.updatedAt,
                                        approvalStatus: api?.approval_status ?? item.approvalStatus,
                                      });
                                    }}
                                    disabled={item.role !== 'resident'}
                                  >
                                    {locale === 'fil' ? 'Suriin' : 'Review'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    className="mb-1 w-full justify-start rounded-xl px-3 py-2 text-sm last:mb-0"
                                    onClick={() => {
                                      if (!item.isDeleted) {
                                        setConfirmDialog({ open: true, type: 'soft', userId: item.id, fullName: item.fullName });
                                        setConfirmInput('');
                                        return;
                                      }
                                      void handleSoftDelete(item.id, false);
                                    }}
                                  >
                                    {item.isDeleted ? (locale === 'fil' ? 'Ibalik' : 'Restore') : (locale === 'fil' ? 'Tanggalin' : 'Delete')}
                                  </Button>
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[color:var(--portal-border-soft)] pt-3">
              <div className="text-xs sm:text-sm text-[color:var(--portal-ink-500)] text-center sm:text-left">
                {statusFilteredUsers.length === 0
                  ? ''
                  : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, statusFilteredUsers.length)} of ${statusFilteredUsers.length}`}
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="text-xs sm:text-sm"
                >
                  {locale === 'fil' ? 'Nakaraan' : 'Previous'}
                </Button>
                <div className="text-xs sm:text-sm font-semibold px-2 text-[color:var(--portal-ink-600)]">{`${currentPage} / ${totalPages}`}</div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="text-xs sm:text-sm"
                >
                  {locale === 'fil' ? 'Susunod' : 'Next'}
                </Button>
              </div>
            </div>
          </>
        )}
      </section>

      {isCreateFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-lg" onClick={() => setIsCreateFormOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-3 flex items-start justify-between">
              <h3 className="font-heading text-lg font-semibold">{locale === 'fil' ? 'Gumawa ng Account' : 'Create Account'}</h3>
              <Button type="button" variant="ghost" onClick={() => setIsCreateFormOpen(false)}>×</Button>
            </div>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={onCreateAccount}>
              <label className="grid gap-1 text-sm">
                <span>{locale === 'fil' ? 'Unang pangalan' : 'First name'}</span>
                <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
              </label>
              <label className="grid gap-1 text-sm">
                <span>{locale === 'fil' ? 'Gitnang pangalan (opsyonal)' : 'Middle name (optional)'}</span>
                <Input value={middleName} onChange={(event) => setMiddleName(event.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                <span>{locale === 'fil' ? 'Apelyido' : 'Last name'}</span>
                <Input value={lastName} onChange={(event) => setLastName(event.target.value)} required />
              </label>

              <label className="grid gap-1 text-sm md:col-span-2">
                <span>{locale === 'fil' ? 'Email' : 'Email'}</span>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>
              <label className="grid gap-1 text-sm">
                <span>{locale === 'fil' ? 'Role' : 'Role'}</span>
                <Select value={role} onChange={(event) => setRole(event.target.value as 'admin' | 'staff')}>
                  <option value="admin">{locale === 'fil' ? 'Admin' : 'Admin'}</option>
                  <option value="staff">{locale === 'fil' ? 'Staff' : 'Staff'}</option>
                </Select>
              </label>

              <label className="grid gap-1 text-sm md:col-span-2">
                <span>{locale === 'fil' ? 'Pansamantalang password' : 'Temporary password'}</span>
                <PasswordInput
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>
              <div className="flex items-end md:justify-end">
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="w-full md:w-auto border border-[color:#14543a] bg-[linear-gradient(180deg,#1d7a53_0%,#155f40_100%)] px-6 text-white shadow-[0_10px_24px_rgba(21,95,64,0.32)] hover:bg-[linear-gradient(180deg,#176745_0%,#114f36_100%)]"
                >
                  {isCreating ? (locale === 'fil' ? 'Gumagawa...' : 'Creating...') : locale === 'fil' ? 'Gumawa ng Account' : 'Create Account'}
                </Button>
              </div>
            </form>
            {createFeedback ? (
              <div className="mt-3">
                <FormFeedback tone={createFeedback.tone} text={createFeedback.text} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <RegistrationReviewModal
        open={reviewDialog.open}
        title={locale === 'fil' ? 'I-review ang Registration' : 'Review Registration'}
        onClose={() => setReviewDialog({ open: false })}
        detailsTitle={locale === 'fil' ? 'Review Your Details' : 'Review Your Details'}
        detailGroups={reviewDetailGroups}
        verificationTitle={locale === 'fil' ? 'ID Verification' : 'ID Verification'}
        frontLabel={locale === 'fil' ? 'Front View' : 'Front View'}
        backLabel={locale === 'fil' ? 'Back View' : 'Back View'}
        frontPreviewUrl={reviewDialog.open && !adminIdFrontPreviewLoadFailed ? (reviewDialog.idFilePathFront ?? null) : null}
        backPreviewUrl={reviewDialog.open && !adminIdBackPreviewLoadFailed ? (reviewDialog.idFilePathBack ?? null) : null}
        frontPreviewAlt={locale === 'fil' ? 'Front ID' : 'Front ID'}
        backPreviewAlt={locale === 'fil' ? 'Back ID' : 'Back ID'}
        // Use same unavailable preview messaging as staff page for consistency
        frontPreviewUnavailableText={locale === 'fil' ? 'Hindi available ang preview ngayon.' : 'ID preview is not available right now.'}
        backPreviewUnavailableText={locale === 'fil' ? 'Hindi available ang preview ngayon.' : 'ID preview is not available right now.'}
        onFrontPreviewError={() => setAdminIdFrontPreviewLoadFailed(true)}
        onBackPreviewError={() => setAdminIdBackPreviewLoadFailed(true)}
        onFrontPreviewClick={() => {
          if (reviewDialog.open && reviewDialog.idFilePathFront) {
            window.open(reviewDialog.idFilePathFront, '_blank');
          }
        }}
        onBackPreviewClick={() => {
          if (reviewDialog.open && reviewDialog.idFilePathBack) {
            window.open(reviewDialog.idFilePathBack, '_blank');
          }
        }}
        // Reuse the same note label/placeholder used in staff modal for a consistent UI
        noteLabel={locale === 'fil' ? 'Review note' : 'Review note'}
        notePlaceholder={locale === 'fil' ? 'Required kapag reject' : 'Required when rejecting'}
        noteValue={adminReviewNote}
        onNoteChange={setAdminReviewNote}
        actions={
          <>
            {(() => {
              const status = reviewDialog.open ? reviewDialog.approvalStatus || '' : '';
              const isFinalActionDisabled = status === 'admin_approved' || status === 'staff_rejected';
              const isPendingStaff = status === 'pending_staff_review';

              return (
                <>
                  <Button
                    variant="resident"
                    type="button"
                    onClick={() => {
                      if (!reviewDialog.open) return;
                      void handleUpdateApproval(reviewDialog.userId, 'admin_approved', adminReviewNote);
                      setReviewDialog({ open: false });
                      setAdminReviewNote('');
                    }}
                    disabled={isFinalActionDisabled}
                  >
                    {isPendingStaff
                      ? (locale === 'fil' ? 'Override & Approve' : 'Override & Approve')
                      : (locale === 'fil' ? 'Final Approve' : 'Final Approve')}
                  </Button>
                  <Button
                    variant="destructiveOutline"
                    type="button"
                    onClick={() => {
                      if (!reviewDialog.open) return;
                      void handleUpdateApproval(reviewDialog.userId, 'admin_rejected', adminReviewNote);
                      setReviewDialog({ open: false });
                      setAdminReviewNote('');
                    }}
                    disabled={isFinalActionDisabled}
                  >
                    {locale === 'fil' ? 'Final Reject' : 'Final Reject'}
                  </Button>
                </>
              );
            })()}
          </>
        }
        secondaryMessage={reviewDialog.open && reviewDialog.staffReviewNote ? (
          <div className="rounded-xl border border-orange-100 bg-orange-50 p-3 text-orange-900">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-800">Staff Review Note</p>
            <p className="mt-1 text-sm">{reviewDialog.staffReviewNote}</p>
          </div>
        ) : null}
      />

      {confirmDialog.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-lg px-4 py-6">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-6 shadow-[0_24px_80px_rgba(7,45,25,0.18)]">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-[color:var(--portal-ink-900)]">{locale === 'fil' ? 'Kumpirmahin ang Pagbura' : 'Confirm Deletion'}</h3>
              <p className="mt-2 text-sm leading-6 text-[color:var(--portal-ink-700)]">
                {confirmDialog.type === 'soft'
                  ? (locale === 'fil' ? `Tatanggalin ang account ni ${confirmDialog.fullName}. Sigurado ka ba?` : `This will delete ${confirmDialog.fullName}'s account. Are you sure?`)
                  : (locale === 'fil' ? `Permanenteng tatanggalin ang account ni ${confirmDialog.fullName}. I-type ang DELETE para kumpirmahin.` : `This will permanently delete ${confirmDialog.fullName}'s account. Type DELETE to confirm.`)}
              </p>
            </div>

            {confirmDialog.type === 'permanent' ? (
              <div className="mt-4">
                <Input value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)} placeholder={locale === 'fil' ? 'I-type ang DELETE' : 'Type DELETE'} />
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr]">
              <Button
                type="button"
                variant="destructiveOutline"
                onClick={() => { setConfirmDialog({ open: false }); setConfirmInput(''); }}
                className="w-full"
              >
                {locale === 'fil' ? 'Kanselahin' : 'Cancel'}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                style={{ backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' }}
                onClick={() => {
                  const userId = confirmDialog.userId;
                  if (confirmDialog.type === 'soft') {
                    void handleSoftDelete(userId, true);
                    setConfirmDialog({ open: false });
                    setConfirmInput('');
                    return;
                  }
                  if (confirmInput !== 'DELETE') return;
                  void handleHardDelete(userId);
                  setConfirmDialog({ open: false });
                  setConfirmInput('');
                }}
                
                disabled={confirmDialog.type === 'permanent' && confirmInput !== 'DELETE'}
              >
                {confirmDialog.type === 'permanent' ? (locale === 'fil' ? 'Permanenteng Burahin' : 'Permanently Delete') : (locale === 'fil' ? 'Tanggalin' : 'Delete')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
}
