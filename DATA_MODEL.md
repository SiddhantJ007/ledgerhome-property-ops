# Data Model

## Core entities

Defined in `types/domain.ts`.

Portfolio:

- `Neighborhood`
- `Property`
- `PropertyImage`
- `Unit`
- `Tenant`
- `TenantProfile`

Lease and documents:

- `Lease`
- `Document`

Collections:

- `RentCharge`
- `RentPayment`
- `PropertyChargeConfig`
- `PropertyChargeBatch`
- `PropertyChargeBatchAllocation`

Maintenance:

- `MaintenanceRequest`
- `MaintenanceUpdate`
- `MaintenanceRecord`

Messaging and notifications:

- `ContactRequest`
- `Notification`
- `UserProfile`

## Relationship summary

- `Neighborhood` -> many `Property`
- `Property` -> many `Unit`
- `Unit` -> zero or one active `Tenant`
- `Tenant` -> lease, payments, documents, contact, maintenance, notifications
- `Lease` links tenant, property, and unit
- `RentCharge` and `RentPayment` anchor the collections lifecycle
- `PropertyChargeBatch` and `PropertyChargeBatchAllocation` support manual non-rent charge posting

## Runtime model

The intended runtime source of truth is Supabase-backed data for:

- master data
- lease context
- rent charges and payments
- maintenance records
- contact threads
- notifications
- document/storage references

Some compatibility/demo types still exist to support sample workflows in the public portfolio version.

## Rent cycle model

- a tenant receives an initial/current rent charge when onboarded
- current and next-cycle rent behavior is derived from persisted charge records
- reminders and status presentation depend on stored rent state, not static UI-only assumptions

## Maintenance model

- tenants can submit requests
- admins can update status and notes
- open, in-progress, and materials-needed states remain active workflow states
- completed requests close the cycle

## SQL references

Main schema:

- `supabase/schema.sql`

Important migrations:

- `0007_auth_access_foundation.sql`
- `0011_notifications_center.sql`
- `0013_property_charge_posting.sql`
- `0015_property_images_storage.sql`
- `0016_property_charge_batches.sql`
- `0017_lease_documents_storage_repair.sql`
- `0018_user_workspaces.sql`
- `0019_user_workspaces_board_data.sql`
- `0020_storage_access_hardening.sql`
