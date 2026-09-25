import type { AppState, Locale, UserRole } from '../types/models';
import { createEmptyAppState } from './empty-state';
import { getDataProvider } from './provider';
import type { SendChatMessageResult, UpdateCurrentProfilePayload } from './contracts/data-provider';
import type { Reservation } from '../types/models';
const provider = getDataProvider();
const listeners = new Set<() => void>();

let cachedState: AppState = createEmptyAppState();
let hasInitialized = false;
let providerUnsubscribe: (() => void) | null = null;

async function refreshStateFromProvider() {
  cachedState = await provider.getState();
  listeners.forEach((callback) => callback());
}

async function ensureProviderSubscription() {
  if (providerUnsubscribe) return;
  providerUnsubscribe = provider.subscribeToState(() => {
    void refreshStateFromProvider();
  });
}

export async function getState() {
  if (!hasInitialized) {
    await ensureProviderSubscription();
    cachedState = await provider.getState();
    hasInitialized = true;
  }
  return cachedState;
}

export function getStateSync() {
  return cachedState;
}

export function subscribeToState(callback: () => void) {
  void ensureProviderSubscription();
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export async function resetSeedState() {
  const nextState = await provider.resetSeedState();
  cachedState = nextState;
  listeners.forEach((callback) => callback());
  return nextState;
}

export async function getCurrentSession() {
  const state = await getState();
  return state.session;
}

export async function getSessionUser() {
  const state = await getState();
  if (!state.session) return null;
  return state.users.find((item) => item.id === state.session?.userId && !item.isDeleted) ?? null;
}

export const registerResident = (payload: {
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
}) => {
  return provider.registerResident(payload);
};

export const verifyEmailOtp = (email: string, otp: string) => provider.verifyEmailOtp(email, otp);
export const resendVerificationEmail = (email: string) => provider.resendVerificationEmail(email);
export const requestPasswordReset = (email: string) => provider.requestPasswordReset(email);
export const resetPassword = (token: string, newPassword: string) => provider.resetPassword(token, newPassword);
export const changePassword = (currentPassword: string, newPassword: string) =>
  provider.changePassword(currentPassword, newPassword);
export const login = (email: string, password: string) => provider.login(email, password);
export const logout = () => provider.logout();
export const setSessionLocale = (locale: Locale) => provider.setSessionLocale(locale);
export const updateCurrentProfile = (payload: UpdateCurrentProfilePayload) => provider.updateCurrentProfile(payload);

export const updateUserRole = (userId: string, role: UserRole) => provider.updateUserRole(userId, role);
export const softDeleteUser = (userId: string, isDeleted: boolean) => provider.softDeleteUser(userId, isDeleted);
export const hardDeleteUser = (userId: string) => provider.hardDeleteUser(userId);
export const updateUserApproval = (
  userId: string,
  status: 'pending_staff_review' | 'staff_forwarded_to_admin' | 'staff_rejected' | 'admin_approved' | 'admin_rejected',
  reviewNote?: string
) =>
  provider.updateUserApproval(userId, status, reviewNote);

export const createReservation = async (payload: {
  resource: Reservation['resource'];
  itemName?: string;
  quantityRequested?: number;
  startAt: string;
  endAt: string;
  purpose: string;
}) => {
  if (provider.createReservation) {
    return provider.createReservation(payload);
  }
  throw new Error('createReservation is not supported by the current data provider');
};

export const submitDocumentRequest = async (payload: { typeId: string; purpose: string; selectedTypeLabel?: string; attachments?: File[] }) => {
  const result = await provider.submitDocumentRequest(payload);
  if (result.ok) await refreshStateFromProvider();
  return result;
};
export const cancelPendingRequest = async (requestId: string) => {
  await provider.cancelPendingRequest(requestId);
  try {
    await refreshStateFromProvider();
  } catch {
    // Cancellation already succeeded; keep UI usable even if immediate refresh fails.
  }
};
export const acknowledgeDocumentRequestFeedbackPrompt = (requestId: string) =>
  provider.acknowledgeDocumentRequestFeedbackPrompt(requestId);
export const adminReviewRequest = (requestId: string, decision: 'approved' | 'declined', reason?: string) =>
  provider.adminReviewRequest(requestId, decision, reason);
export const staffReviewRequest = (requestId: string, decision: 'forwarded' | 'rejected', note?: string) =>
  provider.staffReviewRequest(requestId, decision, note);
export const staffApproveRequest = (requestId: string, note?: string) => provider.staffApproveRequest(requestId, note);
export const staffUpdateRequest = (
  requestId: string,
  status: 'ready_for_pickup' | 'completed' | 'declined',
  reason?: string,
  options?: {
    ocrJobId?: string;
    verificationMetadata?: unknown;
    documentLabel?: string;
  }
) => provider.staffUpdateRequest(requestId, status, reason, options);

export const adminAssignToStaff = (requestId: string, assigneeUserId: string) =>
  provider.adminAssignToStaff(requestId, assigneeUserId);

export const addFeedback = (payload: { requestId?: string; rating: number; comment?: string }) => provider.addFeedback(payload);

export const submitReport = (payload: {
  category: string;
  title: string;
  details: string;
  location: string;
  dateOfIncident: string;
  otherCategoryText?: string;
}) => provider.submitReport(payload);

export const updateReportStatus = (reportId: string, status: 'pending' | 'approved' | 'under_review' | 'proceed_to_barangay' | 'resolved' | 'declined', note?: string) =>
  provider.updateReportStatus(reportId, status, note);
export const upsertIncidentCategory = (payload: { id?: string; name: string; sortOrder?: number; isActive?: boolean }) =>
  provider.upsertIncidentCategory(payload);
export const archiveIncidentCategory = (categoryId: string) => provider.archiveIncidentCategory(categoryId);

export const upsertAnnouncement = (payload: {
  id?: string;
  title: string;
  body: string;
  audience: 'all' | 'resident' | 'staff';
  startAt: string;
  endAt: string;
}) =>
  provider.upsertAnnouncement(payload);
export const deleteAnnouncement = (idValue: string) => provider.deleteAnnouncement(idValue);

export const upsertCensus = (payload: {
  householdSize: number;
  minorsCount: number;
  ownershipStatus: 'owned' | 'rented';
  residencyClassification:
    | 'owner'
    | 'permanent_resident'
    | 'informal_settler'
    | 'tenant_renter'
    | 'boarder_lodger'
    | 'temporary_resident';
  yearsOfResidenceYears?: number;
  yearsOfResidenceMonths?: number;
}) => provider.upsertCensus(payload);

export const joinQueue = (service: string) => provider.joinQueue(service);
export const updateQueueStatus = (entryId: string, status: 'waiting' | 'serving' | 'completed' | 'cancelled') =>
  provider.updateQueueStatus(entryId, status);
export const cancelQueue = (entryId: string) => provider.cancelQueue(entryId);
export const upsertDoctor = (payload: {
  id?: string;
  name: string;
  specialization?: string;
  isActive?: boolean;
}) => provider.upsertDoctor(payload);
export const deleteDoctor = (doctorId: string) => provider.deleteDoctor(doctorId);

export const createDoctorAvailabilitySlot = (payload: {
  doctorName: string;
  date: string;
  startAt: string;
  endAt: string;
  capacity?: number;
  isBlocked?: boolean;
  notes?: string;
}) => provider.createDoctorAvailabilitySlot(payload);
export const updateDoctorAvailabilitySlot = (
  slotId: string,
  payload: Partial<{
    doctorName: string;
    date: string;
    startAt: string;
    endAt: string;
    capacity: number;
    isBlocked: boolean;
    notes: string;
  }>
) => provider.updateDoctorAvailabilitySlot(slotId, payload);
export const deleteDoctorAvailabilitySlot = (slotId: string) => provider.deleteDoctorAvailabilitySlot(slotId);
export const createCheckupAppointment = (payload: { slotId: string; reason: string }) =>
  provider.createCheckupAppointment(payload);
export const cancelCheckupAppointment = (appointmentId: string) => provider.cancelCheckupAppointment(appointmentId);
export const updateCheckupAppointmentStatus = (
  appointmentId: string,
  status: 'pending' | 'approved' | 'proceed_to_barangay' | 'completed' | 'declined' | 'cancelled',
  staffNote?: string
) => provider.updateCheckupAppointmentStatus(appointmentId, status, staffNote);

export const upsertMedicine = (payload: {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  available?: boolean;
}) =>
  provider.upsertMedicine(payload);
export const softDeleteMedicine = (medicineId: string, isDeleted: boolean) => provider.softDeleteMedicine(medicineId, isDeleted);
export const upsertEquipment = (payload: { id?: string; name: string; quantity: number; isDeleted?: boolean }) =>
  provider.upsertEquipment(payload);

export const softDeleteEquipment = (equipmentId: string, isDeleted: boolean) => provider.softDeleteEquipment(equipmentId, isDeleted);
export const submitMedicineRequest = (payload: { medicineId: string; purpose: string; requestedQuantity: number }) =>
  provider.submitMedicineRequest(payload);
export const cancelPendingMedicineRequest = (requestId: string) => provider.cancelPendingMedicineRequest(requestId);
export const adminReviewMedicineRequest = (requestId: string, decision: 'approved' | 'declined', reason?: string) =>
  provider.adminReviewMedicineRequest(requestId, decision, reason);
export const staffUpdateMedicineRequest = (
  requestId: string,
  status: 'processing' | 'completed' | 'declined',
  reason?: string
) => provider.staffUpdateMedicineRequest(requestId, status, reason);

export const upsertDocumentTemplate = (payload: { id?: string; name: string; body: string; dynamicFields: string[] }) =>
  provider.upsertDocumentTemplate(payload);

export const markNotificationRead = (notificationId: string) => provider.markNotificationRead(notificationId);
export const markAllNotificationsRead = () => provider.markAllNotificationsRead();

export const createOcrJob = (payload: { file: File; requestId?: string; templateKey?: string }) => provider.createOcrJob(payload);
export const updateOcrJob = (jobId: string, payload: { extractedText?: string; parsedFields?: Record<string, string> }) =>
  provider.updateOcrJob(jobId, payload);
export const deleteOcrJob = (jobId: string) => provider.deleteOcrJob(jobId);
export const createStandaloneOcrIssuance = (payload?: { templateKey?: string }) => provider.createStandaloneOcrIssuance(payload);
export const runStandaloneOcrIssuanceScan = (issuanceId: string, payload: { file: File }) =>
  provider.runStandaloneOcrIssuanceScan(issuanceId, payload);
export const patchStandaloneOcrIssuance = (
  issuanceId: string,
  payload: { parsedFields?: Record<string, string>; residentId?: string | null; templateKey?: string }
) => provider.patchStandaloneOcrIssuance(issuanceId, payload);
export const finalizeStandaloneOcrIssuance = (issuanceId: string, payload?: { residentId?: string | null }) =>
  provider.finalizeStandaloneOcrIssuance(issuanceId, payload);
export const sendChatMessage = (text: string): Promise<SendChatMessageResult> => provider.sendChatMessage(text);
export const generateDigitalIdCard = () => provider.generateDigitalIdCard();
export const updateDigitalIdCard = (payload: { fullName?: string; address?: string; validUntil?: string }) =>
  provider.updateDigitalIdCard(payload);
export const deleteDigitalIdCard = () => provider.deleteDigitalIdCard();

export const getDashboardMetrics = () => provider.getDashboardMetrics();
export const exportCsv = (rows: Record<string, string | number | boolean | undefined>[]) => provider.exportCsv(rows);
export const downloadCsv = (filename: string, csv: string) => provider.downloadCsv(filename, csv);
