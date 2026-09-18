import type { AppState } from '@/lib/types/models';

export function getResidentRequests(state: AppState, residentId?: string) {
  return state.documentRequests.filter((item) => item.residentId === residentId);
}

export function getResidentReports(state: AppState, residentId?: string) {
  return state.reports.filter((item) => item.residentId === residentId);
}

export function getResidentFeedback(state: AppState, residentId?: string) {
  return state.feedback.filter((item) => item.residentId === residentId);
}

export function getResidentQueueEntries(state: AppState, residentId?: string) {
  return state.queueEntries.filter((item) => item.residentId === residentId);
}

export function getResidentNotifications(state: AppState, residentId?: string) {
  return state.notifications.filter((item) => item.userId === residentId);
}

export function getResidentOcrJobs(state: AppState, residentId?: string) {
  return state.ocrJobs.filter((item) => item.residentId === residentId);
}

export function getResidentChatSession(state: AppState, residentId?: string) {
  return state.chatSessions.find((item) => item.residentId === residentId);
}

export function getResidentCompletedRequests(state: AppState, residentId?: string) {
  return state.documentRequests.filter((item) => item.residentId === residentId && item.status === 'completed');
}
