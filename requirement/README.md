# eSerbisyo MVP Requirements

Version: Finalized MVP v2.2
Last Updated: April 5, 2026
Product Type: Web-based barangay service platform
Current Delivery Phase: Feature-complete backend integration and production slice rollout

## Folder Intent

This folder is structured for both human reading and AI context loading.

Instead of keeping all product context in one long markdown file, the MVP is split into smaller, focused documents. This makes it easier to:

- load only the relevant context for a task
- reduce ambiguity during implementation
- keep scope, workflows, and technical boundaries separate

## Read Order

1. [01-product-overview.md](./01-product-overview.md)
2. [02-roles-and-scope.md](./02-roles-and-scope.md)
3. [03-document-workflows.md](./03-document-workflows.md)
4. [04-service-modules.md](./04-service-modules.md)
5. [05-frontend-delivery.md](./05-frontend-delivery.md)
6. [06-document-catalog.md](./06-document-catalog.md)
7. [07-backend-implementation-plan.md](./07-backend-implementation-plan.md)
8. [08-backend-task-breakdown.md](./08-backend-task-breakdown.md)
9. [09-backend-api-contracts.md](./09-backend-api-contracts.md)
10. [10-backend-rollout-and-operations.md](./10-backend-rollout-and-operations.md)

## Source of Truth

Together, these files define:

- what the MVP is
- who uses it
- what each role can do
- how the core workflows should behave
- what belongs in MVP versus MVP+
- what the active backend phase is allowed to implement right now

## Current Development Constraints

For the current backend phase:

- backend implementation is in scope
- Supabase integration hardening is limited to essential launch controls
- auth and permission enforcement is in scope
- schema and RLS updates are in scope when required by backend correctness
- module-level API implementation is in scope
- registration is immediate activation (no email verification dependency in UI)

Primary implementation reference:

- [07-backend-implementation-plan.md](./07-backend-implementation-plan.md)
- [08-backend-task-breakdown.md](./08-backend-task-breakdown.md)
- [09-backend-api-contracts.md](./09-backend-api-contracts.md)
- [10-backend-rollout-and-operations.md](./10-backend-rollout-and-operations.md)
