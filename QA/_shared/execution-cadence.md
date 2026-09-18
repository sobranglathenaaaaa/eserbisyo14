# Execution Cadence

## Pull Request Pipeline

Run smoke tests only:

1. Resident submits document request.
2. Admin approves request.
3. Staff marks request completed.
4. Resident verifies completion notification.

## Nightly Pipeline

Run full role suites:

1. Resident phase coverage set.
2. Admin phase coverage set.
3. Staff phase coverage set.
4. Cross-role workflow suite.

## Release Gate

- Require two consecutive green nightly runs for phase completion.
- Any critical regression blocks release until fixed and re-validated.
