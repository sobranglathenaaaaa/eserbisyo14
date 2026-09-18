import type { AppState } from '@/lib/types/models';

export function getStaffRequestCounts(state: AppState) {
  const approved = state.documentRequests.filter((item) => item.status === 'approved').length;
  const processing = state.documentRequests.filter((item) => item.status === 'processing').length;
  const completed = state.documentRequests.filter((item) => item.status === 'completed').length;

  return { approved, processing, completed };
}

export function getStaffRequestQueue(state: AppState) {
  return state.documentRequests.filter((item) => item.status === 'approved' || item.status === 'processing');
}

export function getStaffNotifications(state: AppState, staffId: string | undefined) {
  return state.notifications.filter((item) => item.userId === staffId);
}
