import { documentCatalog } from '../../content/document-catalog';
import { isAnnouncementVisibleToRole } from '../../announcements/schedule';
import { getSupabaseBrowserClient, getSupabaseSessionSafely } from '../../supabase/client';
import {
  type AppState,
  type CensusOwnershipStatus,
  type DashboardMetrics,
  type IncidentCategory,
  type DoctorAvailabilitySlot,
  type DocumentCatalogItem,
  type DocumentRequest,
  type DocumentTemplate,
  type DocumentRequestAttachment,
  type CheckupAppointment,
  type Equipment,
  type Locale,
  type MedicineRequest,
  type ResidencyClassification,
  type QueueEntry,
  type Reservation,
  type ReportStatus,
  type UserApprovalStatus,
  type OcrJob,
  type Session,
  type StandaloneOcrIssuance,
  type User,
  type UserRole,
  type BarangayStreet,
  type IncidentRelationship,
} from '../../types/models';
import { err, ok } from '../../types/result';
import { createEmptyAppState } from '../empty-state';

const STREETS_STORAGE_KEY = 'eserbisyo_barangay_streets';
const RELATIONSHIPS_STORAGE_KEY = 'eserbisyo_incident_relationships';

let memoryBarangayStreets: BarangayStreet[] = [];
let memoryIncidentRelationships: IncidentRelationship[] = [];

function getStoredStreets(): BarangayStreet[] {
  if (typeof window === 'undefined') return memoryBarangayStreets;
  try {
    const raw = localStorage.getItem(STREETS_STORAGE_KEY);
    if (!raw) return memoryBarangayStreets;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryBarangayStreets = parsed;
      return parsed;
    }
  } catch {}
  return memoryBarangayStreets;
}

function saveStoredStreets(streets: BarangayStreet[]) {
  memoryBarangayStreets = [...streets];
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STREETS_STORAGE_KEY, JSON.stringify(streets));
  } catch {}
}

function getStoredRelationships(): IncidentRelationship[] {
  if (typeof window === 'undefined') return memoryIncidentRelationships;
  try {
    const raw = localStorage.getItem(RELATIONSHIPS_STORAGE_KEY);
    if (!raw) return memoryIncidentRelationships;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryIncidentRelationships = parsed;
      return parsed;
    }
  } catch {}
  return memoryIncidentRelationships;
}

function saveStoredRelationships(rels: IncidentRelationship[]) {
  memoryIncidentRelationships = [...rels];
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RELATIONSHIPS_STORAGE_KEY, JSON.stringify(rels));
  } catch {}
}
import type {
  DataProvider,
  RegisterResidentPayload,
  SendChatMessageResult,
  StaffDocumentCompletionResult,
  UpdateCurrentProfilePayload,
} from '../contracts/data-provider';

const STATE_EVENT = 'eserbisyo-state-updated';
const REALTIME_DEBOUNCE_MS = 150;

type DbProfile = {
  id: string;
  full_name: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  sex: string | null;
  civil_status: string | null;
  citizenship: string | null;
  birthdate: string | null;
  address: string | null;
  address_line: string | null;
  province: string | null;
  city: string | null;
  barangay: string | null;
  email: string;
  phone: string | null;
  id_type: string | null;
  id_number: string | null;
  id_file_name: string | null;
  id_file_path: string | null;
  id_file_name_back: string | null;
  id_file_path_back: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  role: UserRole;
  locale: Locale;
  is_deleted: boolean;
  is_verified: boolean;
  approval_status: UserApprovalStatus;
  staff_reviewed_by: string | null;
  staff_reviewed_at: string | null;
  staff_review_note: string | null;
  approval_reviewed_by: string | null;
  approval_reviewed_at: string | null;
  approval_review_note: string | null;
  created_at: string;
  updated_at: string;
};

type DbDocumentType = {
  id: string;
  category: string;
  type: string;
  price: number;
  pricing_note: string | null;
};

type DbDocumentRequestAttachment = {
  id: string;
  request_id: string;
  uploaded_by: string | null;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
};

type ApiSuccessPayload<T> = { success: true; data: T };
type ApiErrorPayload = {
  success: false;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

type E2EMockSession = {
  userId: string;
  role: UserRole;
  locale?: Locale;
  email?: string;
  fullName?: string;
};

class ApiFetchError extends Error {
  code?: string;
  details?: unknown;
  status: number;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiFetchError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function formatApiError(error: unknown, fallbackMessage: string): string {
  if (error instanceof ApiFetchError) {
    if (error.code === 'RATE_LIMITED' && error.details && typeof error.details === 'object') {
      const retryAfterSeconds = (error.details as { retryAfterSeconds?: unknown }).retryAfterSeconds;
      if (typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds)) {
        return `Please wait ${retryAfterSeconds}s before requesting another verification code.`;
      }
    }
    return error.message;
  }
  return error instanceof Error ? error.message : fallbackMessage;
}

function parseLegacyMedicineDescription(description: string): {
  quantity: number;
  unit: string;
  expiryDate?: string;
} {
  const fallback = { quantity: 0, unit: 'unit' };
  const match = description.match(/^\s*(\d+)\s+([^()]+?)(?:\s*\(exp\s*(\d{4}-\d{2}-\d{2})\))?\s*$/i);
  if (!match) return fallback;

  const quantity = Number(match[1]);
  if (!Number.isFinite(quantity) || quantity < 0) return fallback;

  const parsedUnit = match[2]?.trim() || 'unit';
  const expiryDate = match[3]?.trim() || undefined;
  return {
    quantity,
    unit: parsedUnit,
    expiryDate,
  };
}

function isLockContentionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const normalized = error.message.toLowerCase();
  return (
    normalized.includes('lock broken by another request') ||
    normalized.includes("'steal' option") ||
    normalized.includes('another request stole it')
  );
}

async function safeAuthGetUser(supabase: ReturnType<typeof getSupabaseBrowserClient>) {
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await supabase.auth.getUser();
    } catch (error) {
      if (!isLockContentionError(error)) throw error;
      lastError = error;

      // Retry with exponential backoff: 50ms, 100ms, 200ms
      if (attempt < maxRetries - 1) {
        const delayMs = 50 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // Last attempt: fall back to getting session
  try {
    const sessionResult = await getSupabaseSessionSafely(supabase);
    return {
      data: {
        user: sessionResult.data.session?.user ?? null,
      },
    };
  } catch (fallbackError) {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('Failed to get user after retries:', lastError, 'fallback error:', fallbackError);
    }
    return {
      data: {
        user: null,
      },
    };
  }
}

async function safeAuthGetAccessToken(supabase: ReturnType<typeof getSupabaseBrowserClient>) {
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const sessionResult = await getSupabaseSessionSafely(supabase);
      return sessionResult.data.session?.access_token ?? null;
    } catch (error) {
      if (!isLockContentionError(error)) throw error;
      lastError = error;

      // Retry with exponential backoff: 50ms, 100ms, 200ms
      if (attempt < maxRetries - 1) {
        const delayMs = 50 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // If all retries failed, log the error but return null to allow the request to proceed
  // (though it will likely fail with 401 if auth is required)
  if (lastError && typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn('Failed to get access token after retries:', lastError);
  }
  return null;
}

async function refreshAccessTokenFromServer(): Promise<string | null> {
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    credentials: 'same-origin',
  });

  if (!response.ok) return null;

  const payload = (await response.json().catch(() => null)) as
    | { success?: true; data?: { accessToken?: string } }
    | null;
  return payload?.success && typeof payload.data?.accessToken === 'string' ? payload.data.accessToken : null;
}

async function apiFetch<T>(path: string, init?: RequestInit & { skipAuth?: boolean }): Promise<T> {
  const supabase = getSupabaseBrowserClient();
  let token = init?.skipAuth ? null : await safeAuthGetAccessToken(supabase);
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (token) headers.set('authorization', `Bearer ${token}`);
  let response = await fetch(path, { ...init, headers, credentials: 'same-origin' });

  // The server keeps the session in httpOnly cookies, so recover when the
  // browser Supabase session is stale or temporarily unavailable.
  if (response.status === 401 && !init?.skipAuth && !(init?.body instanceof ReadableStream)) {
    const refreshedToken = await refreshAccessTokenFromServer();
    if (refreshedToken) {
      token = refreshedToken;
      headers.set('authorization', `Bearer ${token}`);
      response = await fetch(path, { ...init, headers, credentials: 'same-origin' });
    }
  }

  let payload: ApiSuccessPayload<T> | ApiErrorPayload | null = null;
  let fallbackText: string | null = null;
  try {
    const text = await response.text();
    fallbackText = text; // Save it first in case it's HTML
    if (text) {
      payload = JSON.parse(text) as ApiSuccessPayload<T> | ApiErrorPayload;
    }
  } catch (jsonErr) {
    // text wasn't valid JSON, fallbackText already has the raw response
  }

  if (!response.ok || !payload || !('success' in payload) || !payload.success) {
    const code = payload && 'error' in payload ? payload.error?.code : undefined;
    const details = payload && 'error' in payload ? payload.error?.details : undefined;
    // Prefer structured error message, then fallback text, then statusText, then generic.
    const message =
      (payload && 'error' in payload && payload.error?.message) ||
      (typeof fallbackText === 'string' && fallbackText.trim() ? fallbackText : '') ||
      response.statusText ||
      'Request failed.';

    // Dev-friendly logging (keep minimal/no-op in production)
    try {
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        const errorData = {
          url: path,
          status: response.status,
          statusText: response.statusText,
          success: payload?.success,
          error: payload && 'error' in payload ? payload.error : undefined,
          fallbackText: fallbackText?.substring(0, 500),
          // Additional diagnostic flags
          rawPayload: payload,
          hasFallback: !!fallbackText && !!fallbackText.trim().length,
        };

        const getCircularReplacer = () => {
          const seen = new WeakSet();
          return (_key: string, value: unknown) => {
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value as object)) return '[Circular]';
              seen.add(value as object);
            }
            return value;
          };
        };

        let serialized = '';
        try {
          serialized = JSON.stringify(errorData, getCircularReplacer(), 2);
        } catch (serErr) {
          serialized = String(errorData);
        }

        // eslint-disable-next-line no-console
        console.error('apiFetch error', serialized);
      }
    } catch (logErr) {
      // eslint-disable-next-line no-console
      console.error('Failed to log apiFetch error', logErr);
    }

    throw new ApiFetchError(message, response.status, code, { details, rawText: fallbackText });
  }

  return payload.data;
}

function emitStateChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(STATE_EVENT));
}

let emitRealtimeTimer: number | null = null;
let activeStateSubscribers = 0;
let realtimeCleanup: (() => Promise<void>) | null = null;
let authRealtimeCleanup: (() => void) | null = null;
let realtimeUserId: string | null = null;
let realtimeSyncQueue: Promise<void> = Promise.resolve();

function getRealtimeChannelTopic(channel: unknown): string | null {
  if (!channel || typeof channel !== 'object') return null;
  const maybeTopic = (channel as { topic?: unknown }).topic;
  return typeof maybeTopic === 'string' ? maybeTopic : null;
}

async function removeResidentNotificationChannelsForUser(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  userId: string
) {
  const notificationTopic = `resident-notifications-${userId}`;
  const profileTopic = `profile-changes-${userId}`;
  const matchingChannels = supabase.getChannels().filter((channel) => {
    const topic = getRealtimeChannelTopic(channel);
    return topic?.includes(notificationTopic) || topic?.includes(profileTopic);
  });
  if (matchingChannels.length === 0) return;

  await Promise.all(matchingChannels.map((channel) => supabase.removeChannel(channel)));
}

function emitStateChangedDebounced() {
  if (typeof window === 'undefined') return;
  if (emitRealtimeTimer) {
    window.clearTimeout(emitRealtimeTimer);
  }
  emitRealtimeTimer = window.setTimeout(() => {
    emitRealtimeTimer = null;
    emitStateChanged();
  }, REALTIME_DEBOUNCE_MS);
}

async function stopRealtimeSubscription() {
  if (realtimeCleanup) {
    try {
      await realtimeCleanup();
    } finally {
      realtimeCleanup = null;
    }
  }
  realtimeUserId = null;
}

async function syncRealtimeSubscriptionForCurrentUserInternal() {
  if (typeof window === 'undefined') return;
  if (activeStateSubscribers <= 0) {
    await stopRealtimeSubscription();
    return;
  }

  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await safeAuthGetUser(supabase);

  const nextUserId = user?.id ?? null;
  if (!nextUserId) {
    await stopRealtimeSubscription();
    return;
  }
  if (realtimeUserId === nextUserId && realtimeCleanup) return;

  await stopRealtimeSubscription();
  await removeResidentNotificationChannelsForUser(supabase, nextUserId);

  realtimeUserId = nextUserId;

  // Cleanup any globally tracking channels first to ensure no overlap
  await supabase.removeChannel(supabase.channel(`resident-notifications-${nextUserId}`));
  await supabase.removeChannel(supabase.channel(`profile-changes-${nextUserId}`));

  const channel = supabase.channel(`resident-notifications-${nextUserId}`);
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${nextUserId}`,
    },
    () => {
      emitStateChangedDebounced();
    }
  );

  // Also subscribe to profile changes for the current user so UI updates
  // (and forces logout) immediately when an admin soft-deletes the account.
  const profileChannel = supabase.channel(`profile-changes-${nextUserId}`);
  profileChannel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'profiles',
      filter: `id=eq.${nextUserId}`,
    },
    () => {
      emitStateChangedDebounced();
    }
  );

  await Promise.all([
    new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') resolve();
      });
    }),
    new Promise<void>((resolve) => {
      profileChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') resolve();
      });
    }),
  ]);

  realtimeCleanup = async () => {
    await Promise.all([supabase.removeChannel(channel), supabase.removeChannel(profileChannel)]);
  };
}

function syncRealtimeSubscriptionForCurrentUser() {
  realtimeSyncQueue = realtimeSyncQueue
    .catch(() => undefined)
    .then(() => syncRealtimeSubscriptionForCurrentUserInternal());
  return realtimeSyncQueue;
}

function ensureRealtimeLifecycle() {
  if (typeof window === 'undefined') return;
  if (authRealtimeCleanup) return;

  const supabase = getSupabaseBrowserClient();
  const { data } = supabase.auth.onAuthStateChange(() => {
    void syncRealtimeSubscriptionForCurrentUser();
  });
  authRealtimeCleanup = () => {
    data.subscription.unsubscribe();
  };

  void syncRealtimeSubscriptionForCurrentUser();
}

function teardownRealtimeLifecycleIfIdle() {
  if (activeStateSubscribers > 0) return;
  void syncRealtimeSubscriptionForCurrentUser();
  if (authRealtimeCleanup) {
    authRealtimeCleanup();
    authRealtimeCleanup = null;
  }
}

function readE2EMockSession(): E2EMockSession | null {
  if (typeof window === 'undefined') return null;
  const raw = (window as { __ESERBISYO_E2E_SESSION__?: unknown }).__ESERBISYO_E2E_SESSION__;
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<E2EMockSession>;
  if (!candidate.userId || !candidate.role) return null;
  if (candidate.role !== 'resident' && candidate.role !== 'staff' && candidate.role !== 'admin') return null;
  return {
    userId: candidate.userId,
    role: candidate.role,
    locale: candidate.locale === 'fil' ? 'fil' : 'en',
    email: candidate.email,
    fullName: candidate.fullName,
  };
}

function toUser(profile: DbProfile): User {
  return {
    id: profile.id,
    fullName: profile.full_name,
    firstName: profile.first_name ?? undefined,
    middleName: profile.middle_name ?? undefined,
    lastName: profile.last_name ?? undefined,
    suffix: profile.suffix ?? undefined,
    sex: profile.sex ?? undefined,
    civilStatus: profile.civil_status ?? undefined,
    citizenship: profile.citizenship ?? undefined,
    birthdate: profile.birthdate ?? '',
    address: profile.address ?? '',
    addressLine: profile.address_line ?? undefined,
    province: profile.province ?? undefined,
    city: profile.city ?? undefined,
    barangay: profile.barangay ?? undefined,
    email: profile.email,
    phone: profile.phone ?? '',
    idType: profile.id_type ?? undefined,
    idNumber: profile.id_number ?? '',
    idFileName: profile.id_file_name ?? undefined,
    idFilePath: profile.id_file_path ?? undefined,
    idFileNameBack: profile.id_file_name_back ?? undefined,
    idFilePathBack: profile.id_file_path_back ?? undefined,
    termsAcceptedAt: profile.terms_accepted_at ?? undefined,
    privacyAcceptedAt: profile.privacy_accepted_at ?? undefined,
    password: '',
    role: profile.role,
    isDeleted: profile.is_deleted,
    isVerified: profile.is_verified,
    approvalStatus: profile.approval_status,
    staffReviewedAt: profile.staff_reviewed_at ?? undefined,
    staffReviewNote: profile.staff_review_note ?? undefined,
    approvalReviewedAt: profile.approval_reviewed_at ?? undefined,
    approvalReviewNote: profile.approval_review_note ?? undefined,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

function formatDate(value: string): string {
  return value.includes('T') ? value.slice(0, 10) : value;
}

function toDocumentRequestAttachment(item: DbDocumentRequestAttachment): DocumentRequestAttachment {
  return {
    id: item.id,
    requestId: item.request_id,
    uploadedBy: item.uploaded_by ?? undefined,
    fileName: item.file_name,
    mimeType: item.mime_type ?? undefined,
    fileSizeBytes: item.file_size_bytes ?? undefined,
    downloadUrl: `/api/v1/document-requests/${item.request_id}/attachments/${item.id}`,
    createdAt: item.created_at,
  };
}

const RESIDENCY_BY_OWNERSHIP: Record<CensusOwnershipStatus, ResidencyClassification[]> = {
  owned: ['owner', 'permanent_resident', 'informal_settler'],
  rented: ['tenant_renter', 'boarder_lodger', 'temporary_resident'],
};

function normalizeCensusOwnershipStatus(value: unknown): CensusOwnershipStatus {
  return value === 'rented' || value === 'shared' ? 'rented' : 'owned';
}

function normalizeResidencyClassification(
  ownershipStatus: CensusOwnershipStatus,
  value: unknown
): ResidencyClassification {
  if (typeof value === 'string' && RESIDENCY_BY_OWNERSHIP[ownershipStatus].includes(value as ResidencyClassification)) {
    return value as ResidencyClassification;
  }
  return ownershipStatus === 'owned' ? 'owner' : 'tenant_renter';
}

async function getCurrentProfile() {
  const supabase = getSupabaseBrowserClient();
  const { data: authData } = await safeAuthGetUser(supabase);
  const authUser = authData.user;
  if (!authUser) {
    return null;
  }
  const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
  if (error || !data) {
    return null;
  }
  return data as DbProfile;
}

async function requireRole(roles: UserRole[]) {
  const profile = await getCurrentProfile();
  if (!profile || !roles.includes(profile.role)) return null;
  return profile;
}

async function createState(): Promise<AppState> {
  const supabase = getSupabaseBrowserClient();
  const empty = createEmptyAppState();

  let [
    authResult,
    profilesRes,
    docTypesRes,
    requestsRes,
    requestAttachmentsRes,
    templatesRes,
    generatedRes,
    reportsRes,
    incidentCategoriesRes,
    feedbackRes,
    announcementsRes,
    censusRes,
    queueRes,
    reservationsRes,
    doctorAvailabilitySlotsRes,
    checkupAppointmentsRes,
    medicinesRes,
    equipmentRes,
    notificationsRes,
    emailLogsRes,
    auditLogsRes,
    ocrRes,
    doctorsRes,
    barangayStreetsRes,
    incidentRelationshipsRes,
    appMetaRes,
  ] = await Promise.all([
    safeAuthGetUser(supabase),
    supabase.from('profiles').select('*'),
    supabase.from('document_types').select('*'),
    supabase.from('document_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('document_request_attachments').select('*').order('created_at', { ascending: true }),
    supabase.from('document_templates').select('*').order('updated_at', { ascending: false }),
    supabase.from('generated_documents').select('*').order('date_issued', { ascending: false }),
    supabase.from('incident_reports').select('*').order('created_at', { ascending: false }),
    supabase.from('incident_categories').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
    supabase.from('feedback').select('*').order('created_at', { ascending: false }),
    supabase.from('announcements').select('*').order('created_at', { ascending: false }),
    supabase.from('census_records').select('*').order('updated_at', { ascending: false }),
    supabase.from('queue_entries').select('*').order('created_at', { ascending: true }),
    supabase.from('reservations').select('*').order('created_at', { ascending: false }),
    supabase.from('doctor_availability_slots').select('*').order('start_at', { ascending: true }),
    supabase.from('checkup_appointments').select('*').order('created_at', { ascending: false }),
    supabase.from('medicines').select('*').order('updated_at', { ascending: false }),
    supabase.from('equipment').select('*').order('name', { ascending: true }),
    // medicine_requests removed from DB; skip fetching it
    supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    supabase.from('email_logs').select('*').order('created_at', { ascending: false }),
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }),
    supabase.from('ocr_jobs').select('*').order('created_at', { ascending: false }),
    supabase.from('doctors').select('*').order('name', { ascending: true }),
    supabase.from('barangay_streets').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
    supabase.from('incident_relationships').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
    supabase.from('app_meta').select('*').order('updated_at', { ascending: false }).limit(1),
  ]);

  const profiles = ((profilesRes.data as DbProfile[] | null) ?? []).filter((item) => item?.id);
  const profileMap = new Map(profiles.map((item) => [item.id, item]));
  const users = profiles.map(toUser);

  const authUser = authResult.data.user;
  let session: Session | null = null;
  if (authUser) {
    const profile = profileMap.get(authUser.id);
    if (profile) {
      session = {
        userId: profile.id,
        role: profile.role,
        locale: profile.locale,
        createdAt: profile.updated_at,
      };
    }
  }
  const e2eMockSession = !session ? readE2EMockSession() : null;
  if (!session && e2eMockSession) {
    session = {
      userId: e2eMockSession.userId,
      role: e2eMockSession.role,
      locale: e2eMockSession.locale ?? 'en',
      createdAt: new Date().toISOString(),
    };
    if (!profileMap.has(e2eMockSession.userId)) {
      users.push({
        id: e2eMockSession.userId,
        fullName: e2eMockSession.fullName ?? 'QA Resident',
        birthdate: '',
        address: '',
        email: e2eMockSession.email ?? 'qa-resident@example.com',
        phone: '',
        idNumber: '',
        password: '',
        role: e2eMockSession.role,
        isDeleted: false,
        isVerified: true,
        approvalStatus: 'admin_approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  if (!reservationsRes?.data || reservationsRes.data.length === 0) {
    reservationsRes = session?.role === 'resident'
      ? await supabase.from('reservations').select('*').eq('resident_id', session.userId).order('created_at', { ascending: false })
      : await supabase.from('reservations').select('*').order('created_at', { ascending: false });
  }

  const dbDocumentTypes = (docTypesRes.data as DbDocumentType[] | null) ?? [];
  const dbTypeMap = new Map(dbDocumentTypes.map((item) => [item.id, item]));
  const attachmentsByRequest = ((requestAttachmentsRes.data as DbDocumentRequestAttachment[] | null) ?? [])
    .map(toDocumentRequestAttachment)
    .reduce<Map<string, DocumentRequestAttachment[]>>((acc, attachment) => {
      const current = acc.get(attachment.requestId) ?? [];
      current.push(attachment);
      acc.set(attachment.requestId, current);
      return acc;
    }, new Map());
  const dbMedicines = (medicinesRes.data as any[] | null) ?? [];
  const medicineNameById = new Map(dbMedicines.map((item) => [item.id as string, (item.name as string | null) ?? 'Medicine']));

  const state: AppState = {
    ...empty,
    users,
    session,
    documentRequests: ((requestsRes.data as any[] | null) ?? []).map((item): DocumentRequest => {
      const resident = profileMap.get(item.resident_id);
      const docType = dbTypeMap.get(item.type_id);
      const catalogMatch = documentCatalog.find(
        (catalogItem) => catalogItem.category === docType?.category && catalogItem.type === docType?.type
      );
      return {
        id: item.id,
        referenceNumber: item.reference_number,
        residentId: item.resident_id,
        residentName: resident?.full_name ?? 'Resident',
        typeId: catalogMatch?.id ?? item.type_id,
        typeLabel: item.selected_type_label ?? docType?.type ?? 'Document',
        selectedTypeLabel: item.selected_type_label ?? undefined,
        category: docType?.category ?? 'General',
        purpose: item.purpose,
        amount: Number(item.amount ?? 0),
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        feedbackPromptedAt: item.feedback_prompted_at ?? undefined,
        adminDecisionReason: item.admin_decision_reason ?? undefined,
        processingDeclineReason: item.processing_decline_reason ?? undefined,
        processedBy: item.processed_by ?? undefined,
        attachments: attachmentsByRequest.get(item.id) ?? [],
      };
    }),
    doctors: ((doctorsRes.data as any[] | null) ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      specialization: item.specialization ?? undefined,
      isActive: Boolean(item.is_active),
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
    documentTemplates: ((templatesRes.data as any[] | null) ?? []).map((item) => {
      let meta: Record<string, any> = {};
      let cleanBody = item.body || '';
      const metaMatch = cleanBody.match(/<!-- TEMPLATE_META:([\s\S]*?) -->$/);
      if (metaMatch) {
        try {
          meta = JSON.parse(metaMatch[1]);
          cleanBody = cleanBody.replace(/<!-- TEMPLATE_META:([\s\S]*?) -->$/, '').trim();
        } catch {
          // ignore
        }
      }
      return {
        id: item.id,
        name: item.name,
        body: meta.plainBody !== undefined ? meta.plainBody : (cleanBody.includes('<div') || cleanBody.includes('<!DOCTYPE') ? '' : cleanBody),
        htmlBody: meta.htmlBody ?? (cleanBody.includes('<') ? cleanBody : undefined),
        dynamicFields: item.dynamic_fields ?? [],
        updatedAt: item.updated_at,
        updatedBy: item.updated_by ?? '',
        documentType: meta.documentType ?? 'custom',
        sourceType: meta.sourceType ?? 'custom',
        originalFileName: meta.originalFileName,
        fieldMappings: meta.fieldMappings ?? [],
        headerConfig: meta.headerConfig,
        officialsConfig: meta.officialsConfig,
        overrideSettings: meta.overrideSettings,
        isActive: meta.isActive ?? true,
        isOverwritten: Boolean(meta.isOverwritten),
      };
    }),
    generatedDocuments: ((generatedRes.data as any[] | null) ?? []).map((item) => ({
      id: item.id,
      requestId: item.request_id ?? undefined,
      documentType: item.document_type,
      residentName: item.resident_name,
      dateIssued: formatDate(item.date_issued),
      processedBy: item.processed_by ?? '',
      verificationStatus: item.verification_status === 'verified' ? 'verified' : 'pending',
      qrPayload: item.qr_payload ?? '',
      digitalSeal: Boolean(item.digital_seal),
      eSignatureName: item.e_signature_name ?? '',
    })),
    reports: ((reportsRes.data as any[] | null) ?? []).map((item) => {
      const trackType: 'community_concern' | 'incident' =
        item.track_type === 'incident' || item.track_type === 'community_concern'
          ? item.track_type
          : item.kind && item.kind.toLowerCase() !== 'community concern'
          ? 'incident'
          : 'community_concern';
      return {
        id: item.id,
        residentId: item.resident_id,
        residentName: profileMap.get(item.resident_id)?.full_name ?? 'Resident',
        kind: item.kind ?? (trackType === 'incident' ? 'Incident' : 'Community Concern'),
        trackType,
        desiredAction: item.desired_action ?? (trackType === 'incident' ? 'request_meeting' : 'none'),
        otherCategoryText: item.other_category_text ?? undefined,
        relationshipToRespondent: item.relationship_to_respondent ?? item.metadata?.relationshipToRespondent ?? undefined,
        streetName: item.street_name ?? item.metadata?.streetName ?? undefined,
        specificLocation: item.specific_location ?? item.metadata?.specificLocation ?? undefined,
        title: item.title,
        details: item.details,
        location: item.location,
        dateOfIncident: formatDate(item.date_of_incident),
        status: item.status,
        parties: item.parties ?? [],
        actionLog: item.action_log ?? undefined,
        proceedings: item.proceedings ?? [],
        cfa: item.cfa ?? undefined,
        pnpReferral: item.pnp_referral ?? undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    }),
    reservations: ((reservationsRes.data as any[] | null) ?? []).map((item): Reservation => ({
      id: item.id,
      residentId: item.resident_id,
      residentName: profileMap.get(item.resident_id)?.full_name ?? 'Resident',
      resource: item.resource,
      serviceType: item.resource,
      itemName: item.item_name ?? undefined,
      quantityRequested: Number(item.quantity_requested ?? 1),
      purpose: item.purpose ?? '',
      reason: item.reason ?? undefined,
      date: formatDate(item.date ?? item.start_at ?? item.created_at),
      startAt: item.start_at ?? item.date ?? item.created_at,
      endAt: item.end_at ?? item.start_at ?? item.date ?? item.created_at,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at ?? undefined,
    })),
    incidentCategories: ((incidentCategoriesRes.data as any[] | null) ?? []).map((item): IncidentCategory => ({
      id: item.id,
      name: item.name,
      isActive: Boolean(item.is_active),
      sortOrder: Number(item.sort_order ?? 0),
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
    barangayStreets: ((barangayStreetsRes?.data as any[] | null) ?? []).length > 0
      ? ((barangayStreetsRes?.data as any[] | null) ?? []).map((item): BarangayStreet => ({
          id: item.id,
          name: item.name,
          isActive: Boolean(item.is_active),
          sortOrder: Number(item.sort_order ?? 0),
        }))
      : getStoredStreets(),
    incidentRelationships: ((incidentRelationshipsRes?.data as any[] | null) ?? []).length > 0
      ? ((incidentRelationshipsRes?.data as any[] | null) ?? []).map((item): IncidentRelationship => ({
          id: item.id,
          name: item.name,
          isActive: Boolean(item.is_active),
          sortOrder: Number(item.sort_order ?? 0),
        }))
      : getStoredRelationships(),
    feedback: ((feedbackRes.data as any[] | null) ?? []).map((item) => ({
      id: item.id,
      requestId: item.request_id ?? undefined,
      residentId: item.resident_id,
      rating: item.rating,
      comment: item.comment ?? undefined,
      createdAt: item.created_at,
    })),
    announcements: ((announcementsRes.data as any[] | null) ?? [])
      .filter((item) =>
        session?.role === 'resident'
          ? isAnnouncementVisibleToRole(
              {
                audience: item.audience,
                startAt: item.start_at ?? item.created_at,
                endAt: item.end_at ?? null,
                createdAt: item.created_at,
              },
              session.role
            )
          : true
      )
      .map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      audience: item.audience,
      startAt: item.start_at ?? item.created_at,
      endAt: item.end_at ?? undefined,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      createdBy: item.created_by ?? '',
    })),
    censusRecords: ((censusRes.data as any[] | null) ?? []).map((item) => {
      const ownershipStatus = normalizeCensusOwnershipStatus(item.ownership_status);
      const residencyClassification = normalizeResidencyClassification(ownershipStatus, item.residency_classification);
      const yearsOfResidenceYears =
        Number.isInteger(item.permanent_resident_years) && Number(item.permanent_resident_years) >= 0
          ? Number(item.permanent_resident_years)
          : undefined;
      const yearsOfResidenceMonths =
        Number.isInteger(item.years_of_residence_months)
          && Number(item.years_of_residence_months) >= 0
          && Number(item.years_of_residence_months) <= 11
          ? Number(item.years_of_residence_months)
          : undefined;
      return {
        residentId: item.resident_id,
        householdSize: item.household_size,
        minorsCount: item.minors_count,
        ownershipStatus,
        residencyClassification,
        yearsOfResidenceYears,
        yearsOfResidenceMonths,
        updatedAt: item.updated_at,
      };
    }),
    queueEntries: ((queueRes.data as any[] | null) ?? []).map((item) => ({
      id: item.id,
      residentId: item.resident_id,
      residentName: profileMap.get(item.resident_id)?.full_name ?? 'Resident',
      service: item.service,
      status: item.status,
      position: item.position,
      createdAt: item.created_at,
    })),
    doctorAvailabilitySlots: ((doctorAvailabilitySlotsRes.data as any[] | null) ?? []).map(
      (item): DoctorAvailabilitySlot => ({
        id: item.id,
        doctorName: item.doctor_name,
        date: formatDate(item.date),
        startAt: item.start_at,
        endAt: item.end_at,
        capacity: typeof item.capacity === 'number' ? item.capacity : 7,
        isBlocked: Boolean(item.is_blocked),
        notes: item.notes ?? undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })
    ),
    checkupAppointments: ((checkupAppointmentsRes.data as any[] | null) ?? []).map(
      (item): CheckupAppointment => ({
        id: item.id,
        residentId: item.resident_id,
        residentName: profileMap.get(item.resident_id)?.full_name ?? 'Resident',
        slotId: item.slot_id,
        doctorName: item.doctor_name,
        date: formatDate(item.date),
        startAt: item.start_at,
        endAt: item.end_at,
        reason: item.reason,
        status: item.status,
        staffNote: item.staff_note ?? undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })
    ),
    medicines: dbMedicines.map((item) => {
      const parsed =
        item.quantity == null || !item.unit
          ? parseLegacyMedicineDescription(item.description ?? '')
          : {
              quantity: Number(item.quantity ?? 0),
              unit: String(item.unit ?? 'unit'),
              expiryDate: item.expiry_date ?? undefined,
            };

      return {
        id: item.id,
        name: item.name,
        description: item.description ?? '',
        quantity: parsed.quantity,
        unit: parsed.unit,
        expiryDate: parsed.expiryDate,
        available: typeof item.available === 'boolean' ? item.available : parsed.quantity > 0,
        isDeleted: Boolean(item.is_deleted),
        updatedAt: item.updated_at,
      };
    }),
    equipment: ((equipmentRes.data as any[] | null) ?? []).map((item): Equipment => ({
      id: item.id,
      name: item.name,
      quantity: Number(item.quantity ?? 0),
      isDeleted: Boolean(item.is_deleted),
      updatedAt: item.updated_at ?? item.created_at ?? '',
    })),
    // medicineRequests: removed (table deleted)
    notifications: ((notificationsRes.data as any[] | null) ?? []).map((item) => ({
      id: item.id,
      userId: item.user_id,
      title: item.title,
      message: item.message,
      type: item.type,
      priority: item.priority ?? 'info',
      eventKey: item.event_key ?? 'legacy.unknown',
      entityType: item.entity_type ?? undefined,
      entityId: item.entity_id ?? undefined,
      actionHref: item.action_href ?? undefined,
      createdAt: item.created_at,
      read: Boolean(item.read),
    })),
    emailLogs: ((emailLogsRes.data as any[] | null) ?? []).map((item) => ({
      id: item.id,
      toUserId: item.to_user_id ?? '',
      toEmail: item.to_email,
      subject: item.subject,
      body: item.body,
      createdAt: item.created_at,
    })),
    auditLogs: ((auditLogsRes.data as any[] | null) ?? []).map((item) => ({
      id: item.id,
      action: item.action,
      actorId: item.actor_id ?? '',
      actorRole: item.actor_role,
      targetId: item.target_id ?? '',
      context: item.context ?? '',
      createdAt: item.created_at,
    })),
    ocrJobs: ((ocrRes.data as any[] | null) ?? []).map((item) => ({
      id: item.id,
      residentId: item.resident_id,
      fileName: item.file_name,
      extractedText: item.extracted_text ?? '',
      requestId: item.request_id ?? undefined,
      parsedFields:
        item.parsed_fields && typeof item.parsed_fields === 'object'
          ? (item.parsed_fields as Record<string, string>)
          : undefined,
      templateKey: item.template_key ?? undefined,
      templateVersion: item.template_version ?? undefined,
      status: item.status ?? 'completed',
      mimeType: item.mime_type ?? undefined,
      fileSizeBytes: typeof item.file_size_bytes === 'number' ? item.file_size_bytes : undefined,
      filePath: item.file_path ?? undefined,
      model: item.model_name ?? undefined,
      errorMessage: item.error_message ?? undefined,
      updatedAt: item.updated_at ?? undefined,
      createdAt: item.created_at,
    })),
    chatSessions: [],
    digitalIds: [],
    meta: {
      idCounters: ((appMetaRes.data as any[] | null)?.[0]?.id_counters ?? {}) as Record<string, number>,
    },
  };

  return state;
}

async function readProfileById(id: string) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
  return (data as DbProfile | null) ?? null;
}

export const backendProvider: DataProvider = {
  async getState() {
    return createState();
  },

  subscribeToState(callback: () => void) {
    if (typeof window === 'undefined') return () => undefined;
    const handler = () => callback();
    activeStateSubscribers += 1;
    ensureRealtimeLifecycle();
    window.addEventListener(STATE_EVENT, handler);
    return () => {
      window.removeEventListener(STATE_EVENT, handler);
      activeStateSubscribers = Math.max(0, activeStateSubscribers - 1);
      teardownRealtimeLifecycleIfIdle();
    };
  },

  async resetSeedState() {
    return createState();
  },

  async getCurrentSession() {
    const state = await createState();
    return state.session;
  },

  async getSessionUser() {
    const state = await createState();
    if (!state.session) return null;
    return state.users.find((item) => item.id === state.session?.userId && !item.isDeleted) ?? null;
  },

  async registerResident(payload: RegisterResidentPayload) {
    try {
      const formData = new FormData();
      formData.set('email', payload.email);
      formData.set('password', payload.password);
      formData.set('firstName', payload.firstName);
      formData.set('middleName', payload.middleName ?? '');
      formData.set('lastName', payload.lastName);
      formData.set('suffix', payload.suffix ?? '');
      formData.set('sex', payload.sex);
      formData.set('civilStatus', payload.civilStatus);
      formData.set('citizenship', payload.citizenship);
      formData.set('birthDate', payload.birthdate);
      formData.set('contactNumber', payload.contactNumber);
      formData.set('addressLine', payload.addressLine);
      formData.set('province', payload.province);
      formData.set('city', payload.city ?? '');
      formData.set('barangay', payload.barangay);
      formData.set('idType', payload.idType);
      formData.set('idNumber', payload.idNumber);
      formData.set('termsAccepted', String(payload.termsAccepted));
      formData.set('privacyAccepted', String(payload.privacyAccepted));
      formData.set('idImageFileFront', payload.idImageFileFront);
      formData.set('idImageFileBack', payload.idImageFileBack);

      const data = await apiFetch<{
        userId: string;
        verificationRequired: boolean;
        verificationEmailSent: boolean;
        warning?: string;
        email: string;
      }>('/api/v1/auth/register', {
        method: 'POST',
        body: formData,
        skipAuth: true,
      });
      return ok({
        email: data.email,
        verificationRequired: data.verificationRequired,
        verificationEmailSent: data.verificationEmailSent,
        warning: data.warning,
      });
    } catch (error) {
      return err(formatApiError(error, 'Unable to register account.'));
    }
  },

  async verifyEmailOtp(email: string, otp: string) {
    try {
      const data = await apiFetch<{
        verified: boolean;
        approvalStatus: UserApprovalStatus;
        email: string;
      }>('/api/v1/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
        skipAuth: true,
      });
      return ok(data);
    } catch (error) {
      return err(formatApiError(error, 'Unable to verify email code.'));
    }
  },

  async resendVerificationEmail(email: string) {
    try {
      await apiFetch<{ sent: boolean }>('/api/v1/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipAuth: true,
      });
      return ok({ sent: true });
    } catch (error) {
      return err(formatApiError(error, 'Unable to resend verification code.'));
    }
  },

  async requestPasswordReset(email: string) {
    try {
      const data = await apiFetch<{ sent: boolean; message: string }>('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipAuth: true,
      });
      return ok({ sent: data.sent, message: data.message });
    } catch (error) {
      return err(formatApiError(error, 'Unable to request password reset.'));
    }
  },

  async resetPassword(token: string, newPassword: string) {
    try {
      const data = await apiFetch<{ reset: boolean }>('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
        skipAuth: true,
      });
      return ok({ reset: data.reset });
    } catch (error) {
      return err(formatApiError(error, 'Unable to reset password.'));
    }
  },

  async changePassword(currentPassword: string, newPassword: string) {
    try {
      const data = await apiFetch<{ changed: boolean }>('/api/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return ok({ changed: data.changed });
    } catch (error) {
      return err(formatApiError(error, 'Unable to change password.'));
    }
  },

  async login(email: string, password: string) {
    try {
      const data = await apiFetch<{
        userId: string;
        session: { accessToken: string; refreshToken: string };
      }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.setSession({
        access_token: data.session.accessToken,
        refresh_token: data.session.refreshToken,
      });
      const profile = await readProfileById(data.userId);
      if (!profile) return err('User profile not found.');
      emitStateChanged();
      return ok({ user: toUser(profile) });
    } catch (error) {
      return err(formatApiError(error, 'Unable to log in.'));
    }
  },

  async logout() {
    try {
      await apiFetch<{ loggedOut: boolean }>('/api/v1/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Continue with client sign-out even if server logout fails.
    }
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    await stopRealtimeSubscription();
    emitStateChanged();
  },

  async setSessionLocale(locale: Locale) {
    await apiFetch('/api/v1/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify({ locale }),
    });
    emitStateChanged();
  },

  async updateCurrentProfile(payload: UpdateCurrentProfilePayload) {
    await apiFetch('/api/v1/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify({
        fullName: payload.fullName,
        phone: payload.phone,
        address: payload.address,
        birthdate: payload.birthdate,
        sex: payload.sex,
        civilStatus: payload.civilStatus,
        citizenship: payload.citizenship,
      }),
    });
    emitStateChanged();
  },

  async updateUserRole(userId: string, role: UserRole) {
    await apiFetch(`/api/v1/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    emitStateChanged();
  },

  async softDeleteUser(userId: string, isDeleted: boolean) {
    await apiFetch(`/api/v1/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isDeleted }),
    });
    emitStateChanged();
  },

  async hardDeleteUser(userId: string) {
    await apiFetch(`/api/v1/users/${userId}`, {
      method: 'DELETE',
    });
    emitStateChanged();
  },

  async updateUserApproval(userId: string, status: UserApprovalStatus, reviewNote?: string) {
    await apiFetch(`/api/v1/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        approvalStatus: status,
        approvalReviewNote: reviewNote,
      }),
    });
    emitStateChanged();
  },

  async submitDocumentRequest(payload: { typeId: string; purpose: string; selectedTypeLabel?: string; attachments?: File[] }) {
    try {
      const data = await apiFetch<any>('/api/v1/document-requests', {
        method: 'POST',
        body: JSON.stringify({
          documentTypeId: payload.typeId,
          purpose: payload.purpose,
          selectedTypeLabel: payload.selectedTypeLabel,
        }),
      });
      let attachments: DocumentRequestAttachment[] = [];
      if (payload.attachments?.length) {
        const formData = new FormData();
        payload.attachments.forEach((file) => formData.append('files', file));
        const uploadResult = await apiFetch<{ attachments: DocumentRequestAttachment[] }>(
          `/api/v1/document-requests/${data.id}/attachments`,
          {
            method: 'POST',
            body: formData,
          },
        );
        attachments = uploadResult.attachments;
      }
      emitStateChanged();
      const request: DocumentRequest = {
        id: data.id,
        referenceNumber: data.reference_number,
        residentId: data.resident_id,
        residentName: '',
        typeId: data.type_id,
        typeLabel: data.selected_type_label ?? '',
        selectedTypeLabel: data.selected_type_label ?? undefined,
        category: '',
        purpose: data.purpose,
        amount: Number(data.amount ?? 0),
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        feedbackPromptedAt: data.feedback_prompted_at ?? undefined,
        attachments,
      };
      return ok({ request });
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Unable to submit request.');
    }
  },

  async cancelPendingRequest(requestId: string) {
    await apiFetch(`/api/v1/document-requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
    });
    emitStateChanged();
  },

  async adminReviewRequest(requestId: string, decision: 'approved' | 'declined', reason?: string) {
    await apiFetch(`/api/v1/document-requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: decision, reason }),
    });
    emitStateChanged();
  },

  async staffApproveRequest(requestId: string, note?: string) {
    const body: Record<string, unknown> = { status: 'approved' };
    if (note) body.staffReviewNote = note;
    await apiFetch(`/api/v1/document-requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    emitStateChanged();
  },

  async staffReviewRequest(requestId: string, decision: 'forwarded' | 'rejected', note?: string) {
    const status = decision === 'forwarded' ? 'staff_reviewed' : 'declined';
    const body: Record<string, unknown> = { status };
    if (decision === 'forwarded') {
      body.staffReviewNote = note;
    } else {
      body.reason = note;
    }
    await apiFetch(`/api/v1/document-requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    emitStateChanged();
  },

  async staffUpdateRequest(
    requestId: string,
    status: 'ready_for_pickup' | 'completed' | 'declined',
    reason?: string,
    options?: {
      ocrJobId?: string;
      verificationMetadata?: unknown;
      documentLabel?: string;
    }
  ) {
    if (status === 'ready_for_pickup') {
      const completion = await apiFetch<StaffDocumentCompletionResult>(`/api/v1/document-requests/${requestId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          releaseNotes: reason ?? '',
          verificationMetadata: options?.verificationMetadata ?? {},
          ocrJobId: options?.ocrJobId,
          documentLabel: options?.documentLabel,
        }),
      });
      emitStateChanged();
      return completion;
    } else {
      await apiFetch(`/api/v1/document-requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      });
    }
    emitStateChanged();
  },

  async adminAssignToStaff(requestId: string, assigneeUserId: string) {
    await apiFetch(`/api/v1/document-requests/${requestId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigneeUserId }),
    });
    emitStateChanged();
  },

  async addFeedback(payload: { requestId?: string; rating: number; comment?: string }) {
    await apiFetch('/api/v1/feedback', {
      method: 'POST',
      body: JSON.stringify({
        rating: payload.rating,
        message: payload.comment ?? '',
        ...(payload.requestId
          ? { relatedRequestId: payload.requestId, source: 'request' }
          : { source: 'assistant' }),
      }),
    });
    emitStateChanged();
  },

  async submitReport(payload: {
    trackType?: 'community_concern' | 'incident';
    desiredAction?: 'record_only' | 'request_meeting' | 'none';
    category?: string;
    relationshipToRespondent?: string;
    streetName?: string;
    specificLocation?: string;
    title: string;
    details: string;
    location: string;
    dateOfIncident: string;
    otherCategoryText?: string;
    parties?: import('../../types/models').CaseParty[];
  }) {
    await apiFetch('/api/v1/incidents', {
      method: 'POST',
      body: JSON.stringify({
        trackType: payload.trackType,
        desiredAction: payload.desiredAction,
        category: payload.category ?? (payload.trackType === 'incident' ? 'Incident' : 'Community Concern'),
        relationshipToRespondent: payload.relationshipToRespondent,
        streetName: payload.streetName,
        specificLocation: payload.specificLocation,
        title: payload.title,
        description: payload.details,
        location: payload.location,
        occurredAt: payload.dateOfIncident,
        otherCategoryText: payload.otherCategoryText,
        parties: payload.parties,
      }),
    });
    emitStateChanged();
  },

  async updateReportStatus(reportId: string, status: ReportStatus, note?: string) {
    await apiFetch(`/api/v1/incidents/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });
    emitStateChanged();
  },

  async updateCaseWorkflow(
    reportId: string,
    payload: {
      status?: ReportStatus;
      actionLog?: import('../../types/models').CaseActionLog;
      proceeding?: Omit<import('../../types/models').CaseProceeding, 'id' | 'createdAt'>;
      cfa?: import('../../types/models').CaseCfa;
      pnpReferral?: import('../../types/models').CasePnpReferral;
      note?: string;
    }
  ) {
    await apiFetch(`/api/v1/incidents/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    emitStateChanged();
  },

  async upsertAnnouncement(payload: {
    id?: string;
    title: string;
    body: string;
    audience: 'all' | 'resident' | 'staff';
    startAt: string;
    endAt: string;
  }) {
    if (payload.id) {
      await apiFetch(`/api/v1/announcements/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: payload.title,
          body: payload.body,
          audience: payload.audience,
          startAt: payload.startAt,
          endAt: payload.endAt,
        }),
      });
    } else {
      await apiFetch(`/api/v1/announcements`, {
        method: 'POST',
        body: JSON.stringify({
          title: payload.title,
          body: payload.body,
          audience: payload.audience,
          startAt: payload.startAt,
          endAt: payload.endAt,
        }),
      });
    }
    emitStateChanged();
  },

  async deleteAnnouncement(idValue: string) {
    await apiFetch(`/api/v1/announcements/${idValue}`, {
      method: 'DELETE',
    });
    emitStateChanged();
  },

  async upsertCensus(payload: {
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
  }) {
    await apiFetch('/api/v1/census', {
      method: 'POST',
      body: JSON.stringify({
        householdSize: payload.householdSize,
        minorsCount: payload.minorsCount,
        ownershipStatus: payload.ownershipStatus,
        residencyClassification: payload.residencyClassification,
        yearsOfResidenceYears: payload.yearsOfResidenceYears ?? null,
        yearsOfResidenceMonths: payload.yearsOfResidenceMonths ?? null,
      }),
    });
    emitStateChanged();
  },

  async joinQueue(service: string) {
    await apiFetch('/api/v1/queue/tickets', {
      method: 'POST',
      body: JSON.stringify({ serviceType: service }),
    });
    emitStateChanged();
  },

  async updateQueueStatus(entryId: string, status: QueueEntry['status']) {
    await apiFetch(`/api/v1/queue/tickets/${entryId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    emitStateChanged();
  },

  async cancelQueue(entryId: string) {
    await apiFetch(`/api/v1/queue/tickets/${entryId}`, {
      method: 'DELETE',
    });
    emitStateChanged();
  },

  async createReservation(payload: {
    resource: Reservation['resource'];
    itemName?: string;
    quantityRequested?: number;
    startAt: string;
    endAt: string;
    purpose: string;
  }): Promise<Reservation> {
    const data = await apiFetch<Reservation>('/api/v1/reservations', {
      method: 'POST',
      body: JSON.stringify({
        serviceType: payload.resource,
        itemName: payload.itemName,
        quantityRequested: payload.quantityRequested ?? 1,
        startAt: payload.startAt,
        endAt: payload.endAt,
        notes: payload.purpose,
      }),
    });
    emitStateChanged();
    return data;
  },

  async reviewReservation(reservationId: string, status: 'approved' | 'declined', reason?: string) {
    await apiFetch(`/api/v1/reservations/${reservationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
    emitStateChanged();
  },

  async cancelReservation(reservationId: string) {
    await apiFetch(`/api/v1/reservations/${reservationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
    });
    emitStateChanged();
  },

  async deleteReservation(reservationId: string) {
    await apiFetch(`/api/v1/reservations/${reservationId}`, {
      method: 'DELETE',
    });
    emitStateChanged();
  },

  async upsertIncidentCategory(payload: { id?: string; name: string; sortOrder?: number; isActive?: boolean }) {
    const data = payload.id
      ? await apiFetch<any>(`/api/v1/incident-categories/${payload.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: payload.name,
            sortOrder: payload.sortOrder,
            isActive: payload.isActive,
          }),
        })
      : await apiFetch<any>('/api/v1/incident-categories', {
          method: 'POST',
          body: JSON.stringify({
            name: payload.name,
            sortOrder: payload.sortOrder,
          }),
        });
    emitStateChanged();
    return {
      id: data.id,
      name: data.name,
      isActive: Boolean(data.is_active),
      sortOrder: Number(data.sort_order ?? 0),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async archiveIncidentCategory(categoryId: string) {
    await apiFetch(`/api/v1/incident-categories/${categoryId}`, {
      method: 'DELETE',
    });
    emitStateChanged();
  },

  async upsertBarangayStreet(payload: { id?: string; name: string; sortOrder?: number; isActive?: boolean }) {
    try {
      const data = payload.id
        ? await apiFetch<any>(`/api/v1/barangay-streets/${payload.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              name: payload.name,
              sortOrder: payload.sortOrder,
              isActive: payload.isActive,
            }),
          })
        : await apiFetch<any>('/api/v1/barangay-streets', {
            method: 'POST',
            body: JSON.stringify({
              name: payload.name,
              sortOrder: payload.sortOrder,
            }),
          });
      emitStateChanged();
      return {
        id: data.id,
        name: data.name,
        isActive: Boolean(data.is_active),
        sortOrder: Number(data.sort_order ?? 0),
      };
    } catch {
      const streets = [...getStoredStreets()];
      if (payload.id) {
        const idx = streets.findIndex((s) => s.id === payload.id);
        if (idx !== -1) {
          streets[idx] = {
            ...streets[idx],
            name: payload.name.trim(),
            sortOrder: payload.sortOrder ?? streets[idx].sortOrder,
            isActive: payload.isActive ?? streets[idx].isActive,
          };
        }
      } else {
        const newStreet: BarangayStreet = {
          id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: payload.name.trim(),
          sortOrder: payload.sortOrder ?? (streets.length + 1) * 10,
          isActive: payload.isActive ?? true,
        };
        streets.push(newStreet);
      }
      saveStoredStreets(streets);
      emitStateChanged();
      return streets[streets.length - 1];
    }
  },

  async archiveBarangayStreet(streetId: string) {
    try {
      await apiFetch(`/api/v1/barangay-streets/${streetId}`, {
        method: 'DELETE',
      });
      emitStateChanged();
    } catch {
      const streets = [...getStoredStreets()];
      const idx = streets.findIndex((s) => s.id === streetId);
      if (idx !== -1) {
        streets[idx] = {
          ...streets[idx],
          isActive: !streets[idx].isActive,
        };
        saveStoredStreets(streets);
        emitStateChanged();
      }
    }
  },

  async upsertIncidentRelationship(payload: { id?: string; name: string; sortOrder?: number; isActive?: boolean }) {
    try {
      const data = payload.id
        ? await apiFetch<any>(`/api/v1/incident-relationships/${payload.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              name: payload.name,
              sortOrder: payload.sortOrder,
              isActive: payload.isActive,
            }),
          })
        : await apiFetch<any>('/api/v1/incident-relationships', {
            method: 'POST',
            body: JSON.stringify({
              name: payload.name,
              sortOrder: payload.sortOrder,
            }),
          });
      emitStateChanged();
      return {
        id: data.id,
        name: data.name,
        isActive: Boolean(data.is_active),
        sortOrder: Number(data.sort_order ?? 0),
      };
    } catch {
      const rels = [...getStoredRelationships()];
      if (payload.id) {
        const idx = rels.findIndex((r) => r.id === payload.id);
        if (idx !== -1) {
          rels[idx] = {
            ...rels[idx],
            name: payload.name.trim(),
            sortOrder: payload.sortOrder ?? rels[idx].sortOrder,
            isActive: payload.isActive ?? rels[idx].isActive,
          };
        }
      } else {
        const newRel: IncidentRelationship = {
          id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: payload.name.trim(),
          sortOrder: payload.sortOrder ?? (rels.length + 1) * 10,
          isActive: payload.isActive ?? true,
        };
        rels.push(newRel);
      }
      saveStoredRelationships(rels);
      emitStateChanged();
      return rels[rels.length - 1];
    }
  },

  async archiveIncidentRelationship(relationshipId: string) {
    try {
      await apiFetch(`/api/v1/incident-relationships/${relationshipId}`, {
        method: 'DELETE',
      });
      emitStateChanged();
    } catch {
      const rels = [...getStoredRelationships()];
      const idx = rels.findIndex((r) => r.id === relationshipId);
      if (idx !== -1) {
        rels[idx] = {
          ...rels[idx],
          isActive: !rels[idx].isActive,
        };
        saveStoredRelationships(rels);
        emitStateChanged();
      }
    }
  },

  async acknowledgeDocumentRequestFeedbackPrompt(requestId: string) {
    await apiFetch(`/api/v1/document-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ acknowledgeFeedbackPrompt: true }),
    });
    emitStateChanged();
  },

  async upsertDoctor(payload: { id?: string; name: string; specialization?: string; isActive?: boolean }) {
    if (payload.id) {
      await apiFetch('/api/v1/doctors', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch('/api/v1/doctors', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    emitStateChanged();
  },

  async deleteDoctor(doctorId: string) {
    // Delete by making inactive (or hard delete if there's an endpoint)
    // The current api route only supports PATCH and POST. We'll set isActive: false.
    await apiFetch('/api/v1/doctors', {
      method: 'PATCH',
      body: JSON.stringify({ id: doctorId, isActive: false }),
    });
    emitStateChanged();
  },

  async createDoctorAvailabilitySlot(payload: {
    doctorName: string;
    date: string;
    startAt: string;
    endAt: string;
    isBlocked?: boolean;
    notes?: string;
  }) {
    await apiFetch('/api/v1/doctor-availability-slots', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    emitStateChanged();
  },

  async updateDoctorAvailabilitySlot(
    slotId: string,
    payload: Partial<{
      doctorName: string;
      date: string;
      startAt: string;
      endAt: string;
      isBlocked: boolean;
      notes: string;
    }>
  ) {
    await apiFetch(`/api/v1/doctor-availability-slots/${slotId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    emitStateChanged();
  },

  async deleteDoctorAvailabilitySlot(slotId: string) {
    await apiFetch(`/api/v1/doctor-availability-slots/${slotId}`, {
      method: 'DELETE',
    });
    emitStateChanged();
  },

  async createCheckupAppointment(payload: { slotId: string; reason: string }) {
    await apiFetch('/api/v1/checkup-appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    emitStateChanged();
  },

  async cancelCheckupAppointment(appointmentId: string) {
    await apiFetch(`/api/v1/checkup-appointments/${appointmentId}`, {
      method: 'DELETE',
    });
    emitStateChanged();
  },

  async updateCheckupAppointmentStatus(
    appointmentId: string,
    status: 'pending' | 'approved' | 'proceed_to_barangay' | 'completed' | 'declined' | 'cancelled',
    staffNote?: string
  ) {
    await apiFetch(`/api/v1/checkup-appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, staffNote }),
    });
    emitStateChanged();
  },

  async upsertMedicine(payload: {
    id?: string;
    name: string;
    description?: string;
    quantity: number;
    unit: string;
    expiryDate?: string;
    available?: boolean;
  }) {
    const quantity = Math.max(0, Math.floor(payload.quantity));
    const available = typeof payload.available === 'boolean' ? payload.available : quantity > 0;
    if (payload.id) {
      await apiFetch(`/api/v1/medicines/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: payload.name,
          description: payload.description ?? '',
          quantity,
          unit: payload.unit,
          expiryDate: payload.expiryDate,
          available,
        }),
      });
    } else {
      await apiFetch(`/api/v1/medicines`, {
        method: 'POST',
        body: JSON.stringify({
          name: payload.name,
          description: payload.description ?? '',
          quantity,
          unit: payload.unit,
          expiryDate: payload.expiryDate,
        }),
      });
    }
    emitStateChanged();
  },

  async softDeleteMedicine(medicineId: string, isDeleted: boolean) {
    await apiFetch(`/api/v1/medicines/${medicineId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isDeleted }),
    });
    emitStateChanged();
  },

  async upsertEquipment(payload: {
    id?: string;
    name: string;
    quantity: number;
    isDeleted?: boolean;
  }) {
    const quantity = Math.max(0, Math.floor(payload.quantity));
    if (payload.id) {
      await apiFetch(`/api/v1/equipment/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: payload.name,
          quantity,
          isDeleted: payload.isDeleted,
        }),
      });
    } else {
      await apiFetch('/api/v1/equipment', {
        method: 'POST',
        body: JSON.stringify({
          name: payload.name,
          quantity,
        }),
      });
    }
    emitStateChanged();
  },

  async softDeleteEquipment(equipmentId: string, isDeleted: boolean) {
    await apiFetch(`/api/v1/equipment/${equipmentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isDeleted }),
    });
    emitStateChanged();
  },

  // Medicine requests endpoints removed (table deleted) stubs to satisfy interface
  async submitMedicineRequest(payload: {
    medicineId: string;
    purpose: string;
    requestedQuantity: number;
  }) {
    return err('Medicine requests are no longer supported.');
  },

  async cancelPendingMedicineRequest(requestId: string) {
    // Stub
  },

  async adminReviewMedicineRequest(requestId: string, decision: 'approved' | 'declined', reason?: string) {
    // Stub
  },

  async staffUpdateMedicineRequest(requestId: string, status: 'processing' | 'completed' | 'declined', reason?: string) {
    // Stub
  },

  async upsertDocumentTemplate(payload: Partial<DocumentTemplate> & { name: string; body: string; dynamicFields: string[] }) {
    const editor = await requireRole(['admin', 'staff']);
    if (!editor) return;
    const supabase = getSupabaseBrowserClient();

    const metaObj = {
      plainBody: payload.body,
      htmlBody: payload.htmlBody,
      documentType: payload.documentType ?? 'custom',
      sourceType: payload.sourceType ?? 'custom',
      originalFileName: payload.originalFileName,
      fieldMappings: payload.fieldMappings,
      headerConfig: payload.headerConfig,
      officialsConfig: payload.officialsConfig,
      overrideSettings: payload.overrideSettings,
      isActive: payload.isActive ?? true,
      isOverwritten: Boolean(payload.isOverwritten),
    };
    const templateBody = (payload.htmlBody || payload.body || '').trim();
    const encodedBody = `${templateBody}\n\n<!-- TEMPLATE_META:${JSON.stringify(metaObj)} -->`;

    const isUuid = Boolean(
      payload.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.id)
    );

    if (isUuid && payload.id) {
      const { data: existing } = await supabase
        .from('document_templates')
        .select('id')
        .eq('id', payload.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('document_templates')
          .update({
            name: payload.name,
            body: encodedBody,
            dynamic_fields: payload.dynamicFields,
            updated_by: editor.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.id);
      } else {
        await supabase.from('document_templates').insert({
          id: payload.id,
          name: payload.name,
          body: encodedBody,
          dynamic_fields: payload.dynamicFields,
          updated_by: editor.id,
        });
      }
    } else {
      // Non-UUID (e.g. 'tpl-001') or brand new template: check if name matches existing DB record
      const { data: existingByName } = await supabase
        .from('document_templates')
        .select('id')
        .eq('name', payload.name)
        .maybeSingle();

      if (existingByName) {
        await supabase
          .from('document_templates')
          .update({
            body: encodedBody,
            dynamic_fields: payload.dynamicFields,
            updated_by: editor.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingByName.id);
      } else {
        await supabase.from('document_templates').insert({
          name: payload.name,
          body: encodedBody,
          dynamic_fields: payload.dynamicFields,
          updated_by: editor.id,
        });
      }
    }
    emitStateChanged();
  },

  async deleteDocumentTemplate(templateId: string) {
    const editor = await requireRole(['admin']);
    if (!editor) return;
    const supabase = getSupabaseBrowserClient();
    await supabase.from('document_templates').delete().eq('id', templateId);
    emitStateChanged();
  },

  async markNotificationRead(notificationId: string) {
    await apiFetch(`/api/v1/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
    emitStateChanged();
  },

  async markAllNotificationsRead() {
    await apiFetch('/api/v1/notifications/read-all', {
      method: 'PATCH',
    });
    emitStateChanged();
  },

  async createOcrJob(payload: { file: File; requestId?: string; templateKey?: string }): Promise<OcrJob> {
    const formData = new FormData();
    formData.set('file', payload.file);
    if (payload.requestId) formData.set('requestId', payload.requestId);
    if (payload.templateKey) formData.set('templateKey', payload.templateKey);
    const response = await apiFetch<OcrJob>('/api/v1/ocr/jobs', {
      method: 'POST',
      body: formData,
    });
    emitStateChanged();
    return response;
  },

  async updateOcrJob(jobId: string, payload: { extractedText?: string; parsedFields?: Record<string, string> }): Promise<OcrJob> {
    const response = await apiFetch<OcrJob>(`/api/v1/ocr/jobs/${jobId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    emitStateChanged();
    return response;
  },

  async deleteOcrJob(jobId: string): Promise<void> {
    await apiFetch(`/api/v1/ocr/jobs/${jobId}`, {
      method: 'DELETE',
    });
    emitStateChanged();
  },

  async createStandaloneOcrIssuance(payload?: { templateKey?: string }): Promise<StandaloneOcrIssuance> {
    const response = await apiFetch<StandaloneOcrIssuance>('/api/v1/staff/ocr-issuances', {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    });
    emitStateChanged();
    return response;
  },

  async runStandaloneOcrIssuanceScan(issuanceId: string, payload: { file: File }): Promise<StandaloneOcrIssuance> {
    const formData = new FormData();
    formData.set('file', payload.file);
    const response = await apiFetch<StandaloneOcrIssuance>(`/api/v1/staff/ocr-issuances/${issuanceId}/ocr`, {
      method: 'POST',
      body: formData,
    });
    emitStateChanged();
    return response;
  },

  async patchStandaloneOcrIssuance(
    issuanceId: string,
    payload: { parsedFields?: Record<string, string>; residentId?: string | null; templateKey?: string }
  ): Promise<StandaloneOcrIssuance> {
    const response = await apiFetch<StandaloneOcrIssuance>(`/api/v1/staff/ocr-issuances/${issuanceId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    emitStateChanged();
    return response;
  },

  async finalizeStandaloneOcrIssuance(
    issuanceId: string,
    payload?: { residentId?: string | null }
  ): Promise<{ issuance: StandaloneOcrIssuance; generatedDocumentId: string; printableHtml: string }> {
    const response = await apiFetch<{ issuance: StandaloneOcrIssuance; generatedDocumentId: string; printableHtml: string }>(
      `/api/v1/staff/ocr-issuances/${issuanceId}/issue`,
      {
        method: 'POST',
        body: JSON.stringify(payload ?? {}),
      }
    );
    emitStateChanged();
    return response;
  },

  async sendChatMessage(text: string) {
    const response = await apiFetch<SendChatMessageResult>('/api/v1/chat', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    return response;
  },

  async generateDigitalIdCard() {
    await apiFetch('/api/v1/digital-id', {
      method: 'POST',
    });
    emitStateChanged();
  },

  async updateDigitalIdCard(payload: { fullName?: string; address?: string; validUntil?: string }) {
    await apiFetch('/api/v1/digital-id', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    emitStateChanged();
  },

  async deleteDigitalIdCard() {
    await apiFetch('/api/v1/digital-id', {
      method: 'DELETE',
    });
    emitStateChanged();
  },

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return apiFetch<DashboardMetrics>('/api/v1/dashboard/summary');
  },

  async exportCsv(rows: Record<string, string | number | boolean | undefined>[]) {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const lines = rows.map((row) => {
      return headers
        .map((header) => {
          return JSON.stringify(row[header] ?? '');
        })
        .join(',');
    });
    return [headers.join(','), ...lines].join('\n');
  },

  async downloadCsv(filename: string, csv: string) {
    if (typeof window === 'undefined') return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
