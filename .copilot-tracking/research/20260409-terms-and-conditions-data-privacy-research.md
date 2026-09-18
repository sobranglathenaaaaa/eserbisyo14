<!-- markdownlint-disable-file -->

# Task Research Notes: Terms and Conditions + Data Privacy In-System

## Research Executed

### File Analysis

- app/(auth)/register/register-form.tsx
  - Registration UI already has required consent booleans, client-side blocking, and checkbox controls for Terms and Data Privacy.
- app/api/v1/auth/register/route.ts
  - API enforces terms/privacy acceptance, persists acceptance timestamps to profile, and returns verificationRequired true with isVerified false.
- lib/frontend-data/store.ts
  - Frontend registration payload contract includes termsAccepted and privacyAccepted and forwards to provider.
- lib/frontend-data/contracts/data-provider.ts
  - Typed registration payload includes legal consent fields.
- lib/frontend-data/providers/backend-provider.ts
  - Registration request is multipart form-data; includes termsAccepted/privacyAccepted and idImageFile.
- app/(auth)/register/page.tsx
  - Current register page only renders form and login link; no legal-page links yet.
- app/(auth)/auth.module.css
  - Existing styles for legal text, links, and checkbox controls can be reused for policy links.
- app/page.tsx
  - Landing footer has a links section with no legal links; suitable insertion point for public policy pages.
- features/resident/model/navigation.ts
  - Resident account-area navigation exists (My Profile, My Digital ID, AI Assistant), and can host post-login legal access.
- app/api/v1/profiles/me/route.ts
  - Profile API already exposes termsAcceptedAt and privacyAcceptedAt to client.
- supabase/schema.sql
  - profiles table already has terms_accepted_at and privacy_accepted_at columns.
- middleware.ts
  - Public routes include /login and /register; adding /terms and /privacy pages should be reflected in public path handling only if protected-route behavior changes.
- QA/resident/automated/resident-auth.spec.ts
  - Automated tests already verify legal consent blocking and timestamp persistence.
- requirement/02-roles-and-scope.md
  - Auth + resident registration requirements are documented, but does not define standalone legal pages.
- requirement/05-frontend-delivery.md
  - Frontend requires route reachability, responsive UX, and multilingual support.
- requirement/08-backend-task-breakdown.md
  - States historical expectation of verificationRequired false (now mismatched with current implementation).
- requirement/09-backend-api-contracts.md
  - Register contract documentation is outdated relative to current fields and verification behavior.

### Code Search Results

- register|signup|terms|privacy|consent in app/**
  - Found register form checkboxes, client validation, API validation, persisted profile timestamps, and no existing legal standalone pages.
- /api/v1/auth/register usages
  - Found usages in register UI flow, backend provider, and resident QA automation.
- type="checkbox" in auth surfaces
  - Found explicit checkbox control pattern in register form and corresponding style primitives in auth.module.css.
- footer patterns in landing
  - Found existing landing footer links section ready for adding Terms/Data Privacy links.
- settings|profile|account in resident navigation
  - Found account group navigation entries where post-login legal links can be added with minimal IA drift.

### External Research

- #githubRepo:"vercel/next.js registration form terms and privacy checkbox link example"
  - No high-signal dedicated legal-checkbox example was returned, but examples confirm standard Next.js pattern: explicit checkbox inputs in client forms plus server-side validation.
- #fetch:https://privacy.gov.ph/data-privacy-act/
  - RA 10173 sections support implementation requirements for explicit informed consent evidence, transparency, purpose limitation, data subject rights notice, and security/accountability alignment.
- #fetch:https://privacy.gov.ph/implementing-rules-and-regulations-of-republic-act-no-10173-known-as-the-data-privacy-act-of-2012/
  - Fetch extraction failed; no IRR-specific textual findings were added.
- #fetch:https://www.privacy.gov.ph/
  - NPC site confirms active regulator guidance posture and references to privacy notices/complaint channels; use as secondary context only.

### Project Conventions

- Standards referenced: typed payload contracts in lib/frontend-data, server-side validation in API routes, route-based App Router pages, Playwright QA for auth workflows, resident navigation model for menu extensions.
- Instructions followed: repository-only evidence gathering, requirement docs cross-check, exact file-path mapping, and recommendation narrowed to one implementation approach.

## Key Discoveries

### Project Structure

Registration and account creation are implemented through a clear layered chain:

1. UI: app/(auth)/register/page.tsx + register-form.tsx
2. Frontend state boundary: lib/frontend-data/store.ts + contracts/data-provider.ts
3. Backend transport: lib/frontend-data/providers/backend-provider.ts
4. API: app/api/v1/auth/register/route.ts
5. Persistence: supabase profiles table columns terms_accepted_at/privacy_accepted_at

No standalone legal content routes currently exist under app/**. No reusable modal/dialog framework was found for auth legal content display. Current pattern favors full-page routes and inline links.

### Implementation Patterns

- Client-side pre-submit guard exists for terms and privacy checkboxes.
- Server-side guard duplicates validation and is authoritative.
- Consent evidence is currently a timestamp only; no policy version identifier is captured.
- Profile read API already returns acceptance timestamps.
- Landing and auth pages use plain Link and semantic form controls (no react-hook-form/zod in current auth pages).
- Multilingual capability exists in resident features via copy helpers, but auth pages are currently English-only.

### Complete Examples

```tsx
// Source: app/(auth)/register/register-form.tsx
if (!form.terms) {
  setError('Please agree to the Terms and Conditions.');
  return;
}

if (!form.dataPrivacy) {
  setError('Please accept the Data Privacy Policy.');
  return;
}

const result = await registerResident({
  // ...
  termsAccepted: form.terms,
  privacyAccepted: form.dataPrivacy,
});

<label className={styles.checkControl} htmlFor="terms-consent">
  <input id="terms-consent" type="checkbox" checked={form.terms} onChange={...} />
  <span>I agree to the Terms &amp; Conditions.</span>
</label>
<label className={styles.checkControl} htmlFor="privacy-consent">
  <input id="privacy-consent" type="checkbox" checked={form.dataPrivacy} onChange={...} />
  <span>I accept the Data Privacy Policy.</span>
</label>
```

```ts
// Source: app/api/v1/auth/register/route.ts
if (!body.termsAccepted) {
  return fail('VALIDATION_ERROR', 'Please accept the Terms and Conditions.', 400);
}

if (!body.privacyAccepted) {
  return fail('VALIDATION_ERROR', 'Please accept the Data Privacy Policy.', 400);
}

const acceptedAt = new Date().toISOString();

await admin.from('profiles').insert({
  // ...
  terms_accepted_at: acceptedAt,
  privacy_accepted_at: acceptedAt,
  is_verified: false,
});
```

### API and Schema Documentation

- Effective API request fields already include:
  - usernameEmail, email, password, firstName, middleName, lastName, suffix
  - sex, civilStatus, citizenship, birthDate
  - contactNumber, addressLine, province, city, barangay
  - idNumber, idImageFile
  - termsAccepted, privacyAccepted
- Effective API legal responses:
  - Missing terms/privacy => VALIDATION_ERROR 400
- Effective profile legal fields:
  - terms_accepted_at timestamptz
  - privacy_accepted_at timestamptz
- Documentation drift detected:
  - requirement/09-backend-api-contracts.md register contract does not match current implemented request/response.
  - requirement/08-backend-task-breakdown.md expected verificationRequired false, but implementation returns true and enforces pre-login verification.

### Configuration Examples

```ts
// Source: middleware.ts
const PUBLIC_PATHS = ['/', '/login', '/register'];
const PUBLIC_API_PREFIXES = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/verify',
  '/api/v1/auth/resend-verification',
  '/api/v1/auth/logout',
];
```

```ts
// Source: package.json
// Auth pages currently use React + Next primitives and local CSS.
// No form-validation library currently used in auth implementation.
```

### Technical Requirements

- Must keep consent enforcement in both client and server layers.
- Must add discoverable standalone legal pages for Terms and Privacy.
- Must make legal pages reachable from registration and public landing/footer.
- Should provide post-login legal access from resident account information architecture.
- Should preserve accessibility: keyboard focus, linked text semantics, and clear error messaging.
- Should account for versioning needs (future policy updates currently unsupported by schema).

## Recommended Approach

Implement a route-based legal-content model with linked mandatory consent at registration, while preserving existing server-enforced consent checks.

Single chosen approach details:

1. Keep current required checkboxes in register form.
2. Convert checkbox label copy into linked legal acknowledgments:
   - Terms link -> /terms
   - Data Privacy link -> /privacy
3. Add standalone public pages:
   - app/terms/page.tsx
   - app/privacy/page.tsx
   - Render static legal content with existing auth/landing style language and simple semantic sections.
4. Add non-blocking discoverability links:
   - Public landing footer links section.
   - Optional resident post-login access under account group (for example via resident navigation more/account group).
5. Keep API behavior unchanged initially (already compliant for required consent evidence via timestamps).
6. Add a follow-up backlog item for legal versioning persistence (terms_version, privacy_version, accepted_source) before major policy revisions.

Why this approach is optimal for this codebase:

- Matches existing App Router page conventions and avoids introducing modal complexity.
- Reuses existing style/token and link patterns.
- Preserves existing QA tests and consent enforcement path with minimal regressions.
- Delivers immediate compliance UX improvements without schema migration risk in first pass.

## Implementation Guidance

- **Objectives**: add explicit linked legal consent UX, standalone policy pages, and persistent discoverability points without breaking registration.
- **Key Tasks**: create legal pages, update register labels to include links, add footer/account access links, update affected QA tests/selectors, optionally update outdated requirement docs.
- **Dependencies**: Next App Router page additions, existing auth.module.css link styles, resident navigation config, Playwright auth specs.
- **Success Criteria**: registration cannot submit without consent; legal links open dedicated pages; policy pages are reachable pre-login and post-login; existing and new QA checks pass; no change to auth API contract behavior unless intentionally versioned.