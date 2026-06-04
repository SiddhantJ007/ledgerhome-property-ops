# Screen To Data Map

This file maps major screens to their primary data dependencies so the public repo is easier to understand.

## Admin side

| Screen | Purpose | Main data sources | Runtime |
|---|---|---|---|
| `app/(admin)/(tabs)/index.tsx` | admin dashboard | master data, payments, maintenance, notifications | Live |
| `app/(admin)/(tabs)/properties/index.tsx` | property list and shortcuts | master data | Live |
| `app/(admin)/properties/[propertyId].tsx` | property detail | master data, payments, maintenance, documents | Live |
| `app/(admin)/properties/add.tsx` | create property | master data backend | Live |
| `app/(admin)/units/index.tsx` | unit list | master data, ledger rows | Live |
| `app/(admin)/units/[unitId].tsx` | unit detail | master data, ledger rows | Live |
| `app/(admin)/tenants/index.tsx` | tenant list | master data, ledger rows | Live |
| `app/(admin)/tenants/[tenantId].tsx` | tenant detail, score, records, login linking | master data, payments, documents, notifications | Live |
| `app/(admin)/tenants/add.tsx` | create tenant and initial setup | master data backend | Live |
| `app/(admin)/(tabs)/payments/index.tsx` | rent and posted charges | payments backend, master data | Live |
| `app/(admin)/(tabs)/maintenance/index.tsx` | repair workflow | maintenance backend, master data | Live |

## Tenant side

| Screen | Purpose | Main data sources | Runtime |
|---|---|---|---|
| `app/(tenant)/(tabs)/index.tsx` | tenant dashboard | ledger rows, lease context, notifications | Live |
| `app/(tenant)/(tabs)/ledger.tsx` | dues and balances | payments backend | Live |
| `app/(tenant)/payment-history.tsx` | payment history | payments backend | Live |
| `app/(tenant)/(tabs)/maintenance.tsx` | repair history | maintenance backend | Live |
| `app/(tenant)/maintenance-request.tsx` | submit repair request | maintenance backend | Live |
| `app/(tenant)/(tabs)/lease.tsx` | lease/documents access | document backend | Live |
| `app/(tenant)/contact-admin.tsx` | contact thread | contact backend | Live |
| `app/(tenant)/(tabs)/more.tsx` | account/legal/shortcuts | auth, legal routes | Live |
| `app/(tenant)/pay-rent.tsx` | self-pay placeholder | local UI only | Future |

## Supporting notes

- Most operational screens use Supabase-backed records through provider and backend helper layers.
- Some sample/demo data helpers still exist to support portfolio-safe fallback behavior.
- Admin and tenant views are designed to read the same backend truth with different UI framing.
