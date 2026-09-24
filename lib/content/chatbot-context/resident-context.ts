export type ResidentChatbotContextLocale = 'en' | 'fil' | 'both';

export interface ResidentChatbotContextEntry {
  id: string;
  title: string;
  section: string;
  body: string;
  locale: ResidentChatbotContextLocale;
  priority: number;
  keywords: string[];
}

// Resident-focused guidance only. This is indexed by the chat knowledge script.
export const residentChatbotContext: ResidentChatbotContextEntry[] = [
  {
    id: 'resident-assistant-purpose',
    title: 'Resident Assistant Purpose',
    section: 'Guidance Scope',
    body: 'The assistant helps logged in residents understand the next correct step in eSerbisyo. It gives guidance only and does not submit requests, approve actions, or change records directly.',
    locale: 'both',
    priority: 88,
    keywords: ['resident', 'assistant', 'guidance', 'logged', 'request', 'next', 'step', 'submit'],
  },
  {
    id: 'resident-service-entry-points',
    title: 'Resident Service Entry Points',
    section: 'Where to Continue in App',
    body: 'For official action, continue to the proper page: Document Requests for certificates and clearances, Blotter Reporting for incidents, Book an Appointment for check-ups, and Request History or Notifications for updates.',
    locale: 'both',
    priority: 88,
    keywords: [
      'document requests',
      'blotter reporting',
      'book appointment',
      'request history',
      'notifications',
      'continue',
      'official',
    ],
  },
  {
    id: 'resident-request-lifecycle',
    title: 'Resident Request Lifecycle',
    section: 'Status Meaning',
    body: 'Document request status flow is pending, approved, ready for pickup, completed, declined, or cancelled. After approval, wait for further instructions. Staff will notify you when the document is ready for pickup. Residents can cancel only while pending. Completed requests can be rated through the feedback page.',
    locale: 'en',
    priority: 86,
    keywords: [
      'status',
      'pending',
      'approved',
      'ready_for_pickup',
      'completed',
      'declined',
      'cancelled',
      'cancel',
    ],
  },
  {
    id: 'resident-request-lifecycle-fil',
    title: 'Resident Request Lifecycle',
    section: 'Kahulugan ng Status',
    body: 'Ang daloy ng document request ay pending, approved, ready for pickup, completed, declined, o cancelled. Pagkatapos ma-approve, maghintay ng susunod na abiso. Aabisuhan ka ng staff kapag ready nang kunin ang dokumento. Pending lang maaaring kanselahin. Maaari kang magbigay ng feedback kapag completed na ang request.',
    locale: 'fil',
    priority: 86,
    keywords: ['status', 'pending', 'approved', 'ready for pickup', 'completed', 'feedback', 'declined', 'cancelled', 'kansela'],
  },
  {
    id: 'resident-document-selection',
    title: 'Document Selection Guidance',
    section: 'Choosing the Right Document',
    body: 'When residents are unsure which document to request, guide them using purpose first, then suggest checking Document Requests categories and fees inside the app before submitting.',
    locale: 'both',
    priority: 84,
    keywords: ['document', 'certificate', 'clearance', 'purpose', 'fees', 'category', 'submit'],
  },
  {
    id: 'resident-document-request-preparation',
    title: 'Document Request Preparation',
    section: 'Before Requesting a Document',
    body: 'Before submitting a document request, prepare your full name, birthdate, complete address, email address, phone number, valid ID details, and a clear purpose such as employment, school, scholarship, or financial assistance. Check the form for any required supporting file before submitting.',
    locale: 'en',
    priority: 96,
    keywords: ['prepare', 'preparation', 'document request', 'requirements', 'full name', 'birthdate', 'address', 'valid id', 'purpose', 'supporting file'],
  },
  {
    id: 'resident-document-request-preparation-fil',
    title: 'Paghahanda para sa Document Request',
    section: 'Bago Humiling ng Dokumento',
    body: 'Bago magsumite ng document request, ihanda ang buong pangalan, birthdate, kumpletong address, email address, phone number, detalye ng valid ID, at malinaw na purpose tulad ng employment, school, scholarship, o financial assistance. Tingnan ang form kung may kailangang supporting file bago magsumite.',
    locale: 'fil',
    priority: 96,
    keywords: ['ihanda', 'paghahanda', 'document request', 'requirements', 'buong pangalan', 'birthdate', 'address', 'valid id', 'purpose', 'supporting file'],
  },
  {
    id: 'resident-incidents-and-blotter',
    title: 'Incident and Blotter Guidance',
    section: 'Reporting Flow',
    body: 'For incidents and blotter concerns, the assistant should explain how to prepare details and then direct residents to Blotter Reporting for official submission and tracking.',
    locale: 'both',
    priority: 84,
    keywords: ['incident', 'blotter', 'report', 'submission', 'tracking', 'details'],
  },
  {
    id: 'resident-chatbot-boundaries',
    title: 'Assistant Boundaries',
    section: 'What the Assistant Must Not Do',
    body: 'The assistant must not claim to approve requests, reveal private records, or perform admin and staff actions. It should redirect residents to official pages and barangay verification when uncertain.',
    locale: 'both',
    priority: 90,
    keywords: ['boundaries', 'admin', 'staff', 'privacy', 'approve', 'official', 'verify', 'uncertain'],
  },
  {
    id: 'resident-admin-staff-separation',
    title: 'Role Separation Rules',
    section: 'Resident vs Admin and Staff Scope',
    body: 'Resident assistance is limited to resident features and resident process guidance. Internal processing decisions, template management, user management, and inventory operations are outside resident assistant scope.',
    locale: 'both',
    priority: 90,
    keywords: ['role', 'resident', 'admin', 'staff', 'scope', 'template', 'users', 'inventory'],
  },
  {
    id: 'resident-profile-readiness',
    title: 'Resident Profile Readiness',
    section: 'Before Submitting Requests',
    body: 'Residents should keep profile and census details accurate to reduce review delays. The assistant should remind users to check notifications regularly after submitting requests.',
    locale: 'both',
    priority: 82,
    keywords: ['profile', 'census', 'notifications', 'delay', 'review', 'submit'],
  },
];
