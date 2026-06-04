# Architecture

## Overview

LedgerHome is an Expo Router application with two protected runtime branches:

- `Admin`: property operations and record management
- `Tenant`: resident-facing workflow access

The app is structured to demonstrate role-based operational flows backed by Supabase.

## Routing

Root:

- `app/index.tsx`: public entry screen
- `app/_layout.tsx`: provider composition and route guards
- `app/auth/*`: auth flows
- `app/legal/*`: legal screens

Role groups:

- `app/(admin)`: admin routes
- `app/(tenant)`: tenant routes

## Provider stack

Defined in `app/_layout.tsx`:

1. `AuthProvider`
2. `DemoRoleProvider`
3. `AccessProvider`
4. `PrototypeProvider`
5. `MasterDataProvider`
6. `NotificationsProvider`

## Responsibilities

### AuthProvider

Handles:

- Supabase session boot
- sign-in and sign-out
- password reset and update flows

### AccessProvider

Resolves:

- current app role
- current tenant linkage
- protected route target
- access-state messages when a user is authenticated but not linked correctly

### MasterDataProvider

Provides core operational records for:

- neighborhoods
- properties
- units
- tenants
- admin create/update flows

### NotificationsProvider

Provides:

- stored notifications
- derived rent reminders
- derived maintenance notifications
- in-app tray / banner state

## Backend shape

Primary persisted entities live in Supabase:

- neighborhoods
- properties
- units
- tenants
- leases
- documents
- rent charges and payments
- maintenance requests and updates
- contact requests
- notifications

Storage buckets are used for record/document and image uploads.

## Operational model

- Admin and tenant experiences read from the same persisted backend state.
- Rent and maintenance flows are surfaced differently by role, but share the same source records.
- Documents and uploads are stored in Supabase Storage.
- Notifications are a mix of stored and derived application events.

## Security model

Access control depends on:

- Supabase Auth
- `user_profiles`
- role-aware queries and policies
- tenant linkage for tenant-scoped data access

## Demo/sample layer

The repo still contains a sample/demo compatibility layer used to support portfolio-safe demonstrations and fallback flows.

That layer should be treated as example data support, not as a substitute for the main Supabase-backed runtime path.
