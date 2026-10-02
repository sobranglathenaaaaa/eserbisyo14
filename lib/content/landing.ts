export interface LocalizedCopy {
  en: string;
  fil?: string;
}

export interface LandingSection {
  id: string;
  eyebrow: string;
  title: LocalizedCopy;
  description: LocalizedCopy;
}

export interface TrustSignal {
  label: LocalizedCopy;
  value: string;
  note: LocalizedCopy;
  icon: string;
}

export interface FeatureItem {
  label: LocalizedCopy;
  title: LocalizedCopy;
  summary: LocalizedCopy;
  bullets: LocalizedCopy[];
  href: string;
  icon: string;
}

export interface RoleCard {
  role: LocalizedCopy;
  summary: LocalizedCopy;
  outcomes: LocalizedCopy[];
  href: string;
  icon: string;
}

export interface LifecycleStep {
  step: string;
  title: LocalizedCopy;
  detail: LocalizedCopy;
  icon: string;
}

export interface SecurityHighlight {
  title: LocalizedCopy;
  detail: LocalizedCopy;
  status: 'live' | 'upcoming';
  icon: string;
}

export interface CommunityFeature {
  title: LocalizedCopy;
  detail: LocalizedCopy;
  href: string;
  icon: string;
}

export interface AdminOutcome {
  title: LocalizedCopy;
  detail: LocalizedCopy;
}

export const landingSections: Record<string, LandingSection> = {
  hero: {
    id: 'top',
    eyebrow: 'ESERBISYO MVP LAUNCH',
    title: {
      en: 'Request, track, and receive barangay services online.',
      fil: 'Makabagong serbisyong barangay para sa bawat mamamayan.',
    },
    description: {
      en: 'Residents can submit requests, report incidents, and receive updates in one trusted barangay platform.',
    },
  },
  modules: {
    id: 'modules',
    eyebrow: 'Core MVP Modules',
    title: {
      en: 'Built for real barangay operations',
    },
    description: {
      en: 'Each module maps to a live workflow in the app, designed around requests, reporting, announcements, and feedback.',
    },
  },
  roles: {
    id: 'roles',
    eyebrow: 'Three-role Experience',
    title: {
      en: 'One platform, role-specific workflows',
    },
    description: {
      en: 'Residents, staff, and admins each get focused tools designed for clear action.',
    },
  },
  lifecycle: {
    id: 'how-it-works',
    eyebrow: 'How It Works',
    title: {
      en: 'Transparent lifecycle from request to completion',
    },
    description: {
      en: 'A clear request trail supports service confidence and faster coordination.',
    },
  },
  security: {
    id: 'verification',
    eyebrow: 'Security and Verification',
    title: {
      en: 'Trust safeguards with clear MVP boundaries',
    },
    description: {
      en: 'Live safeguards are separated from upcoming enhancements to avoid expectation mismatch.',
    },
  },
  community: {
    id: 'community',
    eyebrow: 'Community Features',
    title: {
      en: 'Communication and feedback that close the loop',
    },
    description: {
      en: 'Barangay bulletin, feedback capture, and history records help strengthen public trust.',
    },
  },
  admins: {
    id: 'admins',
    eyebrow: 'For Barangay Admins',
    title: {
      en: 'Procurement-ready value, concise and measurable',
    },
    description: {
      en: 'Launch digitally with operational clarity, service accountability, and resident-centered outcomes.',
    },
  },
};

export const trustSignals: TrustSignal[] = [
  {
    label: { en: 'Resident-first Intake' },
    value: '24/7',
    note: { en: 'Online request access for key barangay services' },
    icon: 'Ri',
  },
  {
    label: { en: 'Public Accountability' },
    value: 'Dashboard',
    note: { en: 'Resident-visible updates for requests, reports, and feedback' },
    icon: 'Pa',
  },
];

export const moduleFeatures: FeatureItem[] = [
  {
    label: { en: 'Document Processing' },
    title: { en: 'Request and track documents' },
    summary: { en: 'Residents can submit requests online and follow status from intake to release.' },
    bullets: [
      { en: 'Certifications, clearances, and permits' },
      { en: 'Status updates across review stages' },
    ],
    href: '/resident/document-requests',
    icon: 'Dp',
  },
  {
    label: { en: 'Incident Reporting' },
    title: { en: 'Report incidents faster' },
    summary: { en: 'Residents can file incident and blotter reports in a guided flow with complete case details.' },
    bullets: [
      { en: 'Guided forms for incident and blotter cases' },
      { en: 'Standardized location, date, and narrative capture' },
    ],
    href: '/resident/blotter-reporting',
    icon: 'Ib',
  },
  {
    label: { en: 'Community Updates' },
    title: { en: 'Send updates, collect feedback' },
    summary: { en: 'Barangay teams can post updates while residents stay informed and share service feedback.' },
    bullets: [
      { en: 'Role-targeted announcements for residents and staff' },
      { en: 'Built-in feedback loop after service completion' },
    ],
    href: '/resident/request-feedback',
    icon: 'Cf',
  },
];

export const roleCards: RoleCard[] = [
  {
    role: { en: 'Resident', fil: 'Mamamayan' },
    summary: { en: 'Apply, track, and give feedback without repeated in-person visits.' },
    outcomes: [
      { en: 'Unified Request Center for key service categories' },
      { en: 'My Requests and Request History visibility' },
      { en: 'Feedback submission after completion' },
    ],
    href: '/resident/dashboard',
    icon: 'Re',
  },
  {
    role: { en: 'Barangay Staff' },
    summary: { en: 'Process assigned queues with clear status handling and service references.' },
    outcomes: [
      { en: 'Process Requests workspace for daily operations' },
      { en: 'Service availability view for frontline coordination' },
      { en: 'Feedback insights for workflow improvements' },
    ],
    href: '/staff/dashboard',
    icon: 'St',
  },
  {
    role: { en: 'Barangay Admin' },
    summary: { en: 'Oversee requests, community communication, and accountability metrics.' },
    outcomes: [
      { en: 'Queue and approval visibility through dashboard stats' },
      { en: 'Account and user management controls' },
      { en: 'Announcements module for public communication' },
    ],
    href: '/admin/dashboard',
    icon: 'Ad',
  },
];

export const requestLifecycle: LifecycleStep[] = [
  {
    step: '01',
    title: { en: 'Register and verify' },
    detail: { en: 'Resident creates an account, verifies email, and waits for account approval.' },
    icon: 'Sb',
  },
  {
    step: '02',
    title: { en: 'Submit a service request' },
    detail: { en: 'Resident chooses a document service or reports an incident with the required details.' },
    icon: 'Rv',
  },
  {
    step: '03',
    title: { en: 'Review and process' },
    detail: { en: 'Staff and admins review the record, request corrections when needed, and update its status.' },
    icon: 'Ap',
  },
  {
    step: '04',
    title: { en: 'Track and complete' },
    detail: { en: 'Resident follows updates, receives notifications, and claims the completed document when ready.' },
    icon: 'Tc',
  },
];

export const verificationHighlights: SecurityHighlight[] = [
  {
    title: { en: 'Reference Number Tracking' },
    detail: { en: 'Each request is tied to a unique ID for service verification and follow-up.' },
    status: 'live',
    icon: 'Rn',
  },
  {
    title: { en: 'QR Validation' },
    detail: { en: 'QR-based authenticity checks are planned as an MVP+ enhancement.' },
    status: 'upcoming',
    icon: 'Qr',
  },
  {
    title: { en: 'Digital Signature (e-sign)' },
    detail: { en: 'Electronic sign-off workflows are upcoming and not yet active in current MVP.' },
    status: 'upcoming',
    icon: 'Es',
  },
];

export const communityFeatures: CommunityFeature[] = [
  {
    title: { en: 'Barangay Bulletin' },
    detail: { en: 'Post and pin official updates for residents and staff audiences.' },
    href: '/admin/announcements',
    icon: 'Bb',
  },
  {
    title: { en: 'Service Feedback Loop' },
    detail: { en: 'Capture ratings and comments after completed requests.' },
    href: '/resident/request-feedback',
    icon: 'Fl',
  },
  {
    title: { en: 'Request History Records' },
    detail: { en: 'Maintain transparent request trails for review and auditing.' },
    href: '/resident/request-history',
    icon: 'Rh',
  },
];

export const adminOutcomes: AdminOutcome[] = [
  {
    title: { en: 'Faster Public Service Turnaround' },
    detail: { en: 'Resident requests move through visible queues instead of fragmented manual follow-up.' },
  },
  {
    title: { en: 'Clear Accountability Trail' },
    detail: { en: 'Status checkpoints and history logs support operational governance and committee reviews.' },
  },
  {
    title: { en: 'Practical Rollout Confidence' },
    detail: { en: 'MVP scope is clear today, while verification upgrades are transparently marked as upcoming.' },
  },
];
