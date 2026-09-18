# Backend Task Breakdown

Version: Backend Delivery v1.1
Last Updated: April 5, 2026
Depends On: [07-backend-implementation-plan.md](./07-backend-implementation-plan.md)

## Purpose

This document translates the backend implementation plan into sprint-ready execution tickets.

Each ticket includes:

- scope
- endpoints
- dependencies
- acceptance criteria
- test checklist

## Execution Rules

- all operational data must flow through backend API routes
- all protected endpoints require authenticated server validation
- all role-sensitive operations require both API permission checks and RLS enforcement
- every endpoint must have typed request and response contracts
- every mutation endpoint must emit audit logs
- registration flow is immediate activation with no UI dependency on email verification
- status and payload fields must remain stable across UI, API, and DB layers

## Sprint 1 - Auth UX Completion And Guardrails

### BE-001 Auth Utility Layer

Scope:

- implement shared auth helpers for API handlers and middleware

Target files:

- [../lib/auth/permissions.ts](../lib/auth/permissions.ts)
- [../middleware.ts](../middleware.ts)
- new auth utility modules under [../lib/auth](../lib/auth)

Acceptance criteria:

1. Helper can extract bearer token or session token from request context.
2. Helper validates token and resolves current user profile and role.
3. Helper returns typed auth context or typed auth error.
4. Unauthorized request consistently returns 401 response shape.
5. Forbidden request consistently returns 403 response shape.

Test checklist:

- unit tests for missing token, malformed token, expired token, valid token
- unit tests for role resolution failure and missing profile

### BE-002 Middleware Enforcement

Scope:

- enforce authentication gate for protected app routes and API route groups

Target files:

- [../middleware.ts](../middleware.ts)

Acceptance criteria:

1. Unauthenticated access to protected route redirects to login.
2. Authenticated role mismatch redirects to correct role dashboard.
3. Protected API requests without valid auth are blocked at middleware level.
4. Public pages and static assets remain accessible.

Test checklist:

- integration tests for resident, staff, admin route access patterns

### BE-003 Auth Endpoints

Scope:

- implement auth endpoints with immediate activation and stable session behavior

Endpoints:

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- GET /api/v1/auth/session
- POST /api/v1/auth/verify (temporary compatibility only; UI must not depend on this)
- POST /api/v1/auth/password-reset-request (if enabled)
- POST /api/v1/auth/password-reset-confirm (if enabled)

Acceptance criteria:

1. Register creates user in auth and profile records with immediate active status.
2. Login returns standardized payload with user role and session metadata.
3. Logout invalidates active session and clears auth context.
4. Session endpoint returns authenticated context when valid.
5. Register response includes verificationRequired: false and no forced verify step in frontend flow.
6. Quick-login/bootstrap path and auth env loading are reliable across refresh/navigation.

Test checklist:

- integration tests for register to login path without verification dependency
- integration tests for refresh/navigation session persistence
- negative tests for invalid credentials

## Sprint 2 - RBAC and RLS Baseline

### BE-004 Permission Matrix Implementation

Scope:

- implement concrete permission checks and map capabilities by role

Target files:

- [../lib/auth/permissions.ts](../lib/auth/permissions.ts)
- permission reference section in [07-backend-implementation-plan.md](./07-backend-implementation-plan.md)

Acceptance criteria:

1. All role checks are explicit and typed.
2. Permission helpers support user ownership checks for resident self-service paths.
3. Admin-only operations are enforced centrally.
4. Staff-only processing operations are enforced centrally.

Test checklist:

- unit tests for each permission helper and role combination

### BE-005 RLS Policy Hardening

Scope:

- keep Supabase policies and helper functions functionally correct for tenant and role isolation

Target files:

- [../supabase/schema.sql](../supabase/schema.sql)

Acceptance criteria:

1. Resident can read and mutate only own allowed records.
2. Staff can access only scoped operational records.
3. Admin has elevated access only where explicitly required.
4. Cross-role and cross-tenant data leakage attempts are denied.

Test checklist:

- SQL policy validation scenarios for resident, staff, admin tokens

Launch boundary:

- do not block release on advanced policy hardening beyond required role and tenant protections

## Sprint 3 - Core Module APIs (Part 1)

### BE-006 Profiles and User Management

Endpoints:

- GET /api/v1/profiles/me
- PATCH /api/v1/profiles/me
- GET /api/v1/users
- POST /api/v1/users
- PATCH /api/v1/users/:userId
- POST /api/v1/users/:userId/restore
- DELETE /api/v1/users/:userId (soft delete)

Acceptance criteria:

1. Resident can update own profile only.
2. Admin can list/manage users with role-aware filtering.
3. Staff and resident cannot call admin user management endpoints.
4. All mutations generate audit log entries.

### BE-007 Document Catalog and Requests

Endpoints:

- GET /api/v1/document-types
- GET /api/v1/document-requests
- GET /api/v1/document-requests/:requestId
- POST /api/v1/document-requests
- PATCH /api/v1/document-requests/:requestId/status
- POST /api/v1/document-requests/:requestId/assign
- POST /api/v1/document-requests/:requestId/complete

Acceptance criteria:

1. Resident can create and track own document requests.
2. Admin can approve or decline requests.
3. Staff can process requests after admin approval.
4. Document status transition rules are validated server-side.
5. Frontend no longer depends on local operational fallback for requestable document types.
6. Mutation responses return updated request shapes required by frontend selectors.

### BE-008 Announcements and Notifications

Endpoints:

- GET /api/v1/announcements
- POST /api/v1/announcements
- PATCH /api/v1/announcements/:announcementId
- DELETE /api/v1/announcements/:announcementId
- GET /api/v1/notifications
- PATCH /api/v1/notifications/:notificationId/read

Acceptance criteria:

1. Admin can create and manage announcements.
2. Residents and staff can read relevant announcements.
3. Notifications are role and user scoped.
4. Notification read state updates are idempotent.

## Sprint 4 - Core Module APIs (Part 2)

### BE-009 Incidents and Blotter

Endpoints:

- GET /api/v1/incidents
- POST /api/v1/incidents
- GET /api/v1/incidents/:incidentId
- PATCH /api/v1/incidents/:incidentId/status

Acceptance criteria:

1. Resident can submit incidents.
2. Admin and authorized staff can review and update status.
3. Unauthorized users cannot view private incident details.
4. Incident status values align with frontend status mappings.

### BE-010 Medicines and Queue

Endpoints:

- Medicines:
- GET /api/v1/medicines
- POST /api/v1/medicines
- PATCH /api/v1/medicines/:medicineId
- Queue:
- GET /api/v1/queue
- POST /api/v1/queue/tickets
- PATCH /api/v1/queue/tickets/:ticketId/status

Acceptance criteria:

1. Staff and admin visibility and mutation rules are enforced.
2. Resident reads are scoped to own queue state where applicable.
3. Duplicate queue joins are guarded by idempotency strategy.
4. Queue status mappings are normalized with frontend values.

### BE-011 Feedback, History, Census, Dashboard

Endpoints:

- POST /api/v1/feedback
- GET /api/v1/request-history
- GET /api/v1/census
- POST /api/v1/census
- GET /api/v1/dashboard/summary

Acceptance criteria:

1. Resident feedback submission is authenticated and traceable.
2. Request history is user-scoped for residents and broader for authorized roles.
3. Dashboard summary is role-aware and does not expose restricted aggregates.
4. Dashboard response fields are stable for current frontend metric selectors.

## Sprint 5 - Frontend Integration and De-Mock

### FEI-001 Provider-to-API Migration

Scope:

- replace direct operational data access patterns in frontend provider/store with API calls

Target files:

- [../lib/frontend-data/providers/backend-provider.ts](../lib/frontend-data/providers/backend-provider.ts)
- [../lib/frontend-data/store.ts](../lib/frontend-data/store.ts)

Acceptance criteria:

1. Operational module reads and writes call backend endpoints.
2. Request and response payloads use typed contracts.
3. Local operational mock fallbacks are removed.

### FEI-002 Document Request Page Decoupling

Scope:

- remove direct operational coupling to local document catalog fallback

Target files:

- [../app/resident/document-requests/page.tsx](../app/resident/document-requests/page.tsx)
- [../lib/content/document-catalog.ts](../lib/content/document-catalog.ts)

Acceptance criteria:

1. Requestable document options are loaded from backend source.
2. Page behavior remains functional for resident submit and status tracking.

## Sprint 6 - Quality, Reliability, and Release

### REL-001 Audit Logging Coverage

Acceptance criteria:

1. All mutation endpoints write audit logs.
2. Log record includes actor, action, target, timestamp, and metadata.

### REL-002 Rate Limiting and Abuse Controls

Acceptance criteria:

1. Auth endpoints have rate limits.
2. Sensitive admin mutations have rate limits.
3. Exceeded limits return consistent typed error responses.

### REL-004 Production Slice Rollout

Acceptance criteria:

1. Slice 1 (auth + registration + quick login) passes smoke tests.
2. Slice 2 (document workflow) passes resident-admin-staff flow smoke tests.
3. Slice 3 (incidents, announcements, notifications) passes role access and status smoke tests.
4. Slice 4 (medicines, queue, feedback, census, dashboard) passes major CRUD and metrics sanity smoke tests.
5. Each slice has fix-forward issue handling and post-release log monitoring.

### REL-003 Test and Release Gates

Acceptance criteria:

1. Unit, integration, and e2e suites pass for auth and core modules.
2. Canary rollout checks pass before full release.
3. Rollback procedure is documented and verified.

## API Contract Baseline

All endpoints must support:

- typed request payload
- typed success payload
- typed error payload with machine-readable code
- correlation/request id in response headers where available

## Done Criteria For This Document

1. Every backend module has clear executable tickets.
2. Every ticket includes measurable acceptance criteria.
3. Endpoint ownership and sequencing are explicit enough for parallel implementation.
