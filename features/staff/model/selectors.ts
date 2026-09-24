import type { AppState } from '@/lib/types/models';

export function getStaffRequestCounts(state: AppState) {
  const approved = state.documentRequests.filter((item) => item.status === 'approved').length;
  const readyForPickup = state.documentRequests.filter((item) => item.status === 'ready_for_pickup').length;
  const completed = state.documentRequests.filter((item) => item.status === 'completed').length;

  return { approved, readyForPickup, completed };
}

export function getStaffRequestQueue(state: AppState) {
  return state.documentRequests.filter((item) => item.status === 'approved' || item.status === 'ready_for_pickup');
}

export function getStaffNotifications(state: AppState, staffId: string | undefined) {
  return state.notifications.filter((item) => item.userId === staffId);
}
