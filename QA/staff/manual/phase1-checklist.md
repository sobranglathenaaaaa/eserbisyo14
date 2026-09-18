# Staff Manual QA Checklist (Phase 1)

## Request Processing

- [ ] STF-REQ-001 Open approved request lane and select target request.
- [ ] STF-REQ-002 Move request to processing and verify status update.
- [ ] STF-REQ-003 Complete request and verify resident-side completion state.
- [ ] STF-REQ-004 Decline processing with reason and verify visibility.

## Queue Handling

- [ ] STF-QUEUE-001 Set queue ticket to serving state.
- [ ] STF-QUEUE-002 Set queue ticket to completed state.

## Medicine Operations

- [ ] STF-MED-001 Create medicine record and verify list update.
- [ ] STF-MED-002 Toggle availability and verify persistence.

## Notifications and Security

- [ ] STF-NOTIF-001 Verify staff notifications show relevant events.
- [ ] STF-RBAC-001 Verify staff cannot execute admin-only user management actions.
