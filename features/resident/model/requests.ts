import type { AppState } from '@/lib/types/models';
import { getResidentRequests } from './selectors';

export function getResidentDocumentRequestView(state: AppState, residentId: string | undefined) {
  const myRequests = getResidentRequests(state, residentId);
  const activeRequests = myRequests
    .filter((item) => ['pending', 'staff_reviewed', 'approved', 'processing', 'ready_for_pickup'].includes(item.status))
    .sort((a, b) => {
      const createdDifference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (createdDifference !== 0) return createdDifference;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  const sortedHistory = myRequests
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const myDocs = state.generatedDocuments.filter((doc) => {
    if (!doc.requestId) return false;
    return myRequests.some((request) => request.id === doc.requestId);
  });

  return {
    myRequests,
    activeRequests,
    sortedHistory,
    myDocs,
  };
}
