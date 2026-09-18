# Resident Request Workspace Feedback

**Branch:** resident-request-workspace-feedback
**Description:** Improve spacing in the resident Request Workspace and add clear post-action notifications for request actions.

## Goal
Resolve the reported UI crowding and missing confirmation feedback in the Resident Request Workspace. The result should make content easier to scan and ensure users receive immediate, clear feedback after state-changing actions.

## Implementation Steps

### Step 1: Refine Request Workspace spacing and layout rhythm
**Files:** app/resident/document-requests/page.tsx, related resident request workspace view components under features/resident/view, and styles/design-tokens.css only if token reuse is needed.

**What:**
- Increase spacing between tabs, workspace container blocks, and action sections.
- Add consistent inner padding for the main workspace card and sub-sections.
- Ensure table view and mobile card view both keep comfortable visual separation.
- Keep existing interaction flow unchanged while improving readability.

**Testing:**
- Check desktop, tablet, and mobile breakpoints for visible spacing improvements.
- Verify no layout overlap, clipped rows, or broken card stacking.
- Verify tab switching and action buttons still behave as before.

### Step 2: Add unified notifications for request actions
**Files:** resident request action handlers and UI host component that executes submit/cancel actions, plus existing shared alert or toast utilities in components/ui.

**What:**
- Show success notification after successful submit request.
- Show success notification after successful cancel request.
- Show warning or error notification for failed action attempts.
- Standardize message formatting so each action produces one clear message with severity.

**Testing:**
- Submit request and confirm one success notification appears.
- Cancel request and confirm one success notification appears.
- Simulate failing API response and confirm warning or error notification appears.
- Confirm no duplicate notifications on rerender or route updates.

### Step 3: QA alignment and regression checks
**Files:** QA resident flow specs or checklists for request workflows.

**What:**
- Add acceptance checks covering spacing readability and post-action notifications.
- Capture expected messages for submit and cancel paths.
- Include a failure-path notification check.

**Testing:**
- Run resident request-related QA checks.
- Run lint/build validation to ensure no regressions.
- Run targeted smoke checks for submit/cancel notification visibility.

## Commit Plan

### Commit 1: resident-request-workspace-spacing
Scope: spacing and layout improvements in resident Request Workspace UI only.

### Commit 2: resident-request-action-notifications
Scope: post-action notifications for submit, cancel, and failure paths.

### Commit 3: resident-request-workspace-qa-updates
Scope: QA checklist or test updates for acceptance and regressions.

## Default UX Decisions Applied
- Notification style: toast-first for action results, using existing shared UI pattern in the repo.
- Notification coverage: state-changing actions only (submit, cancel, and other create or update request actions).
- Copy language: English for consistency with existing interface text.
- Visual adjustment approach: spacing and hierarchy tuning only, no redesign of data structure or feature flow.
