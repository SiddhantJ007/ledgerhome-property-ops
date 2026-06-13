# Screen To Data Map

This file maps major screens to their primary data dependencies so the public repo is easier to understand during review, debugging, or demo walkthroughs.

The intent is to make it obvious which screens are genuinely backed by Supabase and which areas are still lighter-weight placeholder surfaces.

## Admin Side

| Screen | Purpose | Main data sources | Runtime |
|---|---|---|---|
| `app/(admin)/(tabs)/index.tsx` | admin dashboard | master data, payments, maintenance, notifications | Live |
| `app/(admin)/(tabs)/properties/index.tsx` | property list and shortcuts | master data | Live |
| `app/(admin)/properties/[propertyId].tsx` | property detail | master data, payments, maintenance, documents | Live |
| `app/(admin)/properties/add.tsx` | create property | master data backend | Live |
| `app/(admin)/units/index.tsx` | unit list | master data, ledger context | Live |
| `app/(admin)/units/[unitId].tsx` | unit detail | master data, ledger context | Live |
| `app/(admin)/tenants/index.tsx` | tenant list | master data, ledger context | Live |
| `app/(admin)/tenants/[tenantId].tsx` | tenant detail, score, records, login linking | master data, payments, documents, notifications | Live |
| `app/(admin)/tenants/add.tsx` | create tenant and initial setup | master data backend | Live |
| `app/(admin)/(tabs)/payments/index.tsx` | rent and posted charge operations | payments backend, master data | Live |
| `app/(admin)/(tabs)/maintenance/index.tsx` | repair workflow and status updates | maintenance backend, master data | Live |
| `app/(admin)/(tabs)/more.tsx` | account/legal/system shortcuts | auth, legal routes, workspace data | Live |

## Tenant Side

| Screen | Purpose | Main data sources | Runtime |
|---|---|---|---|
| `app/(tenant)/(tabs)/index.tsx` | tenant dashboard | ledger rows, lease context, notifications | Live |
| `app/(tenant)/(tabs)/ledger.tsx` | dues and balances | payments backend | Live |
| `app/(tenant)/payment-history.tsx` | payment history | payments backend | Live |
| `app/(tenant)/(tabs)/maintenance.tsx` | repair history | maintenance backend | Live |
| `app/(tenant)/maintenance-request.tsx` | submit repair request | maintenance backend | Live |
| `app/(tenant)/(tabs)/lease.tsx` | lease and document access | lease/document backend | Live |
| `app/(tenant)/contact-admin.tsx` | contact thread | contact backend | Live |
| `app/(tenant)/(tabs)/more.tsx` | account/legal/shortcuts | auth, legal routes | Live |
| `app/(tenant)/pay-rent.tsx` | self-pay placeholder | local UI only | Future |

## Shared / Supporting Layers

These are not route files themselves, but they determine what most screens can render:

| Layer | Purpose |
|---|---|
| `AuthProvider` | Supabase session and auth lifecycle |
| `AccessProvider` | role resolution and route gating |
| `MasterDataProvider` | properties, units, tenants, and creation/update flows |
| `NotificationsProvider` | stored + derived notifications |
| `lib/*-backend.ts` helpers | focused Supabase read/write operations |

## Runtime Notes

- Most operational screens are backed by Supabase through provider layers plus focused backend helpers.
- Admin and tenant screens are designed to read the same persisted state with different access boundaries.
- Some demo-safe fallback logic still exists to keep the public version stable during portfolio review.
- The most important reviewer-facing flows are live:
  - admin/tenant login
  - property and tenant visibility
  - rent status and payment views
  - maintenance submission and updates
  - notification rendering

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DATABASE.md](DATABASE.md)
- [AUTH_RLS.md](AUTH_RLS.md)
