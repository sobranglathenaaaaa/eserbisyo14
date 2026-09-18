# eSerbisyo Requirements Index

This file is the compatibility entry point for the requirement folder.

The actual finalized MVP context is split into focused markdown files so an AI or developer can load only the most relevant context.

## Recommended Reading Order

1. [README.md](./README.md)
2. [01-product-overview.md](./01-product-overview.md)
3. [02-roles-and-scope.md](./02-roles-and-scope.md)
4. [03-document-workflows.md](./03-document-workflows.md)
5. [04-service-modules.md](./04-service-modules.md)
6. [05-frontend-delivery.md](./05-frontend-delivery.md)
7. [06-document-catalog.md](./06-document-catalog.md)
8. [07-backend-implementation-plan.md](./07-backend-implementation-plan.md)
9. [08-backend-task-breakdown.md](./08-backend-task-breakdown.md)
10. [09-backend-api-contracts.md](./09-backend-api-contracts.md)
11. [10-backend-rollout-and-operations.md](./10-backend-rollout-and-operations.md)

## Purpose

Use this folder as the source of truth for:

- MVP scope
- user roles
- service workflows
- module priorities
- backend implementation boundaries and sequence
- document fee catalog

## Current Delivery Rule

For the current pass:

- backend implementation is active
- Supabase-backed API and essential auth baseline controls are active
- schema and RLS updates are allowed when required
- frontend must consume typed backend contracts for operational data

Primary backend reference:

- [07-backend-implementation-plan.md](./07-backend-implementation-plan.md)
- [08-backend-task-breakdown.md](./08-backend-task-breakdown.md)
- [09-backend-api-contracts.md](./09-backend-api-contracts.md)
- [10-backend-rollout-and-operations.md](./10-backend-rollout-and-operations.md)
