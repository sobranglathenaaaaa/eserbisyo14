# Resident Automated Suite Blueprint

## Scope

Automate high-risk resident flows first:

1. Login and session continuity.
2. Document request submission and status tracking.
3. Notification read flow.
4. Incident submission.
5. Feedback submission.

## Spec Naming

- resident-auth.spec.ts
- resident-document-requests.spec.ts
- resident-notifications.spec.ts
- resident-incidents.spec.ts
- resident-feedback.spec.ts

## Mandatory Assertions

- UI state correctness.
- API response contract correctness.
- DB side-effect correctness.
