import type { LocalizedCopy } from './copy';

export type ResidentNavPriority = 'primary' | 'secondary';
export type ResidentNavSurface = 'sidebar' | 'quick_action' | 'more';
export type ResidentNavGroup = 'start' | 'services' | 'tracking' | 'community' | 'account';

export interface ResidentNavItem {
  href: string;
  label: LocalizedCopy;
  hint: LocalizedCopy;
  priority: ResidentNavPriority;
  surface: ResidentNavSurface;
  mobileVisible: boolean;
  group: ResidentNavGroup;
}

export interface ResidentNavSection {
  id: ResidentNavGroup;
  label: LocalizedCopy;
}

export const residentNavigation: ResidentNavItem[] = [
  {
    href: '/resident/dashboard',
    label: { en: 'Home', fil: 'Simula' },
    hint: { en: 'Today and next steps', fil: 'Ngayon at susunod na hakbang' },
    priority: 'primary',
    surface: 'sidebar',
    mobileVisible: true,
    group: 'start',
  },
  {
    href: '/resident/document-requests',
    label: { en: 'Get Documents', fil: 'Kumuha ng Dokumento' },
    hint: { en: 'Request and track', fil: 'Mag-request at subaybayan' },
    priority: 'primary',
    surface: 'sidebar',
    mobileVisible: true,
    group: 'services',
  },
  {
    href: '/resident/medicines',
    label: { en: 'Book an Appointment', fil: 'Mag-book ng Appointment' },
    hint: { en: 'Check doctor schedule', fil: 'Tingnan ang schedule ng doktor' },
    priority: 'primary',
    surface: 'sidebar',
    mobileVisible: true,
    group: 'services',
  },
  {
    href: '/resident/notifications',
    label: { en: 'Updates', fil: 'Mga Update' },
    hint: { en: 'Alerts and messages', fil: 'Mga alert at mensahe' },
    priority: 'primary',
    surface: 'sidebar',
    mobileVisible: true,
    group: 'tracking',
  },
  {
    href: '/resident/reservations',
    label: { en: 'Reserve Facilities', fil: 'I-reserve ang Pasilidad' },
    hint: { en: 'Book halls, courts, or equipment', fil: 'Mag-book ng salo, korte, o kagamitan' },
    priority: 'primary',
    surface: 'sidebar',
    mobileVisible: true,
    group: 'services',
  },
  {
    href: '/resident/blotter-reporting',
    label: { en: 'Report an Incident', fil: 'Mag-ulat ng Insidente' },
    hint: { en: 'Send a report', fil: 'Magpadala ng ulat' },
    priority: 'secondary',
    surface: 'quick_action',
    mobileVisible: false,
    group: 'community',
  },
  {
    href: '/resident/request-feedback',
    label: { en: 'Give Feedback', fil: 'Magbigay ng Feedback' },
    hint: { en: 'Rate the service', fil: 'I-rate ang serbisyo' },
    priority: 'secondary',
    surface: 'quick_action',
    mobileVisible: false,
    group: 'community',
  },
  {
    href: '/resident/my-profile',
    label: { en: 'My Profile', fil: 'Aking Profile' },
    hint: { en: 'Update details', fil: 'I-update ang detalye' },
    priority: 'primary',
    surface: 'sidebar',
    mobileVisible: true,
    group: 'account',
  },
  {
    href: '/resident/census',
    label: { en: 'Household and Census', fil: 'Sambahayan at Census' },
    hint: { en: 'Update household details', fil: 'I-update ang detalye ng sambahayan' },
    priority: 'secondary',
    surface: 'more',
    mobileVisible: false,
    group: 'account',
  },
  {
    href: '/resident/request-history',
    label: { en: 'Past Requests', fil: 'Nakaraang Kahilingan' },
    hint: { en: 'Your request history', fil: 'Kasaysayan ng kahilingan' },
    priority: 'secondary',
    surface: 'more',
    mobileVisible: false,
    group: 'tracking',
  },
  {
    href: '/resident/legal',
    label: { en: 'Legal Content', fil: 'Legal Content' },
    hint: { en: 'Read terms and privacy', fil: 'Basahin ang terms at privacy' },
    priority: 'secondary',
    surface: 'more',
    mobileVisible: false,
    group: 'account',
  },
];

export const residentSidebarSections: ResidentNavSection[] = [
  { id: 'start', label: { en: 'Start', fil: 'Simula' } },
  { id: 'services', label: { en: 'Services', fil: 'Serbisyo' } },
  { id: 'tracking', label: { en: 'Updates', fil: 'Mga Update' } },
  { id: 'community', label: { en: 'Community', fil: 'Komunidad' } },
  { id: 'account', label: { en: 'Account', fil: 'Account' } },
];

export function getResidentSidebarItems() {
  return residentNavigation;
}

export function getResidentMobileSidebarItems() {
  return residentNavigation.filter((item) => item.surface === 'sidebar' && item.mobileVisible);
}

export function getResidentQuickActions() {
  return residentNavigation.filter((item) => item.surface === 'quick_action');
}

export function getResidentMoreItems() {
  return residentNavigation.filter((item) => item.surface === 'more');
}
