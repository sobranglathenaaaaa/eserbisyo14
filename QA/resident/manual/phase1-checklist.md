# Resident Manual QA Checklist (Phase 1)

## Authentication

- [ ] RES-AUTH-001 Register a new resident account with all required fields and verify redirect to login.
- [ ] RES-AUTH-001A Register with middle name omitted and suffix omitted, and verify registration still succeeds.
- [ ] RES-AUTH-002 Verify registration enforces separate Terms and Data Privacy acceptance.
- [ ] RES-AUTH-003 Verify registration blocks mismatched Username(email) and Email values.
- [ ] RES-AUTH-004 Verify registration blocks weak password (<8 chars) and password mismatch.
- [ ] RES-AUTH-005 Verify duplicate email registration returns conflict and account is not duplicated.
- [ ] RES-AUTH-006 Verify registration requires Upload Picture of ID and rejects missing or invalid file uploads.
- [ ] RES-AUTH-007 Login using newly registered account and verify resident dashboard loads.

## Document Requests

- [ ] RES-DOCREQ-001 Submit a document request with valid input.
- [ ] RES-DOCREQ-002 Verify request appears in active list.
- [ ] RES-DOCREQ-003 Verify API fetch returns expected request state.

## Notifications

- [ ] RES-NOTIF-001 Confirm approved/completed notification appears after admin/staff actions.
- [ ] RES-NOTIF-002 Mark notification as read and verify unread count updates.

## Incidents and Feedback

- [ ] RES-INC-001 Submit incident or blotter report and verify persistence.
- [ ] RES-FB-001 Submit feedback for completed request and verify saved rating/comment.

## Data Validation

- [ ] RES-DATA-001 Verify all created resident records contain QA run tag.
- [ ] RES-DATA-002 Verify resident cannot access another resident data.
