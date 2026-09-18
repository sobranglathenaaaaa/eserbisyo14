import type { AppState } from '@/lib/types/models';

export function getAdminAuditLogPreview(state: AppState, limit = 20) {
  return state.auditLogs.slice(0, limit);
}

export function getAdminRequestReportRows(state: AppState) {
  return state.documentRequests.map((item) => ({
    referenceNumber: item.referenceNumber,
    residentName: item.residentName,
    type: item.typeLabel,
    amount: item.amount,
    status: item.status,
    updatedAt: item.updatedAt,
  }));
}

export function getAdminFeedbackReportRows(state: AppState) {
  return state.feedback.map((item) => ({
    requestId: item.requestId,
    rating: item.rating,
    comment: item.comment,
    createdAt: item.createdAt,
  }));
}

export function getAdminApprovalDeclineRows(state: AppState) {
  return state.documentRequests
    .filter((item) => item.status === 'approved' || item.status === 'declined' || item.status === 'cancelled')
    .map((item) => ({
      referenceNumber: item.referenceNumber,
      residentName: item.residentName,
      status: item.status,
      reason: item.adminDecisionReason ?? item.processingDeclineReason ?? '',
      updatedAt: item.updatedAt,
    }));
}

export function getAdminIncidentRows(state: AppState) {
  return state.reports.map((item) => ({
    title: item.title,
    residentName: item.residentName,
    location: item.location,
    status: item.status,
    dateOfIncident: item.dateOfIncident,
    updatedAt: item.updatedAt,
  }));
}

export function getAdminGenerationActivityRows(state: AppState) {
  return state.generatedDocuments.map((item) => ({
    referenceNumber: item.referenceNumber,
    documentType: item.documentType,
    residentName: item.residentName,
    processedBy: item.processedBy,
    verificationStatus: item.verificationStatus,
    dateIssued: item.dateIssued,
  }));
}
