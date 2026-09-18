# Resident Request History UX Enhancement

**Branch:** `plan/request-history-ui-ux-sorted-categories`
**Description:** Enhance resident request history with clearer information architecture, clickable sorted categories, deterministic ordering, and stronger mobile/a11y behavior.

## Goal
Improve the resident Request History experience so users can quickly understand all activity in one place, then drill into specific categories (for example Generated Documents) through explicit category controls. The feature should keep behavior deterministic, keyboard accessible, and aligned with existing resident shell/navigation patterns.

## Implementation Steps

### Step 1: Define IA, category map, and deterministic sorting contract
**Files:** `app/resident/request-history/page.tsx`, `features/resident/model/selectors.ts`, `features/resident/model/requests.ts` (reference pattern), `requirement/03-document-workflows.md` (if requirement wording update is needed)

**What:**
- Establish a single source of truth for Request History categories shown on the page (top-level All + sub-categories).
- Lock category set and order as:
  - `all`
  - `requests`
  - `generated-documents`
  - `notifications`
  - `report-progress`
- Define deterministic sort rules and tie-breakers for records:
  - Primary: newest-first by timestamp (`updatedAt` when available, otherwise `createdAt`).
  - Secondary: stable ID descending tie-breaker.
- Normalize resident-scoped arrays in one memoized view model so page rendering does not rely on implicit backend ordering.
- Keep this page as a unified tracking destination that includes all currently shown streams.

**Testing:**
- Unit-level checks (or lightweight assertion helpers) confirm category order remains stable even if payload order changes.
- Verify empty state behavior per category is deterministic.
- Verify fallback timestamp logic does not crash when fields are missing.

### Step 2: Add top-level All view and clickable category navigation
**Files:** `app/resident/request-history/page.tsx`, `features/resident/view/resident-primitives.tsx` (only if a reusable segmented control primitive is extracted), `styles/globals.css` or resident token files only if existing utility classes are insufficient

**What:**
- Introduce a category navigation control at the top of Request History that supports:
  - `All` view aggregating all request-history-related streams.
  - Clickable category views (`Requests`, `Generated Documents`, `Notifications`, `Report Progress`) to filter focus.
- Persist selected category in URL query param (for example `?category=generated-documents`) using App Router client navigation patterns to support deep links and refresh persistence.
- Keep visual hierarchy clear: summary counters first, category controls second, selected content panel third.
- Align control styling and interaction with existing resident module patterns (document-requests tab/category controls).

**Testing:**
- Manual verification that category click updates visible content and URL query.
- Reload page and verify category state restores from URL.
- Confirm default category is All when query is absent/invalid.
- Confirm browser back/forward preserves category state transitions.

### Step 3: Recompose content panels for scanability and mobile behavior
**Files:** `app/resident/request-history/page.tsx`, optional extraction under `features/resident/view/` if JSX complexity grows

**What:**
- Redesign section composition so All view presents one mixed chronological feed across all categories with concise metadata chips (status, type, date, category).
- Ensure category-specific panels show only relevant cards with consistent metadata hierarchy.
- Implement responsive behavior:
  - Desktop/tablet: category controls wrap cleanly with no horizontal clipping.
  - Mobile: touch-friendly targets, compact card spacing, and no content overflow.
- Keep existing bilingual copy pattern (`copyText`) and resident shell composition.

**Testing:**
- Validate layout at common breakpoints (mobile, tablet, desktop) with no clipping or overlap.
- Verify each category panel renders correct card type and count.
- Verify empty states remain meaningful on all viewports.

### Step 4: Accessibility and keyboard support hardening
**Files:** `app/resident/request-history/page.tsx`, `components/ui/button.tsx` (only if variant/focus behavior requires adjustment), `features/resident/view/resident-primitives.tsx` (if shared control extracted)

**What:**
- Ensure category controls are keyboard reachable and operable (`Tab`, `Enter`, `Space`) with visible focus state.
- Apply semantic roles/attributes for segmented navigation state indication (for example pressed/selected semantics, `aria-current` or tab semantics as finalized).
- Add screen-reader-friendly labels for counts and active category context.
- Confirm color contrast and state indications are not color-only.

**Testing:**
- Keyboard-only pass validates complete category switching flow.
- Basic screen-reader sanity check for active category announcement.
- Playwright assertions use role-based locators and focus assertions for at least one category-switch path.

### Step 5: QA and regression coverage updates
**Files:** `QA/workflows/manual-qa-resident-admin-staff.md`, `QA/resident/automated/resident-document-requests.spec.ts` (reference pattern only), `QA/workflows/cross-role-phase1.smoke.spec.ts` (if smoke coverage is expanded), `QA/resident/automated/resident-request-history.spec.ts`

**What:**
- Extend manual QA workflow section 4.2 to include:
  - All view verification.
  - Category click/filter verification.
  - Deterministic category ordering checks.
  - Keyboard accessibility checks.
  - Mobile viewport checks.
- Add dedicated automated Playwright coverage in `resident-request-history.spec.ts` for category switching and URL-state restoration.
- Ensure regression scope confirms no breakage in related resident tracking pages.

**Testing:**
- Run targeted spec(s) for resident request history and related smoke path.
- Run `npm run qa:smoke` for baseline regression confidence.
- Run `npm run build` to confirm production build remains green.

## Assumptions
- Request History should remain a unified resident page rather than splitting into nested sub-routes.
- Existing resident data sources (`state.documentRequests`, `state.generatedDocuments`, `state.notifications`, `state.reports`) remain the source for this UX pass.
- No backend schema/API contract changes are required for this plan.
- Existing UI stack (`Next.js App Router`, current `components/ui`, resident primitives) is preferred over adding new UI libraries.

## Finalized Product Decisions
- Category set includes all current streams: Requests, Generated Documents, Notifications, and Report Progress, plus top-level All.
- Category order is fixed by product contract, not alphabetical.
- Active category is URL-synced through `?category=`.
- All view is a unified chronological feed across categories.
- Automated QA uses a dedicated spec file: `QA/resident/automated/resident-request-history.spec.ts`.
