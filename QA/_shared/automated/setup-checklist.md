# Automated Setup Checklist

1. Install dependencies: npm install
2. Install browser binaries once: npx playwright install
3. Bootstrap deterministic QA accounts and generate QA/_shared/automated/.env.qa automatically: npm run qa:bootstrap
4. Ensure app is running at QA_BASE_URL.
5. Run smoke test with env loader: npm run qa:smoke:env
6. Run full suite with env loader: npm run qa:e2e:env
7. Open report: npx playwright show-report QA/reports/playwright-html

Alternative direct mode:

- Set QA_* vars in shell manually.
- Run smoke test: npm run qa:smoke
- Run full suite: npm run qa:e2e

## Notes

- Tests are designed to keep data for audit review.
- Every test-created record is tagged with QA_RUN timestamp.
