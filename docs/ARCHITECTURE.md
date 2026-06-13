# Architecture

## High-Level Architecture

LedgerHome is a role-based property operations app delivered as an Expo / React Native Web frontend backed by Supabase.

High-level flow:

`User -> Vercel-hosted Expo web app -> Supabase Auth -> Supabase Postgres / Storage -> RLS-filtered data back to UI`

The same backend supports two experiences:

- **Admin** for property operations and record management
- **Tenant** for resident-facing visibility and self-service workflows

## Application Roles

### Admin

Admin users can manage the demo portfolio across:

- properties
- units
- tenants
- maintenance workflows
- rent and payment records
- documents
- notifications

### Tenant

Tenant users are restricted to their own linked record and can access:

- their account summary
- amount owed and payment history
- maintenance requests and updates
- lease and document context
- notifications and message flows

## Core Modules

- Authentication
- Property management
- Tenant management
- Maintenance requests
- Utility / posted charge support
- Ledger and payment records
- Tenant scorecard
- Notifications and communication

## Data Flow

Typical request flow:

1. A user signs in through Supabase Auth.
2. The app receives an authenticated session.
3. `AuthProvider` and `AccessProvider` resolve the current role and tenant linkage.
4. Frontend helpers query Supabase using the authenticated session.
5. Row Level Security policies constrain what rows are returned.
6. The UI renders the admin or tenant dashboard and workflow screens.

This allows both sides of the app to operate on the same persisted records without duplicating state models.

## Frontend Architecture

### Framework

- Expo
- React Native Web
- TypeScript
- Expo Router

### Route structure

Root routes:

- `app/index.tsx`: public entry screen
- `app/_layout.tsx`: provider composition and route guards
- `app/auth/*`: sign-in and password flows
- `app/legal/*`: legal screens

Role route groups:

- `app/(admin)`: admin routes
- `app/(tenant)`: tenant routes

### Provider stack

Defined in `app/_layout.tsx`:

1. `AuthProvider`
2. `DemoRoleProvider`
3. `AccessProvider`
4. `PrototypeProvider`
5. `MasterDataProvider`
6. `NotificationsProvider`

### Provider responsibilities

`AuthProvider`

- Supabase session boot
- sign-in and sign-out
- password reset and update flows

`AccessProvider`

- current app role
- tenant linkage resolution
- protected-route targeting
- access-state messaging

`MasterDataProvider`

- neighborhoods
- properties
- units
- tenants
- admin create/update flows

`NotificationsProvider`

- stored notifications
- derived reminders
- tray / banner state

## Backend / Data Architecture

### Supabase services

- Supabase Auth
- Supabase Postgres
- Supabase Storage

### Main tables

Primary persisted entities include:

- neighborhoods
- properties
- property images
- units
- tenants
- tenant profiles
- leases
- documents
- rent charges
- rent payments
- maintenance requests
- maintenance updates
- contact requests
- notifications
- user profiles
- user workspaces

### Storage

Storage buckets are used for:

- property images
- maintenance images
- lease and document uploads

### Schema management

The repo includes:

- `supabase/schema.sql`
- incremental migrations under `supabase/migrations/`
- a demo seed file for the public recruiter-safe environment

## Deployment Architecture

Current public demo deployment path:

- GitHub hosts source control
- Vercel hosts the Expo static web build
- Supabase hosts authentication, database, and storage

GitHub Actions can be added later for validation, but they are not a required part of the current public demo runtime.

## Production Considerations

Areas that matter for a fuller production build:

- stronger automated error handling and recovery paths
- stricter environment separation
- clearer operational monitoring
- formal audit logging
- broader automated test coverage
- hardened notification and upload lifecycle behavior
- future native mobile packaging and distribution

## Demo Layer Note

The public repo still contains a demo/sample compatibility layer to support portfolio-safe demonstrations and fallback behaviors.

That layer is useful for presentation and development safety, but the intended application shape is still a Supabase-backed operational system with role-aware access and shared persisted state.
