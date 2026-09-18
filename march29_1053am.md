# Frontend Bug Log

Date: March 29, 2026
Requested by: User audit across all 3 roles (admin, staff, resident)

## Scope
- Shared layout and shell components
- Admin pages
- Staff pages
- Resident pages
- Current editor/runtime diagnostics

## Critical (P0)

1. Invalid interactive nesting (link containing button) in multiple pages
- Root cause: shared Button component always renders a native button element.
- Reference: [components/ui/button.tsx](components/ui/button.tsx#L35)
- Problem pattern: Link wraps Button, resulting in anchor > button invalid HTML.
- Example references:
  - [app/admin/dashboard/page.tsx](app/admin/dashboard/page.tsx#L78)
  - [app/staff/dashboard/page.tsx](app/staff/dashboard/page.tsx#L60)
  - [app/resident/dashboard/page.tsx](app/resident/dashboard/page.tsx#L84)
- Impact: accessibility issues (focus/keyboard), inconsistent click and tap behavior, semantic HTML violations.

2. No mobile/tablet navigation fallback for admin and staff shells
- Sidebar is hidden on smaller viewports and only shown at large screens.
- Reference: [components/portal-shell.tsx](components/portal-shell.tsx#L211)
- Impact: navigation becomes difficult or blocked on smaller devices.
- Affected route groups: all pages using PortalShell under admin and staff.

## High (P1)

3. Resident mobile chips have low contrast text against light cards
- References:
  - [features/resident/view/resident-shell.tsx](features/resident/view/resident-shell.tsx#L220)
  - [features/resident/view/resident-shell.tsx](features/resident/view/resident-shell.tsx#L234)
  - [features/resident/view/resident-shell.tsx](features/resident/view/resident-shell.tsx#L274)
  - [features/resident/view/resident-shell.tsx](features/resident/view/resident-shell.tsx#L282)
- Impact: poor readability and weak visual quality on mobile.

4. Resident header bell control is a dead action
- Bell button appears actionable but has no click handler or navigation action.
- Reference: [features/resident/view/resident-shell.tsx](features/resident/view/resident-shell.tsx#L66)
- Impact: confusing UX and accessibility labeling gap.

## Medium (P2)

5. Shared role title logic labels non-admin as Staff
- Reference: [components/portal-shell.tsx](components/portal-shell.tsx#L181)
- Impact: incorrect role labeling if shell is reused beyond current assumptions.

6. Inconsistent localization (same text in both English/Filipino branches)
- References:
  - [components/portal-shell.tsx](components/portal-shell.tsx#L266)
  - [features/resident/view/resident-shell.tsx](features/resident/view/resident-shell.tsx#L169)
  - [features/resident/view/resident-shell.tsx](features/resident/view/resident-shell.tsx#L181)
  - [app/admin/dashboard/page.tsx](app/admin/dashboard/page.tsx#L49)
  - [app/staff/dashboard/page.tsx](app/staff/dashboard/page.tsx#L23)
- Impact: language toggle feels broken/incomplete and lowers UI trust.

## Diagnostics/Tooling Issues Seen During Audit

7. CSS diagnostics report unknown Tailwind at-rules
- References:
  - [styles/globals.css](styles/globals.css#L3)
  - [styles/globals.css](styles/globals.css#L4)
  - [styles/globals.css](styles/globals.css#L5)
- Message: Unknown at rule @tailwind
- Note: commonly editor/PostCSS lint configuration mismatch; still reported as active diagnostics.

8. Missing skill reference file in arrange skill docs
- Reference: [/.claude/skills/arrange/SKILL.md](.claude/skills/arrange/SKILL.md#L49)
- Message: reference/spatial-design.md not found.
- Also mirrored in codex copy:
  - [/.codex/skills/arrange/SKILL.md](.codex/skills/arrange/SKILL.md#L49)

9. Dev startup lock conflict blocks local run in current terminal context
- next dev cannot acquire lock: .next/dev/lock
- Message indicates another next dev instance is running.
- Impact: local validation run fails until duplicate process is stopped.

## Coverage Notes
- Admin pages using shared shell (10 pages): announcements, dashboard, document-requests, document-templates, incidents, medicines, notifications, queue, reports, users.
- Staff pages using shared shell (4 pages): dashboard, medicines, notifications, process-requests.
- Resident pages using resident shell (11 pages): dashboard, document-requests, notifications, queue, reservations, request-feedback, blotter-reporting, census, chatbot, digital-id, ocr.

## Recommended Fix Order
1. Fix invalid Link/Button composition in shared UI pattern.
2. Add mobile navigation fallback for admin/staff shell.
3. Fix resident mobile chip contrast and bell action behavior.
4. Clean localization inconsistencies and role title logic.
5. Resolve lint/tooling diagnostics and dev lock process workflow.
