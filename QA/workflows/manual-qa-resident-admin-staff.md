# eSerbisyo Manual QA Playbook (Resident, Admin, Staff)

Last updated: April 7, 2026
Purpose: Full manual QA guide for cross-role workflows, with deepest coverage on document requests.

## 1. QA Setup And Preconditions

### 1.1 Required Test Accounts

Use one account per role:
- Resident
- Admin
- Staff

If needed, bootstrap QA accounts using:
- `node scripts/bootstrap-qa-accounts.mjs`

Expected seeded emails (from script):
- `qa.resident@eserbisyo.local`
- `qa.admin@eserbisyo.local`
- `qa.staff@eserbisyo.local`

### 1.2 Environment Preconditions

- App is running and reachable (default expected: `http://localhost:3000`).
- Supabase env vars are configured in `.env.local`.
- At least one `document_types` row exists.
- Each tester session uses a separate browser profile/incognito window to avoid role session overlap.

### 1.3 Core Evidence Sources

Capture evidence from three layers for every scenario:
- UI evidence: screenshot of status/action/result
- API evidence: request + response payload/status code from browser network tab
- Data evidence: row-level change in tables (Supabase SQL editor or equivalent)

Primary tables to verify:
- `document_requests`
- `generated_documents`
- `notifications`
- `email_logs`
- `audit_logs`
- `incident_reports`
- `queue_entries`
- `feedback`

## 2. Resident Registration Scenarios

## RES-AUTH-001 Register New Resident Account

Role: Public/Resident  
Page: `/register`

Steps:
1. Open registration page.
2. Fill all required fields from User Information, Contact Information, and Account Credentials sections.
3. Keep optional fields as desired (`Suffix`, `City`).
4. Check both Terms and Data Privacy checkboxes.
5. Submit form.

Expected UI:
- Submit succeeds and redirects to `/login?registered=1`.
- No validation error remains.

Expected API:
- `POST /api/v1/auth/register`
- Response `200` with resident role.

Expected Data:
- One new row in `profiles` with required structured fields populated.
- `terms_accepted_at` and `privacy_accepted_at` are not null.

## RES-AUTH-002 Consent Validation

Role: Public/Resident  
Page: `/register`

Steps:
1. Complete required form fields.
2. Keep Terms unchecked, submit.
3. Check Terms, keep Data Privacy unchecked, submit.

Expected UI:
- Terms unchecked shows explicit Terms error.
- Data Privacy unchecked shows explicit Data Privacy error.

Expected API:
- If submission is forced via API, response should be `400` with `VALIDATION_ERROR`.

Expected Data:
- No profile row should be inserted for failed submissions.

## RES-AUTH-003 Username(email) and Email Consistency

Role: Public/Resident  
Page: `/register`

Steps:
1. Fill required fields.
2. Enter different values for Username(email) and Email.
3. Submit form.

Expected UI:
- Error indicates username email and account email must match.

Expected API:
- Direct API call with mismatch returns `400` with `VALIDATION_ERROR`.

Expected Data:
- No new profile row.

## RES-AUTH-004 Password Validation

Role: Public/Resident  
Page: `/register`

Steps:
1. Attempt with password shorter than 8 characters.
2. Attempt with password and confirm password mismatch.

Expected UI:
- Shows password length and mismatch validation messages.

Expected API:
- Password <8 should return `400` if bypassing client-side checks.

Expected Data:
- No profile row for invalid requests.

## RES-AUTH-005 Duplicate Email Registration

Role: Public/Resident

Steps:
1. Register once with a valid email.
2. Attempt second registration using same email.

Expected API:
- Second attempt returns `409` with `RESOURCE_CONFLICT`.

Expected Data:
- Only one profile row exists for that email.

## 2. Cross-Role Workflow Map

### 2.1 Document Request Lifecycle

1. Resident submits request -> status `pending`.
2. Admin reviews request:
- approves -> status `approved`
- declines -> status `declined` (reason expected)
3. Staff processes approved request:
- move to `processing`
- complete -> status `completed` + generated document row
- or decline during processing -> status `declined` (processing reason expected)
4. Resident views updates in:
- Document Requests (active/history/docs tabs)
- Notifications
- Request History

### 2.2 Status Transition Matrix (Server-Enforced)

Allowed transitions:
- `pending` -> `approved`, `declined`, `cancelled`
- `approved` -> `processing`, `declined`
- `processing` -> `completed`, `declined`
- `declined` -> none
- `completed` -> none
- `cancelled` -> none

## 3. Detailed Document Request Scenarios

## DR-001 Resident Submits New Request

Role: Resident  
Pages: `/resident/document-requests`

Steps:
1. Login as resident.
2. Open Document Requests page.
3. Select a document type.
4. Enter purpose/notes.
5. Click `Submit Request`.

Expected UI:
- Success feedback appears with reference number.
- New item appears in Active Requests.
- Status badge shows `pending`.
- Amount matches selected document type price.
- Cancel button is visible for this new pending request.

Expected API:
- `POST /api/v1/document-requests`
- Payload includes `documentTypeId`, `purpose`.
- Response `201` with created request object.

Expected Data:
- New row in `document_requests`:
- `status = 'pending'`
- `reference_number` format starts with `ES-<year>-`
- `resident_id` matches logged-in resident
- New row in `audit_logs` with action `document_requests.create`.

## DR-002 Resident Cancels Pending Request

Role: Resident  
Page: `/resident/document-requests`

Steps:
1. Use a request currently in `pending`.
2. Click `Cancel`.

Expected UI:
- Request status changes to `cancelled`.
- Request no longer actionable.

Expected API:
- `PATCH /api/v1/document-requests/{id}/status`
- Payload `{ "status": "cancelled" }`
- Response `200`.

Expected Data:
- `document_requests.status = 'cancelled'`.
- `updated_at` changes.
- Audit log entry exists with action `document_requests.status_update` and context from/to.

Negative check:
- Resident cannot cancel when status is `approved` or `processing` (action disabled or forbidden response).

## DR-003 Admin Approves Pending Request

Role: Admin  
Page: `/admin/document-requests`

Steps:
1. Login as admin.
2. Select a request in `pending`.
3. Click `Approve`.

Expected UI:
- Status changes to `approved`.
- Request appears as approved-ready for staff lane.

Expected API:
- `PATCH /api/v1/document-requests/{id}/status`
- Payload `{ "status": "approved" }`
- Response `200`.

Expected Data:
- `document_requests.status = 'approved'`.
- `audit_logs.action = 'document_requests.status_update'`.

## DR-004 Admin Declines Pending Request (Reason Required In UI)

Role: Admin  
Page: `/admin/document-requests`

Steps:
1. Select a pending request.
2. Verify decline button is disabled if reason input is empty.
3. Enter decline reason.
4. Click `Decline`.

Expected UI:
- Decline button only enabled when reason has content.
- Status becomes `declined`.
- Decline reason appears in request details/history for resident visibility.

Expected API:
- `PATCH /api/v1/document-requests/{id}/status`
- Payload includes `status: "declined"` and `reason`.
- Response `200`.

Expected Data:
- `document_requests.status = 'declined'`.
- `admin_decision_reason` populated.
- audit log row created for status update.

## DR-005 Staff Moves Approved Request To Processing

Role: Staff  
Page: `/staff/process-requests`

Steps:
1. Login as staff.
2. Select an `approved` request.
3. Click `Move to Processing`.

Expected UI:
- Request moves from Approved lane to Processing lane.
- Status badge shows `processing`.

Expected API:
- `PATCH /api/v1/document-requests/{id}/status`
- Payload `{ "status": "processing" }`
- Response `200`.

Expected Data:
- `document_requests.status = 'processing'`.
- `processed_by` set to acting staff/admin user id.
- audit log row created for status update.

## DR-006 Staff Completes Processing

Role: Staff  
Page: `/staff/process-requests`

Steps:
1. Select a request in `processing`.
2. Click `Mark Completed`.

Expected UI:
- Success feedback confirms completion.
- Request moves to Completed lane.
- Resident can see completed state and generated document in docs tab.

Expected API:
- `POST /api/v1/document-requests/{id}/complete`
- Payload may include `releaseNotes`/metadata.
- Response `200`.

Expected Data:
- `document_requests.status = 'completed'`.
- `processed_by` set to acting staff/admin.
- New row in `generated_documents` with:
- `request_id` linked
- `verification_status = 'verified'`
- `digital_seal = true`
- `qr_payload` not empty
- audit log row with action `document_requests.complete`.

## DR-007 Staff Declines During Processing

Role: Staff  
Page: `/staff/process-requests`

Steps:
1. Select request in `approved` or `processing`.
2. Try decline with empty reason.
3. Enter reason and decline.

Expected UI:
- Empty reason attempt shows validation feedback.
- After reason entry, request becomes `declined`.

Expected API:
- `PATCH /api/v1/document-requests/{id}/status`
- Payload includes `status: "declined"` and reason.

Expected Data:
- `document_requests.status = 'declined'`.
- `processing_decline_reason` populated.
- audit log row exists.

## DR-008 Invalid Transition And Permission Checks

Role: Mixed (Resident/Admin/Staff)

Checks:
1. Attempt `completed -> processing` via API (manual call) should return `409`.
2. Resident attempts to approve/decline via status endpoint should return `403`.
3. Staff attempts to approve pending request should return `403` (review permission required).
4. Admin/staff attempts unknown request id should return `404`.

Expected API:
- Conflict: `RESOURCE_CONFLICT` for invalid transitions.
- Forbidden: `AUTH_FORBIDDEN` for role violations.
- Not found: `RESOURCE_NOT_FOUND` for missing resource.

## 4. Role-By-Role Module Coverage

## 4.1 Notifications (Resident Focus)

Endpoints:
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/{notificationId}/read`

Manual checks:
1. Resident opens `/resident/notifications`.
2. Confirm feed loads only resident-owned notifications.
3. Click `Mark Read` on unread item.

Expected:
- UI badge/button changes from unread action to read state.
- PATCH call returns success.
- `notifications.read = true` for that row.

Note:
- Notification creation is not explicitly written in inspected request status routes.
- For QA, verify observed environment behavior from UI/table results, and do not assume trigger behavior unless validated in deployment.

## 4.2 Request History

Endpoint:
- `GET /api/v1/request-history`

Manual checks:
1. Resident opens `/resident/request-history`.
2. Confirm category controls are visible in fixed order: `All History`, `Requests`, `Generated Documents`, `Notifications`, `Report Progress`.
3. Click each category and confirm content panel only shows records for that category.
4. Confirm `All History` shows mixed chronological records across categories.
5. Confirm list ordering is newest-first, with stable order for ties.
6. Confirm selected category persists through URL query (`?category=...`) and page reload.
7. Confirm keyboard navigation can focus and activate category buttons (`Tab`, `Enter`, `Space`).
8. Confirm only resident-owned records appear.
9. Confirm mobile viewport behavior (no clipped category controls or overflowing cards).

Expected:
- Historical rows reflect latest status updates and reasons where applicable.
- Category filtering is accurate and deterministic.
- URL query state restores selected category after reload.
- API response excludes other residents’ rows.

## 4.3 Incident / Blotter

Endpoints:
- `POST /api/v1/incidents` (resident submit)
- `PATCH /api/v1/incidents/{incidentId}/status` (staff/admin process)

Status values:
- `pending`, `under_review`, `resolved`

Checks:
1. Resident submits incident with complete required fields.
2. Staff/admin updates status to `under_review`, then `resolved`.
3. Resident verifies progression in incident page/history view.

Expected data:
- Row inserted in `incident_reports`.
- Updates reflected in `status`, `updated_at`.
- `audit_logs` entries for create/status updates.

## 4.4 Queue

Endpoints:
- `POST /api/v1/queue/tickets` (resident join)
- `PATCH /api/v1/queue/tickets/{ticketId}/status` (resident cancel or staff/admin update)

Checks:
1. Resident joins queue with a service type.
2. Verify duplicate prevention for existing waiting ticket (deduplicated response path).
3. Staff/admin updates status (`serving`, `completed`, `cancelled`).
4. Resident can only cancel own waiting ticket.

Expected:
- `queue_entries` row created with status `waiting` and position.
- Resident non-cancel update attempts return `403`.
- Audit log exists for join/status updates.

## 4.5 Feedback

Endpoint:
- `POST /api/v1/feedback`

Checks:
1. Resident submits rating 1-5 with optional comment.
2. Try invalid rating (0 or 6) and confirm validation error.

Expected:
- Valid submit inserts `feedback` row.
- Invalid rating returns `400 VALIDATION_ERROR`.
- Audit log row for feedback creation.

## 5. Expected Evidence Template (Use Per Test Case)

For each manual test ID, log:
- Test ID and title
- Actor role
- Preconditions
- Steps performed
- UI evidence:
- page path and screenshot name
- exact status/label text seen
- API evidence:
- endpoint
- request body
- response status + key fields
- Data evidence:
- table name
- primary key id
- before/after critical columns
- Pass/Fail and notes

Suggested short evidence filename style:
- `YYYYMMDD-<testid>-<role>-<result>.png`

## 6. Regression And Edge-Case Checklist

- Role permissions:
- resident cannot perform admin/staff-only actions
- staff cannot approve pending requests
- resident can only cancel pending document requests
- resident can only cancel own waiting queue ticket
- Status integrity:
- invalid state transitions return conflict
- terminal states do not transition further
- Reason handling:
- admin decline UI requires reason before action
- staff decline UI requires reason before action
- `admin_decision_reason` vs `processing_decline_reason` stored in correct field
- Document generation:
- completion always creates `generated_documents` row
- generated document has verification payload and digital seal indicators
- Auditability:
- critical actions write `audit_logs` rows
- data side effects match actor and target IDs
- Visibility and scoping:
- resident list endpoints only show own records
- tenant scoping is preserved across all tested endpoints

## 7. Public API Coverage Reference

Core endpoints to include in every document workflow QA run:
- `POST /api/v1/document-requests`
- `PATCH /api/v1/document-requests/{id}/status`
- `POST /api/v1/document-requests/{id}/complete`
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/{id}/read`
- `GET /api/v1/request-history`

Recommended additional module endpoints for full run:
- `POST /api/v1/incidents`
- `PATCH /api/v1/incidents/{id}/status`
- `POST /api/v1/queue/tickets`
- `PATCH /api/v1/queue/tickets/{id}/status`
- `POST /api/v1/feedback`
