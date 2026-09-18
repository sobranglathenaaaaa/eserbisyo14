# Cross-Role Workflow Plan (Phase 1)

## WF-001: Document Request End-to-End

1. Resident creates a new document request.
2. Validate request appears in resident active list and API list endpoint.
3. Admin reviews request and approves with reason.
4. Validate status transition to approved and admin audit log entry.
5. Staff moves request to processing.
6. Staff marks request completed.
7. Validate resident receives notification and completed state in history.
8. Validate generated document and related status fields if applicable.

## WF-002: Decline Path Verification

1. Resident creates request.
2. Admin declines with reason.
3. Validate resident sees decline reason and notification.
4. Validate audit entry for decline action.

## WF-003: Queue Service Handoff

1. Resident joins queue.
2. Admin or staff sets serving status.
3. Admin or staff sets completed status.
4. Validate queue status progression and timestamps.
