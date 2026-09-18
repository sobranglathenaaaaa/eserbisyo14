# Terms and Conditions + Data Privacy Implementation Plan

## Final Decisions (Confirmed)
1. Language: Bilingual (English + Filipino).
2. Legal content structure: Two separate pages.
3. Consent versioning: Keep current behavior for now (timestamp-only consent tracking).
4. Link placement: Include legal links in resident, staff, and admin areas (in addition to registration and public landing).

## Goal
Add complete bilingual legal content into eSerbisyo in a compliant, discoverable way: required during registration, accessible before sign-up, and always reachable after login across all roles.

## Scope
1. Create two public legal pages:
- Terms and Conditions
- Data Privacy Policy

2. Surface links in these entry points:
- Registration form (required consent checkboxes)
- Landing/footer (public)
- Logged-in navigation for resident, staff, and admin

3. Keep backend consent enforcement as-is:
- Require both consent flags during registration
- Store acceptance timestamps only

## Proposed Routes
1. `/terms-and-conditions`
2. `/data-privacy`

## Content Plan (Bilingual)
1. Show English and Filipino content on the same page for each policy.
2. Recommended layout:
- Page title
- Short legal intro
- Language toggle or stacked sections (`English` then `Filipino`)
- Numbered sections matching approved policy text
- Contact block at bottom
- Last updated date

3. Keep section parity across both languages (same numbering/order).

## Technical Plan

### Step 1: Create public legal pages (two separate pages)
Target files:
1. `app/terms-and-conditions/page.tsx` (new)
2. `app/data-privacy/page.tsx` (new)
3. `styles/globals.css` or feature-scoped styles if needed

Tasks:
1. Add two standalone pages with bilingual content blocks.
2. Ensure pages are accessible without authentication.
3. Add consistent typography and spacing for long-form legal text.

Acceptance checks:
1. Both pages load while logged out.
2. Headings and section numbers are readable on desktop/mobile.
3. Contact details and policy metadata are visible.

### Step 2: Registration consent UX (required + linked)
Target files:
1. `app/(auth)/register/register-form.tsx`
2. `app/(auth)/auth.module.css`

Tasks:
1. Keep existing required checkboxes.
2. Turn Terms and Privacy text into links to the two legal routes.
3. Keep validation behavior unchanged when unchecked.

Acceptance checks:
1. Cannot submit register form unless both consents are checked.
2. Linked text opens correct policy page.
3. Checkbox labels remain keyboard and screen-reader friendly.

### Step 3: Public and in-app discoverability (all roles)
Target files:
1. `app/page.tsx` (landing/footer links)
2. Resident nav model file(s)
3. Staff nav model file(s)
4. Admin nav model file(s)

Tasks:
1. Add footer links for guests.
2. Add legal links in resident, staff, and admin portal navigation or account/help section.
3. Use consistent link labels across roles.

Acceptance checks:
1. Legal links visible from all role dashboards.
2. Links resolve correctly and do not require role-specific route logic.
3. No navigation regressions.

### Step 4: Backend and schema posture (no change for now)
Target files:
1. `app/api/v1/auth/register/route.ts`
2. `supabase/schema.sql` (reference only)

Tasks:
1. Keep consent enforcement as-is.
2. Keep timestamp-only storage (`terms_accepted_at`, `privacy_accepted_at`).

Acceptance checks:
1. Registration API still rejects missing consent.
2. Existing consent timestamp behavior remains intact.

### Step 5: QA coverage updates
Target files:
1. `QA/resident/automated/resident-auth.spec.ts`
2. Other role smoke specs as needed

Tasks:
1. Assert register page shows legal links.
2. Assert links are navigable.
3. Keep existing negative tests for unchecked consent.
4. Add smoke assertions for admin/staff/resident legal link visibility.

Acceptance checks:
1. Auth tests pass with required consent behavior.
2. New legal-link checks pass in role flows.
3. Build and QA smoke remain green.

## Risks and Notes
1. Long bilingual legal content may feel dense on mobile; use clear section spacing and sticky in-page language jump links if needed.
2. If policy text changes later, timestamp-only tracking cannot prove which version user accepted.
3. Ensure public legal routes are not blocked by auth middleware.

## Out of Scope (Current Iteration)
1. Consent versioning (e.g., policy version IDs/hash).
2. Mandatory re-consent workflow for existing users.
3. Downloadable PDF export of policies.

## Suggested Commit Breakdown
1. `feat(legal): add public bilingual terms and privacy pages`
2. `feat(auth): link required register consent to legal pages`
3. `feat(nav): add legal links across resident staff admin and landing`
4. `test(qa): add legal link and consent coverage`

## Implementation Checklist
1. Create two legal routes with bilingual text.
2. Wire links in register labels.
3. Wire links in landing footer.
4. Wire links in resident/staff/admin nav.
5. Run `npm run build`.
6. Run QA auth + smoke suites.
7. Verify no middleware auth redirect on legal routes.
