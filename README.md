# LedgerHome

LedgerHome is an Expo + React Native property operations workflow app that demonstrates how one Supabase-backed system can support both admin and tenant experiences.

The public version is set up for a recruiter-safe demo: separate demo infrastructure, fake records only, and no connection to any private deployment.

## What the app demonstrates

- role-based admin and tenant workflows
- Supabase-backed auth and access control
- property, unit, and tenant records
- rent charges and manual payment posting
- maintenance request submission and updates
- lease and document tracking
- in-app notifications and contact threads
- status-driven operational workflows across one shared backend

## Why I built it

I built LedgerHome to explore workflow software from both sides of the product:

- the admin side, where the focus is operations, rent collection, maintenance coordination, and records
- the tenant side, where the focus is dues, maintenance, documents, and communication

The project is intended to show product thinking, workflow design, backend wiring, and role-aware mobile/web architecture.

## Tech stack

- Expo
- React Native
- TypeScript
- Expo Router
- Supabase
- React Hook Form
- Zod

## App structure

- `app/(admin)`: admin workflows
- `app/(tenant)`: tenant workflows
- `app/auth`: sign-in and password reset flows
- `components`: shared UI building blocks
- `providers`: auth, access, data, and notifications
- `lib`: backend helpers and operational logic
- `supabase`: schema, migrations, and demo seed assets

## Demo architecture

The recommended public demo architecture is:

- this public repo as the frontend source
- a brand-new Supabase demo project
- fake demo users only
- fake demo portfolio data only
- Expo static web export
- Vercel hosting

Do not connect this public repo to any private or production Supabase project.

## Demo credentials

Create your own demo users in the new Supabase project. Suggested placeholders:

- Admin: `demo-admin@ledgerhome-demo.com`
- Tenant: `alex.carter@ledgerhome-demo.com`

Passwords should be created in Supabase Auth and should never be committed.

## Local setup

Install dependencies:

```bash
npm install
```

Create a local `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-demo-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-demo-anon-key
```

Run the app locally:

```bash
npm run start
npm run web
```

Export static web output:

```bash
npm run export:web
```

## Supabase demo setup

1. Create a new Supabase project for demo use only.
2. Apply `supabase/schema.sql` first.
3. Run the numeric migrations in `supabase/migrations/` in order, but skip `0008_seed_user_profiles.sql` because it is a legacy seed migration and not part of the public demo bootstrap.
4. Create two auth users in Supabase Auth:
   - `demo-admin@ledgerhome-demo.com`
   - `alex.carter@ledgerhome-demo.com`
5. Confirm the required storage buckets exist after the storage migrations run:
   - `property-images`
   - `maintenance-images`
   - `lease-documents`
6. Run the seed file:
   - `supabase/demo_seed.sql`
7. Set the site URL and redirect URLs in Supabase Auth for your local and deployed web app.

## Demo dataset

The demo seed is designed around fake records only:

- Admin: Demo Portfolio Admin
- Tenant: Alex Carter
- Property: Harbor View Apartments
- Address: 100 Demo Street, Austin, TX
- Units: Unit 2A and Unit 3B
- One active lease
- One current rent charge
- One prior payment
- One maintenance request and update
- One document record
- Two tenant-facing notifications and one admin-facing notification

## Vercel deployment

Recommended Vercel settings:

- Framework preset: `Other`
- Build command: `npm run export:web`
- Output directory: `dist`

Environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Deploy flow:

1. Push this public repo to GitHub.
2. Import it into Vercel.
3. Set the two public env vars to the demo Supabase project values.
4. Run the first deploy.
5. After deploy, add the Vercel URL to Supabase Auth redirect settings.
6. Re-test admin and tenant login in the deployed build.

## Local smoke test checklist

- install dependencies successfully
- app starts with `npm run web`
- auth screens render on web
- admin login works against the demo project
- tenant login works against the demo project
- property list loads
- tenant dashboard loads
- maintenance request list loads
- notifications render without runtime errors
- `npm run export:web` completes and creates `dist/`

## Deployment QA checklist

- no private env values committed
- `.env.example` contains placeholders only
- demo admin sees only fake demo records
- demo tenant sees only their own fake records
- maintenance flow works end to end
- rent and payment views load
- documents screen does not expose private files
- notification tray opens and renders
- password reset redirect uses the deployed domain
- no private company or tenant names appear anywhere in UI or docs

## Privacy note

This public repo is intended for portfolio demonstration only. Any sample names, addresses, records, or messages are fake examples created to show the workflow shape of the app.

## Future improvements

- add automated tests for role-specific workflows
- add a scripted one-command demo seed process
- add stronger web-specific QA coverage for upload flows
- add analytics/reporting surfaces for portfolio review
