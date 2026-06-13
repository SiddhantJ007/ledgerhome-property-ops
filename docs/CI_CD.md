# CI/CD Pipeline

## Purpose

The CI pipeline validates the project before deployment. For this public version of LedgerHome, the goal is straightforward: catch obvious regressions before they reach the live demo.

## Workflow Trigger

The current workflow runs on:

- push to `main`
- pull requests

## CI Steps

1. Checkout repository
2. Set up Node.js
3. Install dependencies
4. Run linting
5. Run TypeScript checks
6. Run tests
7. Build the Expo web app

## Why These Checks Matter

- lint catches style and quality issues
- typecheck catches TypeScript errors
- tests catch behavior regressions
- build verifies deployability

For this repo, the web export step is especially important because the live demo depends on Expo static web output, not only local development mode.

## Deployment Flow

GitHub push -> CI checks -> Vercel deployment

In practice, Vercel remains responsible for hosting the public web demo, while GitHub Actions provides the validation layer that makes the deployment more trustworthy.

## Common CI Issues Encountered

The CI setup exposed build and configuration issues that were not visible during local development. Resolving these issues improved the reliability of the public demo and clarified the difference between local, CI, and deployed environments.

Examples of the kinds of issues this setup is meant to catch:

- dependency mismatch
- missing environment variable
- TypeScript error
- Expo / Vercel build mismatch
- test environment issue

## How They Were Resolved

At a high level, the resolution strategy was:

- make environment assumptions explicit
- add missing scripts such as `typecheck` and `build`
- keep test targets small and stable
- validate the Expo web export in CI, not only locally
- document the demo backend setup so deployment is reproducible

## Current Workflow File

The current GitHub Actions workflow lives at:

- `.github/workflows/ci.yml`

## Future Improvements

- preview deployment checks
- E2E tests before merge
- coverage threshold
- branch protection
- separate staging vs production validation rules
