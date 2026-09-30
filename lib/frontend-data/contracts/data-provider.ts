import type {
  Announcement,
  UserApprovalStatus,
  AppState,
  Census,
  DashboardMetrics,
  IncidentCategory,
  DoctorAvailabilitySlot,
  DocumentRequest,
  DocumentTemplate,
  CheckupAppointment,
  Locale,
  MedicineRequest,
  OcrJob,
  QueueEntry,
  ReportStatus,
  Reservation,
  Session,
  StandaloneOcrIssuance,
  User,
  UserRole,
  CaseParty,
  CaseActionLog,
  CaseProceeding,
  CaseCfa,
  CasePnpReferral,
} from '../../types/models';
import type { Result } from '../../types/result';

export interface RegisterResidentPayload {
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  sex: string;
  civilStatus: string;
  citizenship: string;
  birthdate: string;
  addressLine: string;
  province: string;
  city?: string;
  barangay: string;
  contactNumber: string;
  email: string;
  idType: string;
  idNumber: string;
  idImageFileFront: File;
  idImageFileBack: File;
  password: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

export interface SendChatMessageResult {
  sessionId: string;
  assistantMessage: {
    sender: 'assistant';
    text: string;
    createdAt: string;
    temporary: true;
  };
}

export interface UpdateCurrentProfilePayload {
  fullName: string;
  phone: string;
  address: string;
  birthdate: string;
  sex: string;
  civilStatus: string;
  citizenship: string;
}

export interface StaffDocumentCompletionResult {
  readyForPickup: boolean;
  generatedDocumentId: string | null;
  portalHref: string;
  email: {
    sent: boolean;
    skipped?: boolean;
    reason?: string;
    error?: string;
  };
}

export interface DataProvider {
  getState(): Promise<AppState>;
  subscribeToState(callback: () => void): () => void;
  resetSeedState(): Promise<AppState>;

  getCurrentSession(): Promise<Session | null>;
  getSessionUser(): Promise<User | null>;
  registerResident(payload: RegisterResidentPayload): Promise<
    Result<{ email: string; verificationRequired: boolean; verificationEmailSent: boolean; warning?: string }>
  >;
  verifyEmailOtp(email: string, otp: string): Promise<
    Result<{
      verified: boolean;
      approvalStatus: UserApprovalStatus;
      email: string;
    }>
  >;
  resendVerificationEmail(email: string): Promise<Result<{ sent: boolean }>>;
  requestPasswordReset(email: string): Promise<Result<{ sent: boolean; message: string }>>;
  resetPassword(token: string, newPassword: string): Promise<Result<{ reset: boolean }>>;
  changePassword(currentPassword: string, newPassword: string): Promise<Result<{ changed: boolean }>>;
  login(email: string, password: string): Promise<Result<{ user: User }>>;
  logout(): Promise<void>;
  setSessionLocale(locale: Locale): Promise<void>;
  updateCurrentProfile(payload: UpdateCurrentProfilePayload): Promise<void>;

  updateUserRole(userId: string, role: UserRole): Promise<void>;
  softDeleteUser(userId: string, isDeleted: boolean): Promise<void>;
  hardDeleteUser(userId: string): Promise<void>;
  updateUserApproval(userId: string, status: UserApprovalStatus, reviewNote?: string): Promise<void>;

  submitDocumentRequest(payload: { typeId: string; purpose: string; selectedTypeLabel?: string; attachments?: File[] }): Promise<Result<{ request: DocumentRequest }>>;
  cancelPendingRequest(requestId: string): Promise<void>;
  acknowledgeDocumentRequestFeedbackPrompt(requestId: string): Promise<void>;
  adminReviewRequest(requestId: string, decision: 'approved' | 'declined', reason?: string): Promise<void>;
  adminAssignToStaff(requestId: string, assigneeUserId: string): Promise<void>;
  staffReviewRequest(requestId: string, decision: 'forwarded' | 'rejected', note?: string): Promise<void>;
  staffApproveRequest(requestId: string, note?: string): Promise<void>;
  staffUpdateRequest(
    requestId: string,
    status: 'ready_for_pickup' | 'completed' | 'declined',
    reason?: string,
    options?: {
      ocrJobId?: string;
      verificationMetadata?: unknown;
      documentLabel?: string;
    }
  ): Promise<StaffDocumentCompletionResult | void>;

  addFeedback(payload: { requestId?: string; rating: number; comment?: string }): Promise<void>;
  submitReport(payload: {
    trackType?: 'community_concern' | 'incident';
    desiredAction?: 'record_only' | 'request_meeting' | 'none';
    category: string;
    title: string;
    details: string;
    location: string;
    dateOfIncident: string;
    otherCategoryText?: string;
    parties?: CaseParty[];
  }): Promise<void>;
  updateReportStatus(reportId: string, status: ReportStatus, note?: string): Promise<void>;
  updateCaseWorkflow(
    reportId: string,
    payload: {
      status?: ReportStatus;
      actionLog?: CaseActionLog;
      proceeding?: Omit<CaseProceeding, 'id' | 'createdAt'>;
      cfa?: CaseCfa;
      pnpReferral?: CasePnpReferral;
      note?: string;
    }
  ): Promise<void>;
  upsertIncidentCategory(payload: {
    id?: string;
    name: string;
    sortOrder?: number;
    isActive?: boolean;
  }): Promise<IncidentCategory>;
  archiveIncidentCategory(categoryId: string): Promise<void>;

  upsertAnnouncement(payload: {
    id?: string;
    title: string;
    body: string;
    audience: Announcement['audience'];
    startAt: string;
    endAt: string;
  }): Promise<void>;
  deleteAnnouncement(idValue: string): Promise<void>;

  upsertCensus(
    payload: Omit<Census, 'updatedAt' | 'residentId'>
  ): Promise<void>;
  joinQueue(service: string): Promise<void>;
  updateQueueStatus(entryId: string, status: QueueEntry['status']): Promise<void>;
  cancelQueue(entryId: string): Promise<void>;

  createReservation?(payload: {
    resource: Reservation['resource'];
    itemName?: string;
    quantityRequested?: number;
    startAt: string;
    endAt: string;
    purpose: string;
  }): Promise<Reservation>;

  deleteReservation?(reservationId: string): Promise<void>;
  reviewReservation?(reservationId: string, status: 'approved' | 'declined', reason?: string): Promise<void>;
  cancelReservation?(reservationId: string): Promise<void>;

  upsertDoctor(payload: {
    id?: string;
    name: string;
    specialization?: string;
    isActive?: boolean;
  }): Promise<void>;
  deleteDoctor(doctorId: string): Promise<void>;

  createDoctorAvailabilitySlot(payload: {
    doctorName: string;
    date: string;
    startAt: string;
    endAt: string;
    capacity?: number;
    isBlocked?: boolean;
    notes?: string;
  }): Promise<void>;
  updateDoctorAvailabilitySlot(
    slotId: string,
    payload: Partial<Pick<DoctorAvailabilitySlot, 'doctorName' | 'date' | 'startAt' | 'endAt' | 'capacity' | 'isBlocked' | 'notes'>>
  ): Promise<void>;
  deleteDoctorAvailabilitySlot(slotId: string): Promise<void>;

  createCheckupAppointment(payload: {
    slotId: string;
    reason: string;
  }): Promise<void>;
  cancelCheckupAppointment(appointmentId: string): Promise<void>;
  updateCheckupAppointmentStatus(
    appointmentId: string,
    status: CheckupAppointment['status'],
    staffNote?: string
  ): Promise<void>;

  upsertMedicine(payload: {
    id?: string;
    name: string;
    description?: string;
    quantity: number;
    unit: string;
    expiryDate?: string;
    available?: boolean;
  }): Promise<void>;
  softDeleteMedicine(medicineId: string, isDeleted: boolean): Promise<void>;
  upsertEquipment(payload: {
    id?: string;
    name: string;
    quantity: number;
    isDeleted?: boolean;
  }): Promise<void>;
  softDeleteEquipment(equipmentId: string, isDeleted: boolean): Promise<void>;

  submitMedicineRequest(payload: {
    medicineId: string;
    purpose: string;
    requestedQuantity: number;
  }): Promise<Result<{ request: MedicineRequest }>>;
  cancelPendingMedicineRequest(requestId: string): Promise<void>;
  adminReviewMedicineRequest(requestId: string, decision: 'approved' | 'declined', reason?: string): Promise<void>;
  staffUpdateMedicineRequest(requestId: string, status: 'processing' | 'completed' | 'declined', reason?: string): Promise<void>;

  upsertDocumentTemplate(payload: Partial<DocumentTemplate> & { name: string; body: string; dynamicFields: string[] }): Promise<void>;
  deleteDocumentTemplate(templateId: string): Promise<void>;
  markNotificationRead(notificationId: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;

  createOcrJob(payload: { file: File; requestId?: string; templateKey?: string }): Promise<OcrJob>;
  updateOcrJob(jobId: string, payload: { extractedText?: string; parsedFields?: Record<string, string> }): Promise<OcrJob>;
  deleteOcrJob(jobId: string): Promise<void>;
  createStandaloneOcrIssuance(payload?: { templateKey?: string }): Promise<StandaloneOcrIssuance>;
  runStandaloneOcrIssuanceScan(issuanceId: string, payload: { file: File }): Promise<StandaloneOcrIssuance>;
  patchStandaloneOcrIssuance(
    issuanceId: string,
    payload: { parsedFields?: Record<string, string>; residentId?: string | null; templateKey?: string }
  ): Promise<StandaloneOcrIssuance>;
  finalizeStandaloneOcrIssuance(
    issuanceId: string,
    payload?: { residentId?: string | null }
  ): Promise<{ issuance: StandaloneOcrIssuance; generatedDocumentId: string; printableHtml: string }>;
  sendChatMessage(text: string): Promise<SendChatMessageResult>;
  generateDigitalIdCard(): Promise<void>;
  updateDigitalIdCard(payload: { fullName?: string; address?: string; validUntil?: string }): Promise<void>;
  deleteDigitalIdCard(): Promise<void>;

  getDashboardMetrics(): Promise<DashboardMetrics>;
  exportCsv(rows: Record<string, string | number | boolean | undefined>[]): Promise<string>;
  downloadCsv(filename: string, csv: string): Promise<void>;
}
