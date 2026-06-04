# LedgerHome

LedgerHome is a mobile property operations workflow app built to demonstrate role-based rental operations in a realistic but privacy-safe portfolio project.

It shows how a small property management workflow can be handled across admin and tenant-style experiences in one app: rent tracking, maintenance requests, messages, notifications, records, and document access.

## Why I built it

I built LedgerHome to explore how operational software feels when the same backend supports two very different user experiences:

- an admin side focused on property operations, collections, status updates, and records
- a tenant side focused on dues, maintenance, documents, and communication

The project is meant to show product thinking, workflow design, and full-stack integration rather than just isolated screens.

## Key features

- role-based admin and tenant flows
- Supabase-backed authentication and data access
- property, unit, and tenant record management
- rent charge tracking and manual payment posting
- maintenance request submission and status updates
- document and lease record handling
- in-app notifications and reminder flows
- contact/message threads between tenant and admin
- status tracking across operations workflows

## Tech stack

- Expo
- React Native
- TypeScript
- Expo Router
- Supabase

## Architecture overview

LedgerHome uses Expo Router for app structure and Supabase as the backend for authentication, app records, storage, and role-aware data access.

Main app areas:

- `app/(admin)`: admin workflows
- `app/(tenant)`: tenant workflows
- `components`: shared UI building blocks
- `lib`: backend helpers and operational logic
- `providers`: auth, access, master data, and notifications
- `supabase`: schema and migrations

## Workflow overview

### Admin workflow

An admin can:

- create and manage properties
- manage units and occupancy
- add and update tenants
- record rent payments
- review balances and statuses
- review and update maintenance requests
- manage records and documents
- link login access for tenants

### Tenant workflow

A tenant can:

- sign in to a tenant-only experience
- view dues and payment status
- review lease and account context
- submit maintenance requests
- view repair progress
- access records and documents
- receive reminders and in-app notifications

## Supabase role in the project

Supabase is used for:

- authentication
- role-based access flows
- tenant/property/unit/payment/maintenance records
- file storage for app documents and uploads
- notification and workflow state

The public version keeps the Supabase structure visible so the repo still demonstrates how the app is wired, but no private deployment values are included.

## Setup

Install dependencies:

```bash
npm install
```

Start the Expo app:

```bash
npm run start
```

Run lint and typecheck:

```bash
npm run lint
npx tsc --noEmit
```

## Environment variables

Create a local `.env` file with:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Sample data and privacy note

This public repo uses sanitized demo/sample content only.

Any demo tenants, properties, addresses, messages, records, or contact details in this repo are fake examples included to illustrate workflows. No real client, tenant, company, or deployment data should be committed to the public repository.

## What I learned

This project pushed me on:

- structuring role-based mobile workflows
- keeping admin and tenant experiences aligned to the same backend truth
- handling stateful operational flows like rent, notifications, and repairs
- balancing demo/sample data with production-style backend structure
- designing for workflow clarity instead of only screen polish

## Future improvements

- stronger automated test coverage around workflow edge cases
- cleaner public demo seed path separate from live backend mode
- optional self-serve payment integration
- richer document categorization and activity history
- improved analytics / portfolio reporting surfaces
