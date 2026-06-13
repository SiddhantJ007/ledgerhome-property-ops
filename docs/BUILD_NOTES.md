# Build Notes

## Goal

Productionize LedgerHome into a safe, public, live demo that still reflects the real application structure.

That meant the job was not only to make the app run. It was to make it presentable, reproducible, isolated from private data, and reviewable by someone who has never seen the original working context.

## Starting Point

The starting point was an existing property operations app with:

- a working Supabase-backed backend shape
- admin and tenant workflows
- iterative product decisions already embedded in the app
- private-context assumptions that were fine for internal use but not fine for public release

This is an important distinction. I was not starting from a blank template. I was taking a real evolving application and forcing it through the harder engineering step: turning it into a safe public artifact without flattening it into a fake mock.

## My Working Style on This Project

I did not treat AI as a replacement for thinking. I used it the way I think a strong engineer should use it:

- to accelerate implementation
- to inspect code faster
- to test assumptions quickly
- to produce drafts that still needed judgment
- to help turn product intent into concrete technical changes

But the direction stayed deliberate. The important part was not “generate code.” The important part was:

- define the problem clearly
- isolate the impact area
- preserve what already works
- make the smallest safe change
- validate the result
- document the reasoning

That is how most of the work was approached: tight iteration loops, explicit constraints, and constant attention to not breaking working behavior.

## Work Completed

- created a sanitized public repository
- removed or replaced private/demo-unsafe references
- created a separate Supabase demo project strategy
- generated and executed schema / migration setup guidance
- added demo auth users
- seeded fake demo data
- deployed the Expo web app to Vercel
- configured Supabase URL settings for deployed auth behavior
- added CI, testing, and build validation
- documented architecture, security, deployment, auth/RLS, database design, and troubleshooting decisions

## AI Assistance Disclosure

Codex was used to accelerate implementation, generate boilerplate, debug CI issues, inspect the repo, patch SQL and configuration files, and draft documentation.

That said, the project direction, tradeoff decisions, scoping, iteration control, and release hardening decisions stayed under my control.

## Engineering Ownership

I reviewed generated changes, constrained the scope of edits, validated SQL assumptions, configured Supabase and Vercel manually, verified auth and routing behavior, checked deployment/runtime issues, and documented the tradeoffs behind the public release.

The important part was not just accepting suggestions. It was knowing:

- what the intended behavior should be
- where a change was risky
- when a “working” result was still wrong
- when to keep scope small instead of redesigning
- when infrastructure isolation mattered more than convenience

## Key Issues Encountered

### Public demo data isolation

The private app context could not simply be exposed with “restricted” users. That required a shift from access-control-only thinking to isolation thinking.

### Supabase redirect and site URL behavior

What works locally does not always work once deployed. Redirect configuration, project activity state, and public URL alignment mattered more than they first appeared.

### CI and build inconsistencies

As expected, the first CI-oriented testing pass surfaced issues that local development had hidden:

- test runner compatibility
- version mismatches
- brittle test assumptions
- missing package scripts

This was useful, not annoying. It forced the repo into a more honest and reproducible state.

### Environment variable setup

Separating local, CI, and deployed configuration was necessary for public release. That also made the failure modes clearer.

### Auth behavior after deployment

The app’s real auth behavior depended on correct Supabase configuration, correct redirect URLs, correct demo users, and correct `user_profiles` linkage. That made deployment verification an actual engineering task rather than a checkbox.

## What I Learned

- the difference between a locally working app and a publicly deployable app is larger than it looks
- a separate demo database is often the right answer even when RLS exists
- migrations and seed data are part of the product story, not just backend plumbing
- CI/CD setup is valuable precisely because it surfaces hidden assumptions
- deployment safety depends on infrastructure discipline as much as application code

## Why This Repo Matters to Me

What I value most in this build is not one screen or one feature. It is the full conversion:

- private app -> public repo
- evolving MVP -> recruiter-safe live demo
- local workflow -> documented, testable deployment path

That process is where a lot of real engineering judgment lives. It is also where AI is most useful when used well: not to replace ownership, but to move faster while staying in control of the system.

## Final Note

If someone reads this repo closely, I want them to understand that the project was not just coded. It was iterated, constrained, debugged, hardened, and explained. That is the real work I wanted this public version to show.
