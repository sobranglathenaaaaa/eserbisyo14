# Shared Environment Safety Rules

Because tests run on shared production-like data, these rules are mandatory.

## Safety Controls

1. Never use hard delete in QA scripts.
2. Create only namespaced records tagged with QA run ID.
3. Use deterministic prefixes for entities (example: QA Resident John 20260407).
4. Do not mutate non-tagged records.
5. Stop the run immediately if tenant mismatch is detected.

## Data Retention

- Keep test records for audit review.
- Maintain clear tag fields to allow filtered reporting.
- Run periodic review scripts for stale QA data older than policy threshold.

## Guardrails

- Block destructive operations in helper utilities by default.
- Require explicit allow-list for endpoints that perform update operations.
- Require authenticated role checks before each write test step.
