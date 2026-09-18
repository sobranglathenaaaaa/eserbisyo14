# Backend Implementation Plan

Version: Backend Phase v1.1
Last Updated: April 5, 2026
Applies To: Supabase-backed backend implementation and frontend integration

## Phase Intent

This document defines the backend implementation plan for eSerbisyo.

This phase explicitly moves the project from frontend-first delivery to backend-enabled delivery.

Primary outcomes:

- complete functional parity across all modules and roles end-to-end
- remove operational mock-data dependency and stale fallbacks
- move business logic from frontend provider methods to backend API routes
- provide typed, testable, and production-ready backend workflows
- keep essential launch security controls (auth, role, tenant scope, minimal rate limit)

## Scope Override

For this phase only, this document overrides earlier frontend-first constraints defined in:

- [README.md](./README.md)
- [requirement.md](./requirement.md)

This means backend behavior, API implementation, and schema/policy updates are now in scope.

## Implementation Principles

- keep Supabase as the platform for auth and data
- server routes own all mutation and permission-critical logic
- browser client must not directly own privileged workflows
- all endpoint contracts must be typed
- apply practical least-privilege access at API and RLS layers
- keep file/module boundaries clean and feature-oriented

## Current-State Issues To Fix

- operational logic is still concentrated in frontend provider flows
- some workflows rely on local operational data fallback
- some workflows still write directly to DB from frontend paths
- route protection is mostly client-driven
- permissions utilities are placeholders and not fully enforced
- inconsistent status and payload mappings cause UI/API drift

## Target Architecture

1. Browser UI calls backend API routes for all operational workflows.
2. API routes validate session and role before any data operation.
3. API routes use server-side Supabase clients by responsibility.
4. Database enforces row access via RLS even if API checks fail.
5. Frontend state layer consumes typed API responses only.

## Supabase Client Boundaries

- Browser Client: authentication UI bootstrap and safe user-scoped reads only
- Server Client: authenticated request context operations
- Admin Client (service role): restricted to backend route handlers and admin tasks

Use these files as current patterns:

- [../lib/supabase/client.ts](../lib/supabase/client.ts)
- [../lib/supabase/admin.ts](../lib/supabase/admin.ts)
- [../lib/supabase/env.ts](../lib/supabase/env.ts)

## Execution Plan

### Phase 0 - Requirements Alignment

1. Add this document to requirement read order.
2. Mark backend phase as active and authoritative for implementation.

### Phase 1 - Authentication, Registration, And Session Completion

1. Build shared backend auth helpers:
- token extraction
- token verification
- profile and role resolution
- tenant resolution
- standardized 401 and 403 responses
2. Implement auth endpoints:
- register
- login
- logout
- session validate/refresh
- password reset flow (if enabled)
- verification compatibility endpoint (optional temporary shim)
3. Enforce middleware protection for protected app and API route groups.
4. Registration must create immediately active accounts and remove verify dependency from UI flow.

Registration defaults in this phase:

- email_confirm: true
- is_verified: true
- verificationRequired: false
- user proceeds directly to login (or auto-login if enabled)

Auth UX reliability requirements:

- fix quick-login/bootstrap path
- ensure environment loading reliability for auth bootstrap
- normalize session behavior across refresh and navigation

Reference implementation pattern:

- [../app/api/admin/create-account/route.ts](../app/api/admin/create-account/route.ts)
- [../middleware.ts](../middleware.ts)

### Phase 2 - RBAC And RLS Baseline

1. Implement concrete permission checks in:
- [../lib/auth/permissions.ts](../lib/auth/permissions.ts)
2. Apply permission checks in every protected route handler.
3. Harden RLS and helper SQL in:
- [../supabase/schema.sql](../supabase/schema.sql)
4. Validate role and tenant isolation with scenario-based checks.

Scope note for this phase:

- keep current RLS protections functional
- do not block launch on deep hardening expansion

### Phase 3 - Backend API Surface Per Module

Implement versioned routes (for example, /api/v1) and move business logic out of frontend providers.

Modules to implement:

1. Auth and profiles
2. Users and role management
3. Document catalog and document requests
4. Announcements
5. Notifications
6. Incidents and blotter
7. Medicines
8. Queue
9. Feedback
10. Request history
11. Census updates
12. Dashboard and reporting aggregates

For each module:

- define request validation
- define typed response contracts
- implement role-aware read and mutation endpoints
- add audit trail writes for critical actions
- ensure mutation responses return updated entity shapes expected by frontend selectors/components
- keep compatibility shims where needed until all screens are verified

### Phase 4 - Frontend Integration And Mock Data Removal

1. Replace frontend operational mock/local data calls with API calls.
2. Keep static marketing copy only where intentional.
3. Prioritize removal of direct operational fallback usage from:
- [../app/resident/document-requests/page.tsx](../app/resident/document-requests/page.tsx)
- [../lib/content/document-catalog.ts](../lib/content/document-catalog.ts)
4. Keep frontend state utilities only for empty/loading/error UX scaffolding.
5. Ensure role-specific pages call only role-allowed actions and show consistent status/messages.

### Phase 5 - Minimal Security And Stability Baseline

1. Add audit logging for all mutation endpoints.
2. Add rate limiting on auth and sensitive endpoints.
3. Standardize error taxonomy and API error shape.
4. Add idempotency strategy for retry-prone requests.

Security baseline for launch:

- server-side auth checks on protected APIs
- basic role checks
- basic tenant scoping
- minimal rate limiting on auth/admin-sensitive endpoints
- no launch dependency on advanced security analytics

### Phase 6 - Testing, Rollout, And Cutover

1. Add unit tests for auth and permission utilities.
2. Add integration tests for endpoint role access.
3. Add end-to-end smoke tests for resident, staff, and admin core journeys.
4. Roll out in slices:
- auth core plus registration and quick-login
- document workflow
- notifications and incident flows
- remaining modules
5. Define rollback criteria and release checklist per slice.

## Role-Capability Baseline

Admin:

- full user and role administration
- document approval/decline and oversight
- full operational visibility and reporting

Staff:

- operational processing after admin approval
- status updates and completion workflows
- staff module visibility only

Resident:

- self-service request/report submission
- own-profile and own-history access
- own notification and request status access

All capabilities must be enforced in both API logic and RLS.

## Key Files For Implementation

- [../lib/frontend-data/providers/backend-provider.ts](../lib/frontend-data/providers/backend-provider.ts)
- [../lib/auth/permissions.ts](../lib/auth/permissions.ts)
- [../middleware.ts](../middleware.ts)
- [../app/api/admin/create-account/route.ts](../app/api/admin/create-account/route.ts)
- [../lib/supabase/client.ts](../lib/supabase/client.ts)
- [../lib/supabase/admin.ts](../lib/supabase/admin.ts)
- [../lib/supabase/env.ts](../lib/supabase/env.ts)
- [../supabase/schema.sql](../supabase/schema.sql)

## Definition Of Done

1. Frontend operational modules no longer depend on mock operational data.
2. Protected routes and APIs enforce server-side auth and role checks.
3. RLS policies block unauthorized cross-role and cross-tenant access.
4. Auth lifecycle works end-to-end:
- register
- login
- access protected routes
- logout
5. Typed endpoint contracts are consumed by frontend state/services.
6. Core integration and e2e tests pass for all three roles.

## Out Of Scope For This Phase

- payment gateway integration
- realtime channels and websocket architecture
- passkeys or WebAuthn
- advanced anomaly detection and threat intelligence

## Recommended Next Document

After this plan is approved, create a backend task breakdown document with sprint-sized tickets per module and acceptance criteria per endpoint.
