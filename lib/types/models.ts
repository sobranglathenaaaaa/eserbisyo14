export type UserRole = 'admin' | 'staff' | 'resident';
export type UserApprovalStatus =
  | 'pending_staff_review'
  | 'staff_forwarded_to_admin'
  | 'staff_rejected'
  | 'admin_approved'
  | 'admin_rejected';

export type Locale = 'en' | 'fil';

export type RequestStatus =
  | 'pending'
  | 'staff_reviewed'
  | 'approved'
  | 'processing'
  | 'ready_for_pickup'
  | 'completed'
  | 'declined'
  | 'cancelled';

export type ReportStatus =
  | 'pending'
  | 'submitted'
  | 'under_review'
  | 'assigned'
  | 'action_taken'
  | 'hearing_scheduled'
  | 'lupon_escalated'
  | 'cfa_issued'
  | 'referred_to_pnp'
  | 'resolved'
  | 'closed'
  | 'declined'
  | 'approved'
  | 'proceed_to_barangay';

export type CheckupAppointmentStatus = 'pending' | 'approved' | 'proceed_to_barangay' | 'completed' | 'declined' | 'cancelled';

export type QueueStatus = 'waiting' | 'serving' | 'completed' | 'cancelled';
export type OcrJobStatus = 'processing' | 'completed' | 'failed';

export type NotificationType = 'account' | 'request' | 'report' | 'system';
export type NotificationPriority = 'info' | 'warning' | 'urgent';

export interface User {
  id: string;
  fullName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  sex?: string;
  civilStatus?: string;
  citizenship?: string;
  birthdate: string;
  address: string;
  addressLine?: string;
  province?: string;
  city?: string;
  barangay?: string;
  email: string;
  phone: string;
  idType?: string;
  idNumber: string;
  idFileName?: string;
  idFilePath?: string;
  idFileNameBack?: string;
  idFilePathBack?: string;
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
  password: string;
  role: UserRole;
  isDeleted: boolean;
  isVerified: boolean;
  approvalStatus: UserApprovalStatus;
  staffReviewedAt?: string;
  staffReviewNote?: string;
  approvalReviewedAt?: string;
  approvalReviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  userId: string;
  role: UserRole;
  locale: Locale;
  createdAt: string;
}

export interface DocumentCatalogItem {
  id: string;
  category: string;
  type: string;
  price: number;
  pricingNote?: string;
}

export interface DocumentRequestAttachment {
  id: string;
  requestId: string;
  uploadedBy?: string;
  fileName: string;
  mimeType?: string;
  fileSizeBytes?: number;
  downloadUrl: string;
  createdAt: string;
}

export interface DocumentRequest {
  id: string;
  referenceNumber: string;
  residentId: string;
  residentName: string;
  typeId: string;
  typeLabel: string;
  selectedTypeLabel?: string;
  category: string;
  purpose: string;
  amount: number;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  feedbackPromptedAt?: string;
  adminDecisionReason?: string;
  processingDeclineReason?: string;
  processedBy?: string;
  staffReviewNote?: string;
  staffReviewedAt?: string;
  attachments?: DocumentRequestAttachment[];
}

export interface DocumentTemplateFieldMapping {
  staticText: string;
  category: 'barangay' | 'official' | 'document' | 'resident' | 'other';
  mappedTo: string;
  confidence?: number;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  body: string;
  dynamicFields: string[];
  updatedAt: string;
  updatedBy: string;
  documentType?: string;
  sourceType?: 'uploaded' | 'custom' | 'official';
  originalFileName?: string;
  fieldMappings?: DocumentTemplateFieldMapping[];
  headerConfig?: {
    showLogo?: boolean;
    showSeal?: boolean;
    provinceText?: string;
    cityText?: string;
    barangayText?: string;
    officeTitle?: string;
    fontFamily?: string;
    alignment?: 'left' | 'center' | 'right';
    docTitle?: string;
    salutation?: string;
    closingClause?: string;
    signatoryName?: string;
    signatoryTitle?: string;
    footerNotice?: string;
    sealNotice?: string;
  };
  officialsConfig?: {
    includePunongBarangay?: boolean;
    includeSecretary?: boolean;
    includeTreasurer?: boolean;
    includeKagawads?: boolean;
    linkToOfficialsDb?: boolean;
  };
  overrideSettings?: {
    useBarangayInfo?: boolean;
    useOfficialsDb?: boolean;
    useResidentRequestInfo?: boolean;
  };
  htmlBody?: string;
  previewImageUrl?: string;
  isActive?: boolean;
  isOverwritten?: boolean;
}

export interface GeneratedDocument {
  id: string;
  requestId?: string;
  referenceNumber?: string;
  documentType: string;
  residentName: string;
  dateIssued: string;
  processedBy: string;
  verificationStatus: 'verified' | 'pending';
  qrPayload: string;
  digitalSeal: boolean;
  eSignatureName: string;
}

export interface CaseParty {
  role: 'complainant' | 'respondent' | 'witness';
  fullName: string;
  relationship?: string;
  contactInfo?: string;
  address?: string;
}

export interface CaseProceeding {
  id: string;
  stage: 'barangay_hearing' | 'lupon_conciliation';
  proceedingNo: number;
  scheduledAt: string;
  venue: string;
  presidingOfficer?: string;
  attendance?: string;
  minutes?: string;
  agreements?: string;
  outcome?: 'settled' | 'another_hearing' | 'not_settled';
  createdAt: string;
}

export interface CaseCfa {
  certificateNumber: string;
  dateIssued: string;
  issuingAuthority: string;
  chairmanSigned: boolean;
  recipientName: string;
  dateReleased?: string;
  documentUrl?: string;
}

export interface CasePnpReferral {
  dateReferred: string;
  receivingUnit: string;
  referenceNumber?: string;
  documentsProvided?: string;
  referralNotes?: string;
}

export interface CaseActionLog {
  assignedTo?: string;
  assignedAt?: string;
  actionTaken?: string;
  actionTakenAt?: string;
}

export interface IncidentReport {
  id: string;
  residentId: string;
  residentName: string;
  trackType?: 'community_concern' | 'incident';
  desiredAction?: 'record_only' | 'request_meeting' | 'none';
  kind: string;
  otherCategoryText?: string;
  relationshipToRespondent?: string;
  streetName?: string;
  specificLocation?: string;
  title: string;
  details: string;
  location: string;
  dateOfIncident: string;
  status: ReportStatus;
  parties?: CaseParty[];
  actionLog?: CaseActionLog;
  proceedings?: CaseProceeding[];
  cfa?: CaseCfa;
  pnpReferral?: CasePnpReferral;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  requestId?: string;
  residentId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: 'all' | 'resident' | 'staff';
  startAt?: string;
  endAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type CensusOwnershipStatus = 'owned' | 'rented';
export type ResidencyClassification =
  | 'owner'
  | 'permanent_resident'
  | 'informal_settler'
  | 'tenant_renter'
  | 'boarder_lodger'
  | 'temporary_resident';

export interface Census {
  residentId: string;
  householdSize: number;
  minorsCount: number;
  ownershipStatus: CensusOwnershipStatus;
  residencyClassification: ResidencyClassification;
  yearsOfResidenceYears?: number;
  yearsOfResidenceMonths?: number;
  updatedAt: string;
}

export interface QueueEntry {
  id: string;
  residentId: string;
  residentName: string;
  service: string;
  status: QueueStatus;
  position: number;
  createdAt: string;
}

export interface IncidentCategory {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BarangayStreet {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IncidentRelationship {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorAvailabilitySlot {
  id: string;
  doctorName: string;
  date: string;
  startAt: string;
  endAt: string;
  capacity: number;
  isBlocked: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckupAppointment {
  id: string;
  residentId: string;
  residentName: string;
  slotId: string;
  doctorName: string;
  date: string;
  startAt: string;
  endAt: string;
  reason: string;
  status: CheckupAppointmentStatus;
  staffNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  available: boolean;
  isDeleted: boolean;
  updatedAt: string;
}

export interface Equipment {
  id: string;
  name: string;
  quantity: number;
  isDeleted: boolean;
  updatedAt: string;
}

export type ReservationStatus = 'pending' | 'approved' | 'declined' | 'cancelled' | 'ready_for_pickup' | 'received' | 'returned' | 'completed';

export interface Reservation {
  id: string;
  residentId: string;
  residentName: string;
  resource: string;
  serviceType?: string;
  itemName?: string;
  quantityRequested?: number;
  purpose?: string;
  reason?: string;
  notes?: string;
  date: string;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt?: string;
  adminDecisionReason?: string;
  processingDeclineReason?: string;
  processedBy?: string;
}

export interface MedicineRequest {
  id: string;
  referenceNumber: string;
  residentId: string;
  residentName: string;
  medicineId: string;
  medicineName: string;
  purpose: string;
  requestedQuantity: number;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  adminDecisionReason?: string;
  processingDeclineReason?: string;
  processedBy?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  eventKey: string;
  entityType?: string;
  entityId?: string;
  actionHref?: string;
  createdAt: string;
  read: boolean;
}

export interface EmailLog {
  id: string;
  toUserId: string;
  toEmail: string;
  subject: string;
  body: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  actorId: string;
  actorRole: UserRole;
  targetId: string;
  context: string;
  createdAt: string;
}

export interface OcrJob {
  id: string;
  residentId: string;
  fileName: string;
  extractedText: string;
  requestId?: string;
  parsedFields?: Record<string, string>;
  templateKey?: string;
  templateVersion?: string;
  status: OcrJobStatus;
  mimeType?: string;
  fileSizeBytes?: number;
  filePath?: string;
  model?: string;
  errorMessage?: string;
  updatedAt?: string;
  createdAt: string;
}

export type StandaloneIssuanceStatus = 'draft' | 'ocr_completed' | 'issued';

export interface StandaloneOcrIssuance {
  id: string;
  residentId?: string;
  status: StandaloneIssuanceStatus;
  templateKey: string;
  templateVersion: string;
  ocrProgressPercent: number | null;
  parsedFields: Record<string, string>;
  extractedText: string;
  model?: string;
  errorMessage?: string;
  sourceFileName?: string;
  sourceFilePath?: string;
  sourceMimeType?: string;
  sourceFileSizeBytes?: number;
  linkedRequestId?: string;
  generatedDocumentId?: string;
  issuedAt?: string;
  updatedAt?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'resident' | 'assistant';
  text: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  residentId: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export type KnowledgeSourceKind =
  | 'how_to_use'
  | 'document_catalog'
  | 'role_pages'
  | 'requirements'
  | 'chatbot_context';

export interface KnowledgeChunk {
  id: string;
  tenantId: string;
  sourceKind: KnowledgeSourceKind;
  sourceKey: string;
  title: string;
  section: string;
  body: string;
  locale: 'en' | 'fil' | 'both';
  keywords: string[];
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface DigitalId {
  id: string;
  residentId: string;
  fullName: string;
  address: string;
  issuedAt: string;
  validUntil: string;
}

export interface AppMeta {
  idCounters: Record<string, number>;
}

export interface AppState {
  users: User[];
  session: Session | null;
  documentRequests: DocumentRequest[];
  documentTemplates: DocumentTemplate[];
  generatedDocuments: GeneratedDocument[];
  reports: IncidentReport[];
  incidentCategories: IncidentCategory[];
  barangayStreets: BarangayStreet[];
  incidentRelationships: IncidentRelationship[];
  feedback: Feedback[];
  announcements: Announcement[];
  censusRecords: Census[];
  queueEntries: QueueEntry[];
  reservations: Reservation[];
  doctorAvailabilitySlots: DoctorAvailabilitySlot[];
  checkupAppointments: CheckupAppointment[];
  doctors: Doctor[];
  medicines: Medicine[];
  equipment: Equipment[];
  medicineRequests: MedicineRequest[];
  notifications: Notification[];
  emailLogs: EmailLog[];
  auditLogs: AuditEvent[];
  ocrJobs: OcrJob[];
  chatSessions: ChatSession[];
  digitalIds: DigitalId[];
  meta: AppMeta;
}

export interface DashboardMetrics {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  completedRequests: number;
  reportSummary: {
    pending: number;
    underReview: number;
    resolved: number;
  };
  averageRating: number;
}
