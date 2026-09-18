# Email Verification Production Toggle

**Branch:** `feature/email-verification-prod-toggle`
**Description:** Make registration email verification configurable with a strict true/false env flag that is enforced only in production.

## Goal
Allow registration email verification behavior to be controlled by one environment variable, so production can explicitly enable or disable verification without code changes. Keep the scope intentionally limited to registration to avoid unintended behavior changes in login/session flows.

## Implementation Steps

### Step 1: Add Production-Only Registration Toggle
**Files:** `lib/auth/email-verification.ts`, `app/(auth)/register/*`, `.env.example` or equivalent env docs, `README.md` (auth/env section), registration/auth tests
**What:** Add a central config reader for `EMAIL_VERIFICATION_ENABLED` that accepts only `"true"` or `"false"` values. Apply the toggle only in the registration flow and only when `NODE_ENV=production`; outside production, keep current non-production behavior unchanged.
**Testing:**
1. Set `NODE_ENV=production` and `EMAIL_VERIFICATION_ENABLED=true`; verify registration requires email verification exactly as expected.
2. Set `NODE_ENV=production` and `EMAIL_VERIFICATION_ENABLED=false`; verify registration skips verification gating.
3. Set non-production environment; verify registration behavior remains unchanged from current baseline.
4. Validate invalid env values (for example `1`, `yes`, empty) fail safely with a clear error/log path.
5. Run build and auth-related tests to ensure no regressions.

## Decisions Captured
- Scope: registration flow only
- Environment scope: production only
- Supported values: strict `true` / `false`
- Variable name: `EMAIL_VERIFICATION_ENABLED`

## Commit Plan
- **Commit 1:** Introduce `EMAIL_VERIFICATION_ENABLED` parser and production-only registration gating.
- **Commit 2:** Add/update docs and tests for the two production flag states plus invalid-value handling.

## Risks To Watch
- Accidentally applying toggle to login/session verification checks.
- Divergent behavior between server actions and API routes if config is read inconsistently.
- Silent misconfiguration if env parsing is not strict.
