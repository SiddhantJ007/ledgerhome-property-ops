# Security Notes

## Demo Isolation

The public LedgerHome demo uses a separate Supabase project from any private or client-facing database.

I intentionally avoided connecting the public demo to the original Supabase project. Even with RLS enabled, a portfolio demo should not depend on access controls alone to protect private data. I created a separate sanitized Supabase project with demo-only records and demo-only auth users to reduce blast radius.

## Data Sanitization

Only fictional demo properties, tenants, messages, documents, utilities, and ledger records are included in the public version.

The public repo and public demo are meant to demonstrate workflow shape, role separation, and backend integration without exposing:

- real tenants
- real addresses
- real lease records
- real uploaded files
- real company data
- private operational history

## Authentication

LedgerHome uses Supabase Auth for sign-in, session handling, password reset, and role-linked access.

The public demo is designed around separate demo users, typically:

- one demo admin user
- one demo tenant user

Those users belong only to the sanitized demo project.

## Authorization

Access is enforced through a combination of:

- role-aware application logic
- `user_profiles` role mapping
- tenant-to-user linkage
- Supabase Row Level Security policies

At runtime, the app determines whether the authenticated user should see the admin or tenant branch and then queries Supabase under that authenticated session.

## Row Level Security

RLS is enabled across the main operational tables and is intended to isolate tenant-scoped access while allowing admin-scoped management.

Admin users can manage records across the demo portfolio, including:

- neighborhoods
- properties
- units
- tenants
- tenant profiles
- leases
- documents
- maintenance requests and updates
- rent charges and payments
- contact requests
- notifications

Tenant users are restricted to their own linked records, including:

- their tenant record
- their property and assigned unit context
- their lease and documents
- their rent charges and payments
- their maintenance requests and updates
- their notifications and contact threads

Relevant SQL and policy setup live in:

- `supabase/schema.sql`
- `supabase/migrations/0007_auth_access_foundation.sql`
- `supabase/migrations/0011_notifications_center.sql`
- `supabase/migrations/0014_tenant_user_linking.sql`
- `supabase/migrations/0020_storage_access_hardening.sql`

## Environment Variables

Secrets are managed outside the repo through local environment configuration and deployment platform settings.

The frontend only expects:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

The public repo does not require a service-role key in frontend code.

## Public Repo Safety

The public repo is intended to be safe to share. It should not contain:

- production database URLs
- service-role keys
- private tenant records
- real client data
- real uploaded documents
- real storage paths
- internal deployment credentials

The public demo is also separated from any private dataset at the infrastructure level, not just at the UI level.

## Known Security Limitations

- demo credentials may be shared for recruiter evaluation
- this is not intended for real payment handling
- no production-grade rate limiting layer is implemented yet
- no formal penetration test has been performed
- auditability is limited compared with a hardened production system

## Future Security Improvements

- stricter audit logs
- admin activity history
- rate limiting
- MFA
- payment-provider security review
- stronger automated policy validation
- more explicit operational monitoring and alerting
