# LedgerHome Demo Supabase Setup

Use this file when creating a recruiter-safe LedgerHome demo backend.

## Rules

- create a brand-new Supabase project
- do not reuse any private or production project
- do not use real users or real tenant/property data
- do not place any service role key in frontend code

## Recommended project name

`ledgerhome-demo`

## Step 1: create auth users

In Supabase Auth, create these users manually:

- `demo-admin@ledgerhome-demo.com`
- `alex.carter@ledgerhome-demo.com`

Set passwords manually in the dashboard. Keep them outside the repo.

## Step 2: apply schema and curated migrations

For a brand-new demo project, do **not** run both the base schema and every historical seed file blindly.

Run in this order:

1. `supabase/schema.sql`
2. numeric migrations in order, **excluding** `supabase/migrations/0008_seed_user_profiles.sql`

Recommended migration order after `schema.sql`:

- `0002_phase2_foundation.sql`
- `0003_maintenance_images.sql`
- `0004_payments_backend_foundation.sql`
- `0005_leases_documents_storage.sql`
- `0006_contact_requests_backend.sql`
- `0007_auth_access_foundation.sql`
- skip `0008_seed_user_profiles.sql`
- `0009_master_data_foundation.sql`
- `0010_master_data_relationships.sql`
- `0011_notifications_center.sql`
- `0012_property_charge_configs.sql`
- `0013_property_charge_posting.sql`
- `0014_tenant_user_linking.sql`
- `0015_property_images_storage.sql`
- `0016_property_charge_batches.sql`
- `0017_lease_documents_storage_repair.sql`
- `0018_user_workspaces.sql`
- `0019_user_workspaces_board_data.sql`
- `0020_storage_access_hardening.sql`
- `0021_neighborhood_state_custom.sql`

## Step 3: storage buckets

The storage migrations should create these automatically. Confirm they exist after Step 2:

- `property-images`
- `maintenance-images`
- `lease-documents`

## Step 4: run the demo seed

Run:

- `supabase/demo_seed.sql`

This seed expects the two auth users above to already exist.

## Step 5: auth URLs

In Supabase Auth settings, add:

- local web URL
- deployed Vercel URL
- password reset redirect path

## Step 6: verify roles

- admin login routes to admin tabs
- tenant login routes to tenant tabs
- tenant only sees their own records
- admin sees the fake demo portfolio
