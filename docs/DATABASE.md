# Database Design

## Overview

LedgerHome uses Supabase Postgres with a sanitized demo database. The database is the source of truth for portfolio records, tenant records, rent state, repair workflows, notifications, and user linkage.

The public version is backed by a dedicated demo Supabase project rather than a reused private backend.

## Why a Separate Demo Database

The separate demo database is an intentional engineering decision, not just a presentation convenience.

Even with Row Level Security enabled, a public portfolio demo should not depend on access rules alone to protect private operational data. Using a separate sanitized Supabase project reduces blast radius and makes the deployment safer to share, test, and document.

## Core Tables

### `user_profiles`

Purpose:

- maps authenticated users to app roles
- links tenant users to a tenant record

Key columns:

- `id`
- `role`
- `tenant_id`
- `display_name`
- `email`

Access pattern:

- admin reads and manages role-linked demo users
- tenant is limited to their own linked profile context

### `neighborhoods`

Purpose:

- stores flexible location grouping for properties

Key columns:

- `id`
- `state_code`
- `name`
- `city`

Relationships:

- one neighborhood can have many properties

Access pattern:

- admin manages
- tenant reads only through their assigned property relationship

### `properties`

Purpose:

- stores top-level property records

Key columns:

- `id`
- `neighborhood_id`
- `name`
- `address`
- `status`

Relationships:

- one property has many units
- one property can have documents, images, charges, and maintenance context

Access pattern:

- admin manages
- tenant reads assigned property context only

### `units`

Purpose:

- stores unit-level occupancy and rent context

Key columns:

- `id`
- `property_id`
- `label`
- `monthly_rent`
- `occupancy_status`
- `tenant_id`

Relationships:

- unit belongs to one property
- unit may reference one active tenant

Access pattern:

- admin manages
- tenant reads assigned unit only

### `tenants`

Purpose:

- stores resident identity and assignment context

Key columns:

- `id`
- `unit_id`
- `full_name`
- `email`
- `phone`
- `move_in_date`
- `lease_end_date`
- `status`

Relationships:

- tenant can link to profile, lease, rent charges, payments, maintenance, notifications, and documents

Access pattern:

- admin manages all demo tenant records
- tenant reads only their own record

### `tenant_profiles`

Purpose:

- stores secondary resident details

Key columns:

- `tenant_id`
- `preferred_contact_method`
- `emergency_contact_name`
- `emergency_contact_phone`

Access pattern:

- admin manages
- tenant reads own profile context

### `leases`

Purpose:

- stores lease relationships and rent/deposit context

Key columns:

- `tenant_id`
- `property_id`
- `unit_id`
- `start_date`
- `end_date`
- `monthly_rent`
- `security_deposit`
- `status`

Access pattern:

- admin manages
- tenant reads own lease

### `documents`

Purpose:

- stores document metadata and file linkage

Key columns:

- `tenant_id`
- `property_id`
- `unit_id`
- `lease_id`
- `category`
- `title`
- `file_url`
- `status`

Access pattern:

- admin manages
- tenant reads own documents only

### `rent_charges`

Purpose:

- stores rent and charge lifecycle state

Key columns:

- `tenant_id`
- `property_id`
- `unit_id`
- `charge_type`
- `due_date`
- `expected_amount`
- `collected_amount`
- `status`

Relationships:

- one charge can have many payment rows

Access pattern:

- admin manages and posts operational updates
- tenant reads own charges

### `rent_payments`

Purpose:

- stores posted payment records

Key columns:

- `charge_id`
- `tenant_id`
- `property_id`
- `unit_id`
- `amount`
- `payment_date`
- `method`
- `status`

Access pattern:

- admin manages
- tenant reads own payment history

### `maintenance_requests`

Purpose:

- stores repair requests and their current workflow state

Key columns:

- `tenant_id`
- `property_id`
- `unit_id`
- `title`
- `type`
- `priority`
- `status`
- `summary`

Access pattern:

- admin manages across the demo portfolio
- tenant can create and read own requests

### `maintenance_updates`

Purpose:

- stores status changes, notes, and cost updates for a request

Key columns:

- `request_id`
- `status`
- `note`
- `updated_by`
- `cost`

Access pattern:

- admin manages
- tenant reads updates on their own requests

### `contact_requests`

Purpose:

- stores tenant-admin message threads / inquiry records

Key columns:

- `tenant_id`
- `property_id`
- `unit_id`
- `subject`
- `message`
- `channel`
- `status`

Access pattern:

- admin manages
- tenant reads own thread and can create their own request

### `notifications`

Purpose:

- stores in-app notifications and workflow cues

Key columns:

- `tenant_id`
- `user_profile_id`
- `role_target`
- `type`
- `title`
- `body`
- `priority`
- `route_target`
- `read_at`
- `dismissed_at`

Access pattern:

- admin sees admin-targeted demo notifications
- tenant sees own tenant-targeted notifications

## Entity Relationship Summary

Conceptually:

- admins manage the demo portfolio
- properties contain units
- tenants are assigned to units
- leases, payments, documents, notifications, and repairs hang off the tenant/property/unit context
- maintenance requests belong to a tenant and property context
- charge and payment records belong to tenant/property/unit context

## Migrations

Version-controlled SQL lives in:

- `supabase/schema.sql`
- `supabase/migrations/`

The repo uses a base schema plus follow-on migrations to evolve auth, storage, notifications, and workflow behavior.

## Seed Data

Reproducible demo data lives in:

- `supabase/demo_seed.sql`

That seed file expects:

- a brand-new demo project
- demo auth users to exist already
- fake records only

## Resetting the Demo Database

Safe high-level reset path:

1. create a new Supabase demo project
2. run `supabase/schema.sql`
3. run the curated migration sequence
4. create the demo auth users
5. run `supabase/demo_seed.sql`

Detailed setup notes:

- [SUPABASE_DEMO_SETUP.md](SUPABASE_DEMO_SETUP.md)

## Data Integrity Rules

Examples of the intended rules in this model:

- a property belongs to a neighborhood
- a unit belongs to a property
- a tenant belongs to a unit
- a lease belongs to tenant/property/unit context
- a rent payment belongs to a rent charge
- a maintenance update belongs to a maintenance request
- a user profile must resolve to a valid application role

Operationally, the app depends on correct linkage between:

- Supabase Auth user
- `user_profiles`
- tenant record, when the user is a tenant

That linkage is what allows authentication, tenant scoping, and role-based routing to work together.
