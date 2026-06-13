# Engineering Decisions

This file documents the decisions that shaped the public LedgerHome build. The point is not to claim every choice was perfect. The point is to show the reasoning path, the tradeoffs, and the fact that the project was intentionally engineered rather than assembled blindly.

## Decision 1: Create a Separate Sanitized Supabase Project

### Problem

The original app evolved around a private, client-oriented backend context. That made the product shape useful, but it also made the raw environment inappropriate for a public portfolio demo.

### Options considered

1. Reuse the existing Supabase project with restricted demo users
2. Create a separate sanitized Supabase project

### Decision

Create a separate sanitized Supabase project.

### Reason

Even with RLS enabled, a public portfolio demo should minimize blast radius and avoid any dependency on private operational data. I did not want the public version to rely on “the policies are probably good enough” as the only security story.

### Tradeoff

- duplicate schema work
- separate demo auth users
- seed-data preparation
- deployment reconfiguration

### Outcome

The public demo is isolated from private data and safe to share with recruiters, reviewers, and public hosting platforms.

## Decision 2: Use SQL Migrations and Seed Data Instead of Manual Demo Setup

### Problem

A live demo is only useful if it can be recreated consistently. Manual database setup would have made the project fragile and hard to explain.

### Options considered

1. Manually recreate the demo backend in the dashboard
2. Keep the database setup in version-controlled SQL

### Decision

Use a schema file, curated migrations, and a dedicated demo seed file.

### Reason

I wanted the public build to reflect a real engineering workflow:

- schema under version control
- migrations documented
- demo seed reproducible

This makes the project easier to review and much easier to reset or hand off.

### Tradeoff

The migration history needed extra care because it came from a project that had evolved over time rather than from a clean greenfield demo setup.

### Outcome

The public repo now documents not just the code, but the data bootstrap path as well.

## Decision 3: Deploy the Expo Web Version to Vercel

### Problem

The project started as an Expo / React Native app. For recruiter review, I needed the fastest path to a live, clickable, no-install demo.

### Options considered

1. Keep it mobile-only
2. Publish only a demo video
3. Export the web build and deploy it

### Decision

Deploy the Expo web build to Vercel.

### Reason

This gave the best tradeoff between realism and accessibility:

- live product interaction
- no device install needed
- easy GitHub integration
- simple environment variable management

### Tradeoff

React Native Web is not identical to native mobile behavior, so I needed to be careful about auth redirects, environment setup, and web export validation.

### Outcome

The project became recruiter-friendly without needing a native distribution flow.

## Decision 4: Use Environment Variables Rather Than Hardcoded Project Configuration

### Problem

A public demo cannot safely hardcode backend values or assume one environment forever.

### Options considered

1. Keep the current project values in code
2. Move all deploy-sensitive values into environment configuration

### Decision

Use environment variables for the public runtime.

### Reason

This was necessary for:

- local vs deployed separation
- safe public repo sharing
- Vercel deployment
- switching between demo environments without changing app code

### Tradeoff

It adds one more failure surface: environment misconfiguration. But that is a normal and acceptable engineering tradeoff.

### Outcome

The deployment became portable and safer to share.

## Decision 5: Add CI Checks Before Calling the Repo Portfolio-Ready

### Problem

A project that only works on one machine is not really ready to present as an engineering artifact.

### Options considered

1. Rely on manual local testing only
2. Add a lightweight but real CI workflow

### Decision

Add GitHub Actions checks for lint, typecheck, tests, and web export.

### Reason

The CI setup exposed build and configuration issues that were not visible during local development. Resolving these issues improved the reliability of the public demo and clarified the difference between local, CI, and deployed environments.

### Tradeoff

CI introduces more moving parts and initially creates friction because the first runs usually fail on assumptions that local development hid.

### Outcome

The repo now has a visible validation story that recruiters can trust more than screenshots.

## Decision 6: Keep Real Payment Processing Out of Scope

### Problem

The app includes rent and payment workflows, but introducing real payments would have expanded the scope dramatically.

### Options considered

1. Simulate or partially fake a real payment provider
2. Keep payment posting operational and treat processor integration as future work

### Decision

Keep Stripe and real payment processing out of scope for the public demo.

### Reason

I did not want to create a misleading “payment-ready” story when the real value of the project is operations workflow, role-aware data handling, and product structure.

### Tradeoff

The demo shows operational payment state rather than a true end-to-end payment product.

### Outcome

The scope stayed honest and focused.

## Decision 7: Use Public Demo Credentials with Fictional Data

### Problem

A live demo is much less useful if recruiters need to request access manually, but public credentials increase exposure.

### Options considered

1. Hide access and require manual credential sharing
2. Publish demo credentials against a sanitized environment

### Decision

Use public demo credentials tied only to fake data.

### Reason

For a recruiter-facing portfolio piece, ease of review matters. The key requirement was making that convenience safe by keeping the environment sanitized and isolated.

### Tradeoff

Public demo credentials are not production-grade security. They are a portfolio-review convenience.

### Outcome

The app is easy to try without exposing anything sensitive.

## Decision 8: Treat AI as an Accelerator, Not a Substitute for Ownership

### Problem

This project went through many iterations, workflow changes, and public-release hardening steps. AI could speed up implementation, but only if the direction stayed explicit and the outputs were reviewed critically.

### Options considered

1. Use AI loosely and accept whatever comes back
2. Use AI as a guided engineering partner with tight review and correction loops

### Decision

Use AI as a force multiplier while keeping product and engineering ownership in the loop.

### Reason

The value was not in generating code fastest. The value was in:

- reasoning about tradeoffs
- narrowing scope safely
- iterating on workflow behavior
- documenting and validating decisions
- catching regressions quickly

### Tradeoff

This approach takes more discipline than passive code generation. It requires knowing what to ask for, what to reject, and when a “working” change is still wrong.

### Outcome

The final public demo reflects directed engineering judgment, not blind automation.

## Decision 9: Preserve the Real Workflow Shape Instead of Replacing Everything with Static Mock Data

### Problem

A portfolio demo can easily become a polished fake if all real backend behavior is removed.

### Options considered

1. Replace the runtime with mostly mocked demo data
2. Keep the actual Supabase-backed application shape and sanitize the environment

### Decision

Keep the real application structure and use a separate sanitized backend.

### Reason

I wanted recruiters to evaluate:

- real auth wiring
- real role separation
- real persisted workflow state
- real deployment concerns

not just a front-end simulation.

### Tradeoff

This made the release process harder because backend setup, redirects, seeds, and policies all had to be real.

### Outcome

The final demo is more credible as an engineering artifact.

## Decision 10: Document the Journey, Not Just the Final State

### Problem

A finished repo can look cleaner than the work that produced it. That can hide the judgment, debugging, and iteration that actually matter.

### Decision

Document both the final architecture and the decisions, failures, and fixes that led to it.

### Reason

I wanted the repo to show:

- problem-solving
- iteration discipline
- deployment hardening
- debugging maturity
- product ownership

### Outcome

The documentation now explains not only what LedgerHome is, but how it became safe and reviewable as a public project.
