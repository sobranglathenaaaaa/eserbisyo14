# QA Decision Record

Date: 2026-04-07

## Chosen Defaults

1. Shared-environment safety mode: Strict namespaced test data + no hard delete operations.
2. Credentials strategy: Fixed seeded accounts per role for deterministic runs.
3. Completion gate: Two consecutive successful nightly runs before phase sign-off.

## Why These Defaults

- Shared production-like data needs maximum operational safety.
- Fixed accounts reduce flakiness and simplify access management.
- Consecutive nightly pass requirement reduces false confidence from single-run success.
