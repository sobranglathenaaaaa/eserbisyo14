# Backend Rollout And Operations

Version: Backend Operations v1.1
Last Updated: April 5, 2026
Depends On:

- [07-backend-implementation-plan.md](./07-backend-implementation-plan.md)
- [08-backend-task-breakdown.md](./08-backend-task-breakdown.md)
- [09-backend-api-contracts.md](./09-backend-api-contracts.md)

## Purpose

This document defines the deployment, verification, rollback, and operational readiness playbook for backend launch.

Rollout strategy for this version:

- prioritize feature completeness and reliability first
- enforce essential launch security controls only
- ship in direct production slices with smoke testing and fix-forward handling

## Pre-Implementation Checklist

1. Confirm production and non-production Supabase projects are separate.
2. Confirm service role keys are only server-side.
3. Confirm environment variables are defined and validated in all environments.
4. Confirm audit log storage and retention policy is agreed for critical mutations.
5. Confirm release owner and rollback owner are assigned.

## Environment Baseline

Required environment categories:

- Supabase URL and keys
- application URL and auth redirect URLs
- rate limiting configuration
- feature flags for phased rollout
- logging and monitoring sinks

Validation requirements:

1. Startup must fail fast when required environment variables are missing.
2. Secrets must never be exposed to client bundles.

## Migration And Policy Rollout Sequence

1. Apply non-breaking schema changes first.
2. Apply RLS and policy updates in controlled batches.
3. Validate policy behavior per role before enabling endpoints that rely on them.
4. Keep reversible migration notes for each change.

Baseline boundary for this release:

- keep current RLS protections functional
- defer deep hardening expansion to follow-up phase

## Release Slices

### Slice A - Auth Core

Includes:

- auth utility layer
- immediate activation registration path
- session endpoint
- login and logout endpoints
- quick-login/bootstrap reliability fixes
- middleware enforcement

Go-live checks:

1. Unauthorized access blocked for protected routes.
2. Role redirects and permission denials are correct.
3. Login and logout success rates meet baseline.

Rollback trigger examples:

- authentication failure rate spike
- session invalidation failures

### Slice B - Document Workflows

Includes:

- document types
- document requests
- assignment and completion actions

Go-live checks:

1. Resident submission works end-to-end.
2. Admin approval and staff processing flows complete without manual DB fixes.
3. Status transitions enforce server rules.

Rollback trigger examples:

- request creation failures above threshold
- status transition conflicts above threshold

### Slice C - Notifications, Incidents, Announcements

Go-live checks:

1. Role-scoped notification access is correct.
2. Incident privacy and visibility checks pass.
3. Announcement publish flow works for admin role only.
4. Resident incident status and notification updates remain consistent after refresh.

### Slice D - Remaining Modules

Includes:

- medicines
- queue
- feedback
- history
- census
- dashboard summaries

Go-live checks:

1. Module endpoints pass contract and integration tests.
2. No remaining operational mock dependency in frontend flows.
3. Dashboard summary values are sane and role-scoped.

## Minimal Security And Stability Baseline

Launch-blocking controls:

1. Server-side auth checks on protected APIs.
2. Basic role checks for protected mutations and reads.
3. Basic tenant scoping enforced in API and RLS.
4. Minimal rate limiting on auth and admin-sensitive endpoints.
5. Audit logging for critical mutations.

Deferred to follow-up hardening phase:

1. Advanced abuse analytics.
2. Broader anomaly detection and threat intelligence rules.
3. Non-critical deep policy optimization.

## Operational SLO And Monitoring Baseline

Suggested minimum baseline:

1. API availability: 99.9 percent monthly target.
2. Auth endpoint p95 latency: under 500 ms.
3. Core module endpoint p95 latency: under 800 ms.
4. Error budget alerts for 5xx spikes and 401/403 anomaly spikes.

Monitor by category:

- auth failures by reason code
- permission denied rates by endpoint
- mutation failure rates
- policy denial anomalies
- queue duplicate prevention rates

## Security Operations Checklist

1. Rotate service role keys on schedule.
2. Review RLS policies after every schema change.
3. Confirm audit logs exist for critical mutation endpoints.
4. Confirm rate limiting is active on auth and admin-sensitive endpoints.
5. Run periodic permission matrix review with product owner.

## Incident Response Playbook

Severity levels:

- Sev 1: auth outage, data exposure risk, critical endpoint outage
- Sev 2: major module degradation with workaround
- Sev 3: non-critical degradation

Response flow:

1. detect and classify severity
2. assign incident commander and communications owner
3. contain impact with feature flags or endpoint disable controls
4. execute rollback if needed
5. publish root cause summary and corrective actions

## Rollback Procedure

1. Disable latest feature flags for affected slice.
2. Revert to last stable API deployment.
3. If migration related, apply documented rollback migration.
4. Re-run smoke checks for auth and document workflows.
5. Announce status and recovery ETA.

## Release Readiness Gate

All must be true before full cutover:

1. Contract tests pass against all implemented endpoints.
2. Integration tests pass for resident, staff, and admin core paths.
3. E2E smoke suite passes for auth and document lifecycle.
4. RLS validation scenarios pass for all role types.
5. Observability dashboards and alerts are active.
6. Rollback runbook is dry-run validated in non-production.

## Post-Release Verification

1. Verify key journey success rates at 1 hour, 6 hours, and 24 hours.
2. Verify no increase in unauthorized data access attempts.
3. Verify API error code distribution is within expected range.
4. Confirm no operational mock fallback paths are being used.

## Ownership Matrix

Recommended ownership:

- Backend lead: API contracts and endpoint correctness
- Database lead: schema and RLS correctness
- Frontend lead: contract consumption and de-mock completion
- QA lead: contract, integration, and end-to-end validation
- Product owner: acceptance and rollout approval

## Definition Of Done

1. Rollout sequence is executable without ambiguous steps.
2. Production safety checks and rollback are fully defined.
3. Monitoring and operational ownership are explicit.
