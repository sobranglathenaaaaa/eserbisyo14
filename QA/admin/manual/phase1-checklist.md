# Admin Manual QA Checklist (Phase 1)

## Document Review

- [ ] ADM-DOCREQ-001 Review pending request list and open request details.
- [ ] ADM-DOCREQ-002 Approve request with reason and verify status change.
- [ ] ADM-DOCREQ-003 Decline request with reason and verify resident visibility.

## Queue

- [ ] ADM-QUEUE-001 Move queue ticket to serving and completed states.

## User and Announcement Controls

- [ ] ADM-USER-001 Change user role and verify updated permissions.
- [ ] ADM-ANN-001 Publish announcement for target audience and verify visibility.

## Data and Audit Validation

- [ ] ADM-AUD-001 Verify audit entries exist for all admin write operations.
- [ ] ADM-RBAC-001 Verify forbidden actions for non-admin users return expected denial.
