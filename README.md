# LedgerHome

LedgerHome is a property operations workflow app built with Expo, React Native, TypeScript, and Supabase. It demonstrates how one system can support both the internal operations side of rental management and the tenant-facing side of the same workflow.

LedgerHome was originally built as a rental property management MVP and later productionized into a sanitized public demo. The public version uses a separate Supabase project, demo-only auth users, seed data, environment-based configuration, and deployment documentation to demonstrate the product without exposing private client data.

## Overview

The app is organized around two role-based experiences:

- an **admin portal** for managing properties, units, tenants, rent, repairs, documents, and notifications
- a **tenant portal** for viewing account status, submitting maintenance requests, reviewing records, and following communication threads

The goal was not just to build screens, but to model an operational workflow where the admin and tenant views read from the same backend state with different permissions and UI framing.

## Problem

Property operations tend to fragment across spreadsheets, text messages, documents, and ad hoc tracking. That creates predictable problems:

- rent status is hard to reconcile
- maintenance requests are easy to miss or lose context on
- tenant records and document history become scattered
- internal workflows and resident-facing workflows drift apart

I wanted a compact workflow app that treats these as connected operational problems instead of separate tools.

## Solution

LedgerHome combines an admin workspace and a tenant workspace on top of one Supabase-backed data model. The app supports property records, unit and tenant management, maintenance requests, rent tracking, notifications, documents, and contact flows through a shared backend with role-aware access.

## Live Demo

- Live app: https://ledgerhome-property-ops.vercel.app
- Demo admin login: `demo-admin@ledgerhome-demo.com`
- Demo admin password: `Demo@123`
- Demo tenant login: `alex.carter@ledgerhome-demo.com`
- Demo tenant password: `Alex@123`
- The public demo uses fake records only and runs on a separate sanitized Supabase project

## Key Features

### Admin workflows

- property and unit management
- tenant onboarding and tenant record management
- rent charge visibility and manual payment posting
- maintenance request triage and status updates
- document and lease record tracking
- tenant score visibility
- notification center and message follow-up

### Tenant workflows

- tenant authentication and role-based access
- account summary and amount owed visibility
- maintenance request submission and update tracking
- communication with admin
- lease, document, and property visibility
- in-app reminders and status tracking

## Tech Stack

- Expo
- React Native Web
- TypeScript
- Expo Router
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Row Level Security
- React Hook Form
- Zod
- Vercel
- GitHub Actions

## Architecture

The app is structured around protected admin and tenant route groups, shared provider layers, and backend helper modules that mediate reads and writes to Supabase.

High-level references:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md)
- [docs/SCREEN_TO_DATA_MAP.md](docs/SCREEN_TO_DATA_MAP.md)
- [docs/DATABASE.md](docs/DATABASE.md)

## Security and Data Isolation

This public repo is intended to demonstrate the architecture and workflow shape of the product, not reuse any private deployment.

Key constraints for the public version:

- separate Supabase demo project only
- demo auth users only
- fake demo records only
- public anon key only in frontend configuration
- no service-role key in frontend code
- tenant access depends on user-to-tenant linkage and row-level isolation

Security notes:

- [SECURITY.md](SECURITY.md)
- [docs/AUTH_RLS.md](docs/AUTH_RLS.md)

## Demo Database

The recommended demo backend is a brand-new Supabase project seeded with fake records only.

Current demo dataset shape:

- Demo Portfolio Admin
- Alex Carter
- Harbor View Apartments
- 100 Demo Street, Austin, TX
- Unit 2A and Unit 3B
- one active lease
- one current rent charge
- one prior payment
- one maintenance request and update
- one document record
- several fake notifications

Demo setup reference:

- [docs/SUPABASE_DEMO_SETUP.md](docs/SUPABASE_DEMO_SETUP.md)
- [docs/DEMO_WALKTHROUGH.md](docs/DEMO_WALKTHROUGH.md)

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-demo-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-demo-anon-key
```

Run locally:

```bash
npm run start
npm run web
```

Export a static web build:

```bash
npm run export:web
```

## Testing

This repo does not yet include a full automated test suite. Current validation is based on:

- local web smoke testing
- role-based login checks
- admin and tenant workflow checks
- static export verification

Useful commands:

```bash
npm run web
npm test
npm run lint
npm run typecheck
npm run export:web
```

For screen-to-data and workflow tracing, see:

- [docs/SCREEN_TO_DATA_MAP.md](docs/SCREEN_TO_DATA_MAP.md)

Testing notes:

- [docs/TESTING.md](docs/TESTING.md)

## Deployment

The current public deployment path is:

- Expo static web export
- Vercel hosting
- separate demo Supabase project

Recommended Vercel settings:

- Framework preset: `Other`
- Build command: `npm run export:web`
- Output directory: `dist`

Required environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Deployment flow:

1. push the repo to GitHub
2. import it into Vercel
3. configure the two public environment variables
4. deploy
5. add the deployed URL to Supabase Auth redirect settings
6. test admin and tenant login again

Deployment guide:

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/CI_CD.md](docs/CI_CD.md)

## Engineering Notes

Some parts of the app were originally built for a private MVP context and later cleaned for public release. The public version keeps the real application shape while swapping in:

- sanitized branding
- fake sample records
- separate demo infrastructure
- setup documentation for a clean public deployment path

That conversion work was important because it forced the codebase to become more explicit about environment configuration, auth linkage, data ownership, and demo safety.

Supporting notes:

- [docs/DATABASE.md](docs/DATABASE.md)
- [docs/AUTH_RLS.md](docs/AUTH_RLS.md)
- [docs/DEMO_WALKTHROUGH.md](docs/DEMO_WALKTHROUGH.md)
- [docs/TESTING.md](docs/TESTING.md)
- [docs/CI_CD.md](docs/CI_CD.md)
- [docs/ENGINEERING_DECISIONS.md](docs/ENGINEERING_DECISIONS.md)
- [docs/BUILD_NOTES.md](docs/BUILD_NOTES.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## Limitations

This is a portfolio-ready demo, not a finished commercial SaaS product.

Current limitations:

- no Stripe or real payment processor integration
- no push notification infrastructure
- no production-grade analytics/reporting layer
- limited automated testing coverage
- operational flows are strong, but some surfaces still reflect MVP-era tradeoffs
- the web demo is intended for evaluation, not for production property operations

## Future Improvements

- billing and payment processor integration
- stronger automated test coverage
- richer reporting and analytics
- better web-specific upload UX
- improved notification lifecycle tooling
- deeper admin reporting dashboards
- native mobile packaging and distribution

## Why this repo exists

I use LedgerHome to show product-minded engineering work: workflow design, role-based systems, Supabase integration, access control, operations UX, and the ability to turn a private working app into a sanitized public demo without leaking data or business context.
