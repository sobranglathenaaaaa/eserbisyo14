import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Calendar,
  ClipboardCheck,
  FileText,
  Globe,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Pill,
  Users,
  ShieldCheck,
  Menu,
  X,
  Sliders,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UserRole } from '../lib/types/models';
import { PortalShellBase } from './portal-shell-base';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

interface LocalizedLabel {
  en: string;
  fil: string;
}

interface NavItem {
  href: string;
  label: LocalizedLabel;
  hint?: LocalizedLabel;
}

interface NavSection {
  id: string;
  label: LocalizedLabel;
  items: NavItem[];
}

interface LocalizedProp {
  en: string;
  fil: string;
}

const navConfig: Record<UserRole, NavSection[]> = {
  resident: [
    {
      id: 'resident-overview',
      label: { en: 'Start', fil: 'Simula' },
      items: [
        {
          href: '/resident/dashboard',
          label: { en: 'Home', fil: 'Simula' },
          hint: { en: 'Today and next steps', fil: 'Ngayon at susunod na hakbang' },
        },
      ],
    },
    {
      id: 'resident-requests',
      label: { en: 'Documents', fil: 'Dokumento' },
      items: [
        {
          href: '/resident/document-requests',
          label: { en: 'Get Documents', fil: 'Kumuha ng Dokumento' },
          hint: { en: 'Request and track', fil: 'Mag-request at subaybayan' },
        },
        {
          href: '/resident/request-history',
          label: { en: 'Request History', fil: 'Nakaraang Kahilingan' },
          hint: { en: 'Your request history', fil: 'Kasaysayan ng kahilingan' },
        },
        {
          href: '/resident/request-feedback',
          label: { en: 'Give Feedback', fil: 'Magbigay ng Feedback' },
          hint: { en: 'Rate the service', fil: 'I-rate ang serbisyo' },
        },
      ],
    },
    {
      id: 'resident-reservations',
      label: { en: 'Facilities & Equipment', fil: 'Pasilidad at Kagamitan' },
      items: [
        {
          href: '/resident/reservations',
          label: { en: 'Make a Reservation', fil: 'Gumawa ng Reservation' },
          hint: { en: 'Reserve halls, courts, or equipment', fil: 'I-reserve ang mga salo, korte, o kagamitan' },
        },
      ],
    },
    {
      id: 'resident-community',
      label: { en: 'Community', fil: 'Komunidad' },
      items: [
        {
          href: '/resident/blotter-reporting',
          label: { en: 'Report an Incident', fil: 'Mag-ulat ng Insidente' },
          hint: { en: 'Send a report', fil: 'Magpadala ng ulat' },
        },
        {
          href: '/resident/census',
          label: { en: 'My Profile', fil: 'Aking Profile' },
          hint: { en: 'Update details', fil: 'I-update ang detalye' },
        },
      ],
    },
    {
      id: 'resident-tools',
      label: { en: 'Tools', fil: 'Mga Tool' },
      items: [
        {
          href: '/resident/notifications',
          label: { en: 'Notifications', fil: 'Notifications' },
          hint: { en: 'Alerts and messages', fil: 'Mga alert at mensahe' },
        },
        {
          href: '/resident/digital-id',
          label: { en: 'My Digital ID', fil: 'Aking Digital ID' },
          hint: { en: 'Open your ID', fil: 'Buksan ang ID' },
        },
        {
          href: '/resident/ocr',
          label: { en: 'Scan Document', fil: 'I-scan ang Dokumento' },
          hint: { en: 'Extract text', fil: 'Kunin ang text' },
        },
      ],
    },
    {
      id: 'resident-legal',
      label: { en: 'Legal', fil: 'Legal' },
      items: [
        {
          href: '/resident/legal',
          label: { en: 'Legal Content', fil: 'Legal Content' },
          hint: { en: 'Read terms and privacy', fil: 'Basahin ang terms at privacy' },
        },
      ],
    },
  ],
  staff: [
    {
      id: 'staff-overview',
      label: { en: 'Start', fil: 'Simula' },
      items: [
        {
          href: '/staff/dashboard',
          label: { en: 'Home', fil: 'Simula' },
          hint: { en: 'Today’s tasks', fil: 'Gawain ngayong araw' },
        },
        {
          href: '/staff/request-history',
          label: { en: 'Request History', fil: 'History ng mga Kahilingan' },
          hint: { en: 'View resident service history', fil: 'Tingnan ang service history ng mga residente' },
        },
        {
          href: '/staff/census',
          label: { en: 'Resident Census', fil: 'Census ng mga Residente' },
          hint: { en: 'Review household information', fil: 'Tingnan ang impormasyon ng sambahayan' },
        },
      ],
    },
    {
      id: 'staff-work-queue',
      label: { en: 'Work Queue', fil: 'Pila ng Gawain' },
      items: [
        {
          href: '/staff/registration-reviews',
          label: { en: 'Registration Reviews', fil: 'Registration Reviews' },
          hint: { en: 'Check new registrants first', fil: 'Suriin muna ang bagong rehistro' },
        },
        {
          href: '/staff/process-requests',
          label: { en: 'Process Requests', fil: 'Iproseso ang Kahilingan' },
          hint: { en: 'Process incoming requests', fil: 'Iproseso ang mga papasok na kahilingan' },
        },
        {
          href: '/staff/ocr-issuance',
          label: { en: 'Issuance via OCR', fil: 'Issuance via OCR' },
          hint: { en: 'Walk-in indigency issuance', fil: 'Walk-in indigency issuance' },
        },
      ],
    },
    {
      id: 'staff-services',
      label: { en: 'Services', fil: 'Mga Serbisyo' },
      items: [
        {
          href: '/staff/appointments',
          label: { en: 'Appointments', fil: 'Appointments' },
          hint: { en: 'Configure doctor schedules', fil: 'I-configure ang schedule ng doktor' },
        },
        {
          href: '/staff/reservations',
          label: { en: 'Reservations', fil: 'Mga Reservation' },
          hint: { en: 'Review facility and equipment reservations', fil: 'Suriin ang mga reservation' },
        },
        {
          href: '/staff/equipment',
          label: { en: 'Equipment', fil: 'Equipment' },
          hint: { en: 'Manage chairs, tables, and ladders', fil: 'Pamahalaan ang chairs, tables, at ladders' },
        },
        {
          href: '/staff/incidents',
          label: { en: 'Incidents & Concerns', fil: 'Mga Insidente at Concern' },
          hint: { en: 'Review incident blotters and community concerns', fil: 'Suriin ang mga insidente at concern' },
        },
      ],
    },
    {
      id: 'staff-community-monitoring',
      label: { en: 'Community & Monitoring', fil: 'Komunidad at Monitoring' },
      items: [
        {
          href: '/admin/announcements',
          label: { en: 'Announcements', fil: 'Mga Anunsyo' },
          hint: { en: 'Post barangay updates', fil: 'Mag-post ng update' },
        },
        {
          href: '/staff/shared-services/bdrrmc-report',
          label: { en: 'BDRRMC', fil: 'BDRRMC' },
          hint: { en: 'Create BDRRMC reports', fil: 'Gumawa ng BDRRMC ulat' },
        },
        {
          href: '/admin/reports',
          label: { en: 'Reports', fil: 'Mga Ulat' },
          hint: { en: 'Service insights', fil: 'Ulat ng serbisyo' },
        },
        {
          href: '/staff/email-log',
          label: { en: 'Email Logs', fil: 'Log ng mga email' },
          hint: { en: 'Outgoing emails', fil: 'Mga ipinadalang email' },
        },
        {
          href: '/staff/notifications',
          label: { en: 'System Updates', fil: 'Mga Update' },
          hint: { en: 'Alerts and reminders', fil: 'Mga alert at paalala' },
        },
      ],
    },
    {
      id: 'staff-legal',
      label: { en: 'Legal', fil: 'Legal' },
      items: [
        {
          href: '/staff/legal',
          label: { en: 'Legal Content', fil: 'Legal Content' },
          hint: { en: 'Read terms and privacy (read-only)', fil: 'Basahin ang terms at privacy (read-only)' },
        },
      ],
    },
  ],
  admin: [
    {
      id: 'admin-overview',
      label: { en: 'Start', fil: 'Simula' },
      items: [
        {
          href: '/admin/dashboard',
          label: { en: 'Home', fil: 'Simula' },
          hint: { en: 'Daily overview', fil: 'Pangkalahatang view' },
        },
        {
          href: '/admin/request-history',
          label: { en: 'Request History', fil: 'History ng mga Kahilingan' },
          hint: { en: 'View resident service history', fil: 'Tingnan ang service history ng mga residente' },
        },
        {
          href: '/admin/census',
          label: { en: 'Resident Census', fil: 'Census ng mga Residente' },
          hint: { en: 'Review household information', fil: 'Tingnan ang impormasyon ng sambahayan' },
        },
      ],
    },
    {
      id: 'admin-setup',
      label: { en: 'System Setup', fil: 'Setup ng Sistema' },
      items: [
        {
          href: '/admin/users',
          label: { en: 'User Access', fil: 'Access ng User' },
          hint: { en: 'Roles and access', fil: 'Role at access' },
        },
        {
          href: '/admin/document-templates',
          label: { en: 'Document Template', fil: 'Document Template' },
          hint: { en: 'Upload and customize templates', fil: 'Mag-upload at mag-customize ng template' },
        },
      ],
    },
    {
      id: 'admin-services',
      label: { en: 'Services', fil: 'Mga Serbisyo' },
      items: [
        {
          href: '/admin/document-requests',
          label: { en: 'Document Requests', fil: 'Kahilingan sa Dokumento' },
          hint: { en: 'Approve or not approve', fil: 'Aprubahan o hindi' },
        },
        {
          href: '/admin/announcements',
          label: { en: 'Announcements', fil: 'Mga Anunsyo' },
          hint: { en: 'Post barangay updates', fil: 'Mag-post ng update' },
        },
        // Reservations are processed by staff; admin does not have a reservations page here.
        {
          href: '/admin/incidents',
          label: { en: 'Incidents & Concerns', fil: 'Mga Insidente at Concern' },
          hint: { en: 'Review incidents and community concerns', fil: 'Suriin ang mga insidente at concern ng komunidad' },
        },
      ],
    },
    {
      id: 'admin-records-monitoring',
      label: { en: 'History & Monitoring', fil: 'History at Monitoring' },
      items: [
        {
          href: '/admin/reports',
          label: { en: 'Reports', fil: 'Mga Ulat' },
          hint: { en: 'Service insights', fil: 'Ulat ng serbisyo' },
        },
        {
          href: '/admin/email-log',
          label: { en: 'Email Logs', fil: 'Log ng mga email' },
          hint: { en: 'Outgoing emails', fil: 'Mga ipinadalang email' },
        },
        {
          href: '/admin/notifications',
          label: { en: 'System Updates', fil: 'Mga Update' },
          hint: { en: 'Alerts and messages', fil: 'Mga alert at mensahe' },
        },
      ],
    },
    {
      id: 'admin-legal',
      label: { en: 'Legal', fil: 'Legal' },
      items: [
        {
          href: '/admin/legal',
          label: { en: 'Legal Content', fil: 'Legal Content' },
          hint: { en: 'Edit terms and privacy', fil: 'I-edit ang terms at privacy' },
        },
      ],
    },
  ],
};

const primaryActions: Record<UserRole, NavItem> = {
  resident: { href: '/resident/document-requests', label: { en: 'Start a Request', fil: 'Magsimula ng Kahilingan' } },
  staff: { href: '/staff/appointments', label: { en: 'Manage Appointments', fil: 'Pamahalaan ang Appointments' } },
  admin: { href: '/admin/document-requests', label: { en: 'Review Document Requests', fil: 'Suriin ang Kahilingan sa Dokumento' } },
};

const BADGE_STORAGE_KEYS = {
  userAccess: 'eserbisyo-admin-user-access-seen-count',
  staffRegistrationReviews: 'eserbisyo-staff-registration-reviews-seen-count',
  staffAppointments: 'eserbisyo-staff-appointments-seen-count',
  staffReservations: 'eserbisyo-staff-reservations-seen-count',
  documentRequests: 'eserbisyo-admin-document-requests-seen-count',
  staffProcessRequests: 'eserbisyo-staff-process-requests-seen-count',
  incidentReports: 'eserbisyo-admin-incident-reports-seen-count',
} as const;

function readSeenBadgeCount(storageKey: string) {
  if (typeof window === 'undefined') return 0;

  const rawValue = window.sessionStorage.getItem(storageKey);
  const parsedValue = Number(rawValue ?? '0');

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function resolveCopy(locale: 'en' | 'fil', value: string | LocalizedProp) {
  if (typeof value === 'string') return value;
  return locale === 'fil' ? value.fil : value.en;
}

function resolveNavIcon(href: string) {
  if (href.includes('dashboard')) return LayoutDashboard;
  if (href.includes('document-templates')) return Sliders;
  if (href.includes('document-requests')) return FileText;
  if (href.includes('process-requests')) return FileText;
  if (href.includes('requests')) return ClipboardCheck;
  if (href.includes('appointments')) return ClipboardCheck;
  if (href.includes('reservations')) return Calendar;
  if (href.includes('queue')) return ClipboardCheck;
  if (href.includes('email-log')) return Bell;
  if (href.includes('users')) return Users;
  if (href.includes('reports')) return BarChart3;
  if (href.includes('incidents') || href.includes('blotter')) return AlertTriangle;
  if (href.includes('notifications')) return Bell;
  if (href.includes('announcements')) return Megaphone;
  if (href.includes('medicines')) return Pill;
  if (href.includes('legal') || href.includes('terms') || href.includes('privacy')) return FileText;
  return LayoutDashboard;
}

function PortalShellContent({
  role,
  allowedRoles,
  title,
  description,
  children,
  showHero = true,
}: {
  role: UserRole;
  allowedRoles?: UserRole[];
  title: string | LocalizedProp;
  description: string | LocalizedProp;
  children: React.ReactNode;
  showHero?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useBodyScrollLock(isMobileMenuOpen || showLogoutConfirm);
  const [seenBadgeCounts, setSeenBadgeCounts] = useState<Record<keyof typeof BADGE_STORAGE_KEYS, number>>(() => ({
    userAccess: readSeenBadgeCount(BADGE_STORAGE_KEYS.userAccess),
    staffRegistrationReviews: readSeenBadgeCount(BADGE_STORAGE_KEYS.staffRegistrationReviews),
    staffAppointments: readSeenBadgeCount(BADGE_STORAGE_KEYS.staffAppointments),
    staffReservations: readSeenBadgeCount(BADGE_STORAGE_KEYS.staffReservations),
    documentRequests: readSeenBadgeCount(BADGE_STORAGE_KEYS.documentRequests),
    staffProcessRequests: readSeenBadgeCount(BADGE_STORAGE_KEYS.staffProcessRequests),
    incidentReports: readSeenBadgeCount(BADGE_STORAGE_KEYS.incidentReports),
  }));

  return (
    <PortalShellBase role={role} allowedRoles={allowedRoles}>
      {({ locale, setLocale, logoutAndRedirect, user, state }) => {
        const shellRole = allowedRoles?.includes(user.role) ? user.role : role;
        const pendingReservationsCount = state.reservations.filter((reservation) => reservation.status === 'pending').length;
        const navSections = navConfig[shellRole];
        const isNavItemActive = (item: NavItem) => {
          const [itemPath, itemQuery] = item.href.split('?');
          if (pathname !== itemPath && !pathname.startsWith(`${itemPath}/`)) return false;
          return itemQuery ? searchParams.toString() === itemQuery : !item.href.includes('?');
        };
        const activeSection = navSections.find((section) =>
          section.items.some(isNavItemActive)
        );
        const primaryAction = primaryActions[shellRole];
        const roleTitle =
          shellRole === 'admin' ? { en: 'Admin', fil: 'Admin' } : shellRole === 'staff' ? { en: 'Staff', fil: 'Staff' } : { en: 'Resident', fil: 'Resident' };
        const alertsHref =
          shellRole === 'admin'
            ? '/admin/notifications'
            : shellRole === 'staff'
            ? '/staff/notifications'
            : '/resident/notifications';
        const hasStaticSidebarSections = shellRole === 'admin' || shellRole === 'staff';

        return (
          <div className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top,#f7fcf9_0%,#eef6f1_42%,#e6f1ec_100%)] text-[color:var(--portal-ink-900)]">
            <header className="sticky top-0 z-40 border-b border-[color:var(--portal-shell-border)] bg-[color:rgba(13,53,38,0.96)] text-white backdrop-blur">
              <div className="mx-auto flex min-h-[64px] sm:min-h-[80px] md:min-h-[96px] w-full max-w-[1560px] items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3 md:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                  <Image
                    src="/images/progreso.PNG"
                    alt="eSerbisyo logo"
                    width={56}
                    height={56}
                    sizes="(max-width: 640px) 40px, 56px"
                    className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 object-contain shrink-0"
                    unoptimized
                    priority
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-col items-start font-heading leading-tight">
                      <span className="text-xl sm:text-2xl md:text-[2rem] font-serif font-bold tracking-tight text-white">eSerbisyo</span>
                      <span className="hidden sm:inline-block text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--portal-shell-muted)] truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                        {locale === 'fil' ? `${roleTitle.fil} Workspace` : `${roleTitle.en} Workspace`} | Service & Record System
                      </span>
                      <span className="sm:hidden text-[10px] font-medium text-emerald-200/90 truncate">
                        {locale === 'fil' ? `${roleTitle.fil} Portal` : `${roleTitle.en} Portal`}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
                  <Button
                    variant="headerGhost"
                    size="sm"
                    type="button"
                    onClick={() => setLocale(locale === 'en' ? 'fil' : 'en')}
                    className="h-10 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold text-white hover:text-white shrink-0"
                  >
                    <Globe size={15} className="mr-1 sm:mr-1.5 text-emerald-200 shrink-0" />
                    <span className="hidden sm:inline">{locale === 'en' ? 'English' : 'Filipino'}</span>
                    <span className="sm:hidden">{locale === 'en' ? 'EN' : 'FIL'}</span>
                  </Button>

                  <Button
                    variant="headerGhost"
                    size="icon"
                    type="button"
                    aria-label={isMobileMenuOpen ? (locale === 'fil' ? 'Isara ang Menu' : 'Close Menu') : (locale === 'fil' ? 'Buksan ang Menu' : 'Open Menu')}
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="text-white hover:text-white shrink-0 lg:hidden"
                  >
                    {isMobileMenuOpen ? <X size={20} className="text-white shrink-0" /> : <Menu size={20} className="text-white shrink-0" />}
                  </Button>
                </div>
              </div>
            </header>

            {isMobileMenuOpen && (
              <div className="fixed inset-0 z-50 flex lg:hidden">
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="relative z-10 flex w-[280px] sm:w-[320px] flex-col bg-[color:var(--portal-surface-1)] p-4 shadow-2xl overflow-y-auto max-h-screen">
                  <div className="flex items-center justify-between border-b border-[color:var(--portal-border-soft)] pb-3">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/images/progreso.PNG"
                        alt="eSerbisyo logo"
                        width={38}
                        height={38}
                        className="h-9 w-9 object-contain"
                        unoptimized
                      />
                      <div className="flex flex-col">
                        <span className="font-serif text-lg font-bold leading-tight">eSerbisyo</span>
                        <span className="text-[10px] text-[color:var(--portal-ink-500)] uppercase font-semibold">
                          {locale === 'fil' ? `${roleTitle.fil} Menu` : `${roleTitle.en} Menu`}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="h-8 w-8 p-0 rounded-full hover:bg-[color:var(--portal-surface-3)]"
                    >
                      <X size={18} />
                    </Button>
                  </div>

                  <div className="my-3 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-3)] px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-[0.09em] text-[color:var(--portal-ink-500)]">
                      {locale === 'fil' ? 'Naka-login bilang' : 'Signed in as'}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-[color:var(--portal-ink-900)]">{user.email}</p>
                  </div>

                  <nav className="grid gap-3" aria-label="Mobile navigation">
                    {navSections.map((section) => (
                      <div key={section.id} className="rounded-[16px] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-2">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--portal-ink-500)]">
                          {locale === 'fil' ? section.label.fil : section.label.en}
                        </div>
                        <div className="mt-1 grid gap-1 border-t border-[color:var(--portal-border-soft)] pt-1.5">
                          {section.items.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                            const Icon = resolveNavIcon(item.href);
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => {
                                  setIsMobileMenuOpen(false);
                                  if (shellRole === 'staff' && item.href === '/staff/reservations' && pendingReservationsCount > 0) {
                                    setSeenBadgeCounts((current) => ({ ...current, staffReservations: pendingReservationsCount }));
                                    window.sessionStorage.setItem(BADGE_STORAGE_KEYS.staffReservations, String(pendingReservationsCount));
                                  }
                                }}
                                  className={cn(
                                  'relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                                  isActive
                                    ? 'bg-[color:var(--portal-accent-soft)] text-[color:var(--portal-ink-900)] font-semibold'
                                    : 'text-[color:var(--portal-ink-700)] hover:bg-[color:var(--portal-surface-3)]'
                                )}
                              >
                                <Icon size={16} />
                                <span>{locale === 'fil' ? item.label.fil : item.label.en}</span>
                                {shellRole === 'staff' && item.href === '/staff/reservations' && pendingReservationsCount > seenBadgeCounts.staffReservations && !isActive ? (
                                  <span
                                    className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white"
                                    aria-label={`${pendingReservationsCount} pending reservations`}
                                  >
                                    {pendingReservationsCount > 9 ? '9+' : pendingReservationsCount}
                                  </span>
                                ) : null}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </nav>

                  <div className="mt-auto pt-4 border-t border-[color:var(--portal-border-soft)]">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="flex w-full items-center justify-start gap-2 rounded-[var(--portal-radius-md)] px-3 py-2 text-sm font-semibold text-[color:var(--portal-ink-700)] hover:bg-[color:var(--portal-surface-3)]"
                    >
                      <LogOut size={16} />
                      <span>{locale === 'fil' ? 'Mag-logout' : 'Logout'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="mx-auto w-full max-w-[1560px] px-3 py-4 md:px-6 md:py-6">
              <div className="portal-shell-layout grid gap-4 lg:grid-cols-[268px_minmax(0,1fr)] lg:items-start lg:gap-5">
                <aside className="portal-shell-sidebar hidden min-w-0 rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-3 shadow-[var(--portal-shadow-1)] lg:sticky lg:top-[88px] lg:flex lg:flex-col lg:max-h-[calc(100vh-108px)] lg:overflow-y-auto">
                  <div className="mb-3 rounded-[var(--portal-radius-md)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-3)] px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-[0.09em] text-[color:var(--portal-ink-500)]">
                      {locale === 'fil' ? 'Naka-login bilang' : 'Signed in as'}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-[color:var(--portal-ink-900)]">{user.email}</p>
                  </div>

                  <nav className="grid gap-3" aria-label="Portal navigation">
                    {navSections.map((section) => {
                      const hasActiveRoute = section.items.some(isNavItemActive);
                      const sectionBodyId = `portal-nav-section-${section.id}`;

                      return (
                        <div
                          key={section.id}
                          className={cn(
                            'rounded-[18px] border bg-[color:var(--portal-surface-1)] p-2 shadow-[0_1px_0_rgba(14,47,34,0.03)]',
                            hasActiveRoute ? 'border-[color:rgba(47,143,104,0.28)]' : 'border-[color:var(--portal-border-soft)]'
                          )}
                        >
                          <div
                            className={cn(
                              'flex items-center gap-2 rounded-[14px] px-2.5 py-2 text-[11px] uppercase tracking-[0.12em]',
                              hasActiveRoute
                                ? 'bg-[color:var(--portal-accent-soft)] text-[color:var(--portal-ink-900)]'
                                : 'text-[color:var(--portal-ink-500)] hover:bg-[color:var(--portal-surface-3)]'
                            )}
                          >
                            <span
                              className={cn(
                                'h-2 w-2 rounded-full',
                                hasActiveRoute ? 'bg-[color:var(--portal-accent-strong)]' : 'bg-[color:var(--portal-ink-300)]'
                              )}
                              aria-hidden
                            />
                            <span>{locale === 'fil' ? section.label.fil : section.label.en}</span>
                          </div>
                          <div id={sectionBodyId} className="mt-2 grid gap-1.5 border-t border-[color:var(--portal-border-soft)] pt-2">
                            {section.items.map((item) => {
                              const isActive = isNavItemActive(item);
                              const Icon = resolveNavIcon(item.href);
                              let pendingCount = 0;
                              let badgeKey: keyof typeof BADGE_STORAGE_KEYS | null = null;
                              try {
                                if (item.href.includes('/admin/users')) {
                                  badgeKey = 'userAccess';
                                  pendingCount = state.users.filter((u) => !u.isDeleted && u.approvalStatus === 'staff_forwarded_to_admin').length;
                                }
                                  if (item.href.includes('registration-reviews')) {
                                    // For staff: show users pending staff review. For admin: show users forwarded by staff.
                                    badgeKey = shellRole === 'staff' ? 'staffRegistrationReviews' : 'userAccess';
                                    pendingCount = shellRole === 'staff'
                                      ? state.users.filter((u) => !u.isDeleted && u.isVerified && u.approvalStatus === 'pending_staff_review').length
                                      : state.users.filter((u) => !u.isDeleted && u.approvalStatus === 'staff_forwarded_to_admin').length;
                                  }
                                  if (item.href === '/staff/appointments' && shellRole === 'staff') {
                                    badgeKey = 'staffAppointments';
                                    pendingCount = state.checkupAppointments.filter((appointment) => appointment.status === 'pending').length;
                                  }
                                  if (item.href === '/staff/reservations' && shellRole === 'staff') {
                                    badgeKey = 'staffReservations';
                                    pendingCount = pendingReservationsCount;
                                  }
                                  if (item.href.includes('document-requests') || item.href === '/staff/process-requests') {
                                  badgeKey = item.href === '/staff/process-requests' && shellRole === 'staff'
                                    ? 'staffProcessRequests'
                                    : 'documentRequests';
                                  if (shellRole === 'admin') {
                                    pendingCount = state.documentRequests.filter((r) => r.status === 'pending' || r.status === 'staff_reviewed').length;
                                  } else if (item.href === '/staff/process-requests') {
                                    pendingCount = state.documentRequests.filter((r) => r.status === 'approved').length;
                                  } else {
                                    pendingCount = state.documentRequests.filter((r) => r.status === 'pending').length;
                                  }
                                }
                                if (item.href.includes('/admin/incidents')) {
                                  badgeKey = 'incidentReports';
                                  pendingCount = state.reports.filter((report) => report.status === 'pending').length;
                                }
                              } catch (e) {
                                pendingCount = 0;
                              }
                              const showPendingBadge = badgeKey
                                ? pendingCount > seenBadgeCounts[badgeKey] && !isActive
                                : false;

                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={() => {
                                    if (badgeKey && pendingCount > 0) {
                                      setSeenBadgeCounts((current) => ({ ...current, [badgeKey]: pendingCount }));
                                      window.sessionStorage.setItem(BADGE_STORAGE_KEYS[badgeKey], String(pendingCount));
                                    }
                                  }}
                                  className={cn(
                                    'relative flex items-center gap-2 rounded-[var(--portal-radius-md)] px-2.5 py-2 transition-all duration-200 portal-focusable',
                                    isActive
                                      ? 'bg-[color:var(--portal-accent-soft)] text-[color:var(--portal-ink-900)] ring-1 ring-[color:rgba(47,143,104,0.28)]'
                                      : 'text-[color:var(--portal-ink-700)] hover:bg-[color:var(--portal-surface-3)]'
                                  )}
                                  aria-current={isActive ? 'page' : undefined}
                                >
                                  <span
                                    className={cn(
                                      'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-transparent transition-all duration-200',
                                      isActive ? 'bg-[color:var(--portal-accent-strong)]' : 'bg-transparent'
                                    )}
                                    aria-hidden
                                  />
                                  <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[color:var(--portal-surface-3)] text-[color:inherit]">
                                    <Icon size={16} />
                                  </span>
                                  <span className="text-sm font-semibold leading-tight">
                                    {locale === 'fil' ? item.label.fil : item.label.en}
                                  </span>
                                  {showPendingBadge ? (
                                    <span
                                      className="absolute right-3 top-2 inline-flex items-center justify-center min-w-[18px] h-5 rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white"
                                      aria-hidden
                                    >
                                      {pendingCount > 9 ? '9+' : String(pendingCount)}
                                    </span>
                                  ) : null}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </nav>

                  <div className="mt-auto pt-3 border-t border-[color:var(--portal-border-soft)]">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowLogoutConfirm(true)}
                      className="portal-interactive-lift flex w-full items-center justify-start gap-2 rounded-[var(--portal-radius-md)] px-3 py-2 text-sm font-semibold text-[color:var(--portal-ink-700)] hover:bg-[color:var(--portal-surface-3)] portal-focusable"
                    >
                      <LogOut size={14} />
                      <span>{locale === 'fil' ? 'Mag-logout' : 'Logout'}</span>
                    </Button>
                  </div>
                </aside>

                <section className="grid min-w-0 content-start gap-4 pb-16 md:gap-5 lg:pb-8">


                  {showHero ? (
                    <div className="resident-motion relative overflow-hidden rounded-[var(--resident-radius-xl)] border border-[color:rgba(15,45,32,0.12)] bg-[linear-gradient(180deg,#f9fcfa_0%,#edf5f0_100%)] shadow-[var(--resident-shadow-2)]">
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#1b6145_0%,#2f8f68_55%,#71b79a_100%)]" />

                      <div className="relative z-10 px-4 py-5 md:px-6 md:py-6">
                        <div className="flex items-start justify-between gap-6">
                          <div className="min-w-0 max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(29,95,71,0.18)] bg-[color:rgba(255,255,255,0.75)] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-[color:var(--resident-accent-strong)] mb-3">
                              <ShieldCheck size={12} />
                              {locale === 'fil' ? `${roleTitle.fil} Workspace` : `${roleTitle.en} Workspace`}
                            </div>

                            <h1 className="mt-0 font-heading text-[clamp(1.9rem,3vw,3.35rem)] font-semibold leading-[1.02] text-[color:var(--resident-ink-900)]">
                              {resolveCopy(locale, title)}
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--resident-ink-700)]">
                              {resolveCopy(locale, description)}
                            </p>

                            {/* removed Current section display per request */}
                          </div>

                          {shellRole === 'resident' ? (
                            <div className="flex flex-wrap items-center justify-end gap-3">
                              <Button asChild variant="secondary" className="portal-focusable border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-3)]">
                                <Link href={primaryAction.href}>{locale === 'fil' ? primaryAction.label.fil : primaryAction.label.en}</Link>
                              </Button>

                              <Button asChild variant="secondary" className="border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-3)] portal-focusable">
                                <Link href={alertsHref}>
                                  <Bell size={14} className="mr-2" />
                                  {locale === 'fil' ? 'Mga Abiso' : 'Alerts'}
                                </Link>
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <main className="grid gap-4 md:gap-5">{children}</main>
                </section>
              </div>
            </div>

            {showLogoutConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6">
                <div className="w-full max-w-sm rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-6 shadow-[0_24px_80px_rgba(7,45,25,0.18)]">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-[color:var(--portal-ink-900)]">
                      {locale === 'fil' ? 'Logout Confirmation' : 'Logout Confirmation'}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--portal-ink-700)]">
                      {locale === 'fil'
                        ? 'Sigurado ka bang gusto mong magpatuloy?'
                        : 'Are you sure you want to continue?'}
                    </p>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr]">
                    <Button
                      type="button"
                      variant="residentOutline"
                      onClick={() => setShowLogoutConfirm(false)}
                      className="w-full"
                    >
                      {locale === 'fil' ? 'Kanselahin' : 'Cancel'}
                    </Button>
                    <Button
                      type="button"
                      variant="resident"
                      onClick={() => {
                        setShowLogoutConfirm(false);
                        logoutAndRedirect();
                      }}
                      className="w-full"
                    >
                      {locale === 'fil' ? 'Oo' : 'OK'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }}
    </PortalShellBase>
  );
}

export default function PortalShell(props: {
  role: UserRole;
  allowedRoles?: UserRole[];
  title: string | LocalizedProp;
  description: string | LocalizedProp;
  children: React.ReactNode;
  showHero?: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <PortalShellContent {...props} />
    </Suspense>
  );
}
