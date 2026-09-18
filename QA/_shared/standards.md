# QA Standards

## Naming and Traceability

- Every test record must include run tag: QA_RUN_<YYYYMMDD_HHMMSS>.
- Every case ID format: ROLE-MODULE-### (example: RES-DOCREQ-001).
- Every defect reference must include route, API endpoint, and expected vs actual behavior.

## Required Assertions Per Workflow

1. UI assertion: user-visible outcome is correct.
2. API assertion: fetch response envelope and status code are correct.
3. Data assertion: database state changed as expected.
4. Security assertion: role permissions are enforced.

## Evidence

- Manual runs: capture screenshots for each failed step.
- Automated runs: store trace, screenshot, and console output for failures.

## Non-Functional Baseline

- Validate responsive behavior on desktop and mobile viewport.
- Verify accessibility basics on critical forms (labels, focus visibility, keyboard interaction).
