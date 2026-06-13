# Authentication and Row Level Security

## Authentication Model

LedgerHome uses Supabase Auth for sign-in, session persistence, and password-related flows.

In the public demo, the expected users are:

- one demo admin user
- one demo tenant user

After authentication, the app resolves a role-linked `user_profiles` record and routes the user into the admin or tenant branch accordingly.

## Role Model

Current application roles:

- `admin`
- `tenant`

The role is stored in `user_profiles` and is used both by the frontend access layer and by database policies.

## Authorization Model

### Admin

Admin users can read and manage demo portfolio data across:

- neighborhoods
- properties
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

### Tenant

Tenant users are limited to their own linked scope:

- their own tenant record
- their own property and unit context
- their own lease and documents
- their own rent charges and payments
- their own maintenance requests and updates
- their own notifications and contact threads

## RLS Policy Summary

| Table | Admin Access | Tenant Access | Notes |
|---|---|---|---|
| `user_profiles` | manage demo users | own profile context | role anchor |
| `neighborhoods` | manage | read through assigned property context | RLS enforced |
| `properties` | manage demo properties | assigned property context only | RLS enforced |
| `property_images` | manage | assigned property context only | RLS enforced |
| `units` | manage | assigned unit only | RLS enforced |
| `tenants` | manage tenants | own tenant record only | RLS enforced |
| `tenant_profiles` | manage | own profile only | RLS enforced |
| `leases` | manage | own lease only | RLS enforced |
| `documents` | manage | own documents only | RLS enforced |
| `rent_charges` | manage charges | own charges only | RLS enforced |
| `rent_payments` | manage payments | own payments only | RLS enforced |
| `maintenance_requests` | manage requests | own requests and own inserts | RLS enforced |
| `maintenance_updates` | manage updates | updates tied to own requests | RLS enforced |
| `maintenance_images` | manage images | images tied to own requests | RLS enforced |
| `contact_requests` | manage contact threads | own contact thread only | RLS enforced |
| `notifications` | manage notifications | own tenant-scoped notifications | RLS enforced |

## Why RLS Is Used

RLS is used because the database, not the UI, should remain the final authority on who can access which rows.

The frontend controls the user experience, but the database policies control data access. The public demo does not rely on UI-level hiding as the security boundary.

## Why a Separate Demo Project Is Still Used

RLS is necessary, but it is not the only control that matters.

For a public portfolio demo, I intentionally use a separate sanitized Supabase project because:

- public demos are easier to share and test
- mistakes in demo configuration do not expose private records
- demo credentials can be public without touching a real client environment
- it keeps the blast radius small

This is a defense-in-depth decision, not a distrust of RLS.

## Key SQL References

Relevant setup files include:

- `supabase/schema.sql`
- `supabase/migrations/0007_auth_access_foundation.sql`
- `supabase/migrations/0011_notifications_center.sql`
- `supabase/migrations/0014_tenant_user_linking.sql`
- `supabase/migrations/0020_storage_access_hardening.sql`

## Known Limitations

- demo credentials are public
- not production hardened for malicious public traffic
- additional audit and rate-limit layers would be needed for real customers
- current role model is intentionally simple for demo clarity

## Future Improvements

- stricter admin organization scoping
- audit log table
- MFA
- invite-based onboarding
- stronger policy validation and test coverage
