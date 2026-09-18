# QA System Verification Hub

This folder contains role-based quality assurance assets for full-system verification.

## Structure

- resident/: Resident role test plans and automation specs
- admin/: Admin role test plans and automation specs
- staff/: Staff role test plans and automation specs
- workflows/: Cross-role end-to-end workflows
- _shared/: Global QA standards, safety rules, and execution strategy

## Operating Model

- Test mode: Manual + Automated
- Automated stack: Playwright
- Coverage strategy: Risk-based phase first, then full module coverage
- Execution cadence: PR smoke + nightly full run
- Environment: Shared production-like data (strict safety controls required)

## Definition of Done (Phase 1)

1. All critical role workflows pass in manual checklists.
2. Automated smoke tests pass on pull requests.
3. Two consecutive nightly full runs pass without critical failures.
4. Every write flow verifies API response and expected database side effects.
5. All test-created records are tagged with QA run identifiers.
