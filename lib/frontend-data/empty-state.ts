import type { AppState } from '../types/models';

export function createEmptyAppState(): AppState {
  return {
    users: [],
    session: null,
    documentRequests: [],
    documentTemplates: [],
    generatedDocuments: [],
    reports: [],
    incidentCategories: [],
    barangayStreets: [],
    incidentRelationships: [],
    feedback: [],
    announcements: [],
    censusRecords: [],
    queueEntries: [],
    reservations: [],
    doctorAvailabilitySlots: [],
    checkupAppointments: [],
    doctors: [],
    medicines: [],
    equipment: [],
    medicineRequests: [],
    notifications: [],
    emailLogs: [],
    auditLogs: [],
    ocrJobs: [],
    chatSessions: [],
    digitalIds: [],
    meta: {
      idCounters: {},
    },
  };
}
