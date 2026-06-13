# Testing Strategy

## Testing Goals

The goal of the current test setup is to cover the parts of LedgerHome that are most important for a public demo and most likely to regress during cleanup or deployment work:

- verify authentication-related flows
- verify role-based UI behavior
- verify critical property and tenant workflow logic
- verify build stability
- prevent deployment regressions

I did not try to create a huge test suite for the sake of appearances. The better approach here was to add believable coverage around the app’s riskier public-demo surfaces and then pair that with clear manual QA expectations.

## Test Types

Current coverage is split across:

- unit tests
- component / interaction tests
- integration-style smoke checks through CI build/export
- manual QA checklists

## Automated Tests

Current automated coverage includes:

- tenant score calculation logic
- auth redirect helper behavior for web and native-style paths
- auth entry screen rendering
- role selection button behavior on the auth entry screen

Specifically, the current Jest suite checks:

- the login entry screen renders
- role selection buttons route to the expected login target
- redirect helpers generate correct URLs
- tenant scoring responds to overdue rent, repairs, and tenant status changes

These tests are intentionally modest, but they are tied to real app behavior and are useful for catching regressions after refactors or public-demo cleanup work.

## Manual QA Checklist

### Admin

- log in as admin
- view dashboard
- view properties
- view tenants
- review maintenance request
- view rent and posted charge records
- verify tenant scorecard visibility

### Tenant

- log in as tenant
- view assigned property and account summary
- view payment and lease context
- submit or review maintenance request flow
- confirm tenant cannot access admin-only screens

### Security

- invalid credentials fail
- tenant cannot see admin-only views
- no production data is visible
- environment variables are not hardcoded into the repo

## Running Tests Locally

Install dependencies:

```bash
npm install
```

Run checks:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## CI Validation

The GitHub Actions pipeline currently runs:

- dependency install
- linting
- TypeScript checks
- Jest tests
- Expo web export

That gives the repo a visible validation path for recruiters and also helps separate “it works on my machine” from “it can be built and validated in a clean environment.”

## Known Testing Gaps

- no full E2E browser suite yet
- no load testing yet
- no formal security testing yet
- no coverage threshold enforcement yet
- no Supabase-local automated integration environment yet

## Future Testing Improvements

- Playwright E2E tests
- Supabase local test environment
- RLS policy tests
- test coverage reporting
- seeded test-database reset flow

## Why This Approach

The point of this test setup was not to overengineer a demo repo. It was to put guardrails around the parts of the project that matter most:

- routing and role entry behavior
- operational scoring logic
- build and deploy stability

That is enough to make the repo feel engineered rather than staged, while still keeping the maintenance cost reasonable for a portfolio project.
