# Automated Test Helpers

This folder contains reusable Playwright helpers used by role-based specs.

## Environment Variables

- QA_BASE_URL: Base URL of the running app (example: http://localhost:3000)
- QA_RESIDENT_EMAIL, QA_RESIDENT_PASSWORD
- QA_ADMIN_EMAIL, QA_ADMIN_PASSWORD
- QA_STAFF_EMAIL, QA_STAFF_PASSWORD
- QA_TENANT_ID (optional, defaults to default)

## Safety

- Helpers use QA run tags for created records.
- Helpers do not issue hard-delete operations.
- Specs should only mutate data created within the current run tag.
