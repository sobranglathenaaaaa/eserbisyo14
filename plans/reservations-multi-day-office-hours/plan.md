# Resident Reservations Multi-Day Office-Hours Enforcement

**Branch:** `reservations-multi-day-office-hours`
**Description:** Add start/end-based reservations with multi-day support while enforcing 08:00-17:00 office-hour boundaries for resident self-service requests.

## Goal
Upgrade the resident reservations flow from single-date plus preset slot to explicit start/end scheduling that supports overnight and multi-day spans. Ensure reserve and return timestamps are validated within office hours (inclusive at exactly 08:00 and 17:00) using tenant-local timezone when available, otherwise Asia/Manila fallback.

## Implementation Steps

### Step 1: Add additive reservation schedule columns and backward-compatible data contract
**Files:** supabase/migrations/{new_timestamp}_add_reservation_start_end_columns.sql, supabase/schema.sql, lib/types/models.ts, lib/frontend-data/providers/backend-provider.ts
**What:** Add nullable or backfillable start_at and end_at timestamptz columns to reservations with non-destructive migration and indexes, keeping existing date field intact for compatibility in this PR. Extend frontend state mapping and Reservation type to read new fields while preserving legacy date rendering as fallback when start_at/end_at are absent.
**Testing:** Run migration in local Supabase, verify old rows still load without errors, and confirm GET /api/v1/reservations returns records consumable by existing pages after type mapping updates.

### Step 2: Introduce shared office-hours validator with timezone fallback and inclusive boundaries
**Files:** lib/reservations/office-hours.ts (new), app/api/v1/reservations/route.ts, app/api/v1/reservations/[reservationId]/status/route.ts (import-ready only, no behavior change), lib/auth/request-auth.ts (if minimal helper export is needed)
**What:** Create a reusable validation utility that parses start/end inputs, enforces start < end, allows multi-day/overnight spans, and validates both boundary timestamps inside 08:00-17:00 inclusive in tenant timezone when available else Asia/Manila. Apply hard enforcement immediately in resident POST /api/v1/reservations, keep staff/admin status route behavior unchanged, and structure exports so other routes can opt in later without regression.
**Testing:** Add route-level assertions for valid edge inputs (08:00 start, 17:00 end, multi-day span), invalid boundaries (<08:00 or >17:00), and malformed payloads returning VALIDATION_ERROR with 400.

### Step 3: Update resident reservation submission UI to customizable start/end scheduling
**Files:** app/resident/reservations/page.tsx, lib/frontend-data/contracts/data-provider.ts, lib/frontend-data/store.ts, lib/frontend-data/providers/backend-provider.ts, lib/content/role-pages.ts
**What:** Replace fixed TIME_SLOTS with start/end date-time inputs (or equivalent customizable controls) that let residents choose any duration including overnight while guiding users about office-hour constraints. Update provider contract and API payload to send startAt/endAt while keeping temporary compatibility fields where needed during transition.
**Testing:** Manual UI check on /resident/reservations for valid multi-day submission, rejection messaging for out-of-hours boundaries, and persistence/display of newly created reservations.

### Step 4: Align admin reservation review display with start/end schedule semantics
**Files:** app/admin/reservations/page.tsx, lib/frontend-data/providers/backend-provider.ts, lib/types/models.ts
**What:** Update admin reservation queue presentation to show normalized schedule range (start and end) instead of date-only, including graceful fallback for legacy reservations that still only have date. Keep decision workflow (approve/decline/cancel semantics) unchanged to avoid regressions.
**Testing:** Verify admin list renders mixed legacy/new reservations, can still approve/decline, and status updates remain reflected in resident view.

### Step 5: Add QA coverage and workflow documentation for office-hours + multi-day behavior
**Files:** QA/admin/automated/admin-reservations.spec.ts (new), QA/workflows/manual-qa-resident-admin-staff.md, QA/admin/manual/phase1-checklist.md
**What:** Add automated admin reservation flow coverage and extend manual workflow checks for resident create validation, inclusive boundaries, and allowed overnight/multi-day spans. Document expected API contracts for startAt/endAt and backward-compatible behavior during rollout.
**Testing:** Run targeted Playwright reservation scenarios plus existing smoke workflow to verify no regression in reservation status transitions and tenant scoping.