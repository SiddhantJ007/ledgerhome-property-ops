# Data Model

## Overview

LedgerHome uses a Supabase-backed domain model designed around shared operational state. The same underlying records drive the admin portal and the tenant portal, with role-aware access determining who can see or change what.

The public version keeps that application shape intact while replacing private data with a sanitized demo dataset.

## Core Entities

Primary application types are defined in `types/domain.ts`.

### Portfolio and occupancy

- `Neighborhood`
- `Property`
- `PropertyImage`
- `Unit`
- `Tenant`
- `TenantProfile`

### Lease and document records

- `Lease`
- `Document`

### Collections and charges

- `RentCharge`
- `RentPayment`
- `PropertyChargeConfig`
- `PropertyChargeBatch`
- `PropertyChargeBatchAllocation`

### Maintenance and workflow updates

- `MaintenanceRequest`
- `MaintenanceUpdate`
- `MaintenanceRecord`

### Messaging, notifications, and access

- `ContactRequest`
- `Notification`
- `UserProfile`
- `UserWorkspace`

## Relationship Summary

At a high level, the relationships are:

- `Neighborhood` -> many `Property`
- `Property` -> many `Unit`
- `Unit` -> zero or one active `Tenant`
- `Tenant` -> one `TenantProfile`
- `Tenant` -> many `RentCharge`
- `RentCharge` -> many `RentPayment`
- `Tenant` -> many `MaintenanceRequest`
- `MaintenanceRequest` -> many `MaintenanceUpdate`
- `Tenant` -> many `Document`
- `Lease` links tenant, property, and unit
- `UserProfile` links authenticated users to an app role and, for tenants, to a tenant record

## Runtime Model

The intended runtime source of truth is Supabase-backed data for:

- portfolio and master data
- tenant assignment and lease context
- rent charges and payment history
- maintenance workflow state
- contact and notification records
- document references and storage-backed uploads

There is still a compatibility/demo layer in the repo to support safe public presentation, but the application is designed around persisted backend state rather than static mock UI.

## Rent Cycle Model

The rent workflow is modeled around `rent_charges` and `rent_payments`.

General behavior:

- a current charge exists for the active billing period
- payment posting updates collected state against that charge
- status is derived from persisted values such as `expected_amount`, `collected_amount`, `due_date`, and `last_payment_date`
- upcoming reminders, pending state, and overdue state depend on stored charge data rather than one-off UI assumptions

This is important because both the admin collection view and the tenant account view depend on the same charge records.

## Maintenance Model

The maintenance flow is modeled around `maintenance_requests` and `maintenance_updates`.

Behaviorally:

- a tenant can submit a request
- an admin can review and update it
- `open`, `in_progress`, and `materials_needed` style states are active workflow states
- `completed` closes the cycle

The app preserves intermediate repair context instead of treating every status update as a close event.

## Charge and Utility Model

LedgerHome supports both rent-specific charges and property-level non-rent charge configuration.

That includes:

- rent charges and payments
- configurable posted property charges
- batch allocation support for non-rent items

In the public demo, these flows are represented conservatively to demonstrate the shape of the system without implying a production billing engine.

## Access Model

The same domain model serves both roles:

- admins operate across the demo portfolio
- tenants are limited to their assigned record and related lease, payment, maintenance, contact, and notification data

This role linkage is anchored through `user_profiles` and enforced further by Row Level Security.

## SQL References

Main schema:

- `supabase/schema.sql`

Important migrations:

- `0007_auth_access_foundation.sql`
- `0011_notifications_center.sql`
- `0013_property_charge_posting.sql`
- `0014_tenant_user_linking.sql`
- `0015_property_images_storage.sql`
- `0016_property_charge_batches.sql`
- `0017_lease_documents_storage_repair.sql`
- `0018_user_workspaces.sql`
- `0019_user_workspaces_board_data.sql`
- `0020_storage_access_hardening.sql`
- `0021_neighborhood_state_custom.sql`

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DATABASE.md](DATABASE.md)
- [AUTH_RLS.md](AUTH_RLS.md)
