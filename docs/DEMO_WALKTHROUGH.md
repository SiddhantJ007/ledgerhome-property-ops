# Demo Walkthrough

This file is meant for a recruiter, reviewer, or hiring manager who wants to understand the product quickly without guessing where to click.

## Live Demo Link

Add the deployed Vercel URL here. You can also place the Loom walkthrough link directly below it for reviewers who prefer a guided tour.

## Demo Media

- Loom walkthrough: `https://www.loom.com/share/7c47261cf9a743afba9701895094e51e`
- Screenshots used in the README: sign-in, admin dashboard, tenant portal, maintenance workflow, and payments

## Demo Accounts

### Admin

- email: `demo-admin@ledgerhome-demo.com`
- password: `Demo@123`

### Tenant

- email: `alex.carter@ledgerhome-demo.com`
- password: `Alex@123`

## Admin Flow

1. Log in as admin.
2. Open the dashboard and review the high-level portfolio view.
3. Open the properties area and inspect the seeded property and unit records.
4. Open the tenant area and review the tenant record, score, and linked account information.
5. Open maintenance and review the seeded repair request and its update history.
6. Open payments to review rent status, prior payment history, and the charge lifecycle.
7. Review documents, notifications, and tenant-facing record visibility from the admin side.

## Tenant Flow

1. Log in as the tenant user.
2. Review the tenant dashboard and assigned property/account summary.
3. Open the ledger and payment-related screens to see tenant-scoped financial visibility.
4. Open maintenance to review the seeded request and follow-up update state.
5. Open the contact/document areas to see the tenant-side framing of the same backend records.

## What to Notice

- role-based dashboards
- admin and tenant UI separation
- one shared backend with different access boundaries
- Supabase-backed persistence rather than UI-only demo state
- row-scoped tenant visibility
- sanitized demo data instead of private business data

## Demo Limitations

- demo database only
- no real payments
- public demo credentials
- limited seed data
- web demo is meant for product review, not production operations

## Suggested Review Path

If someone only has three to five minutes, the most useful order is:

1. admin dashboard
2. property detail
3. tenant record
4. payments screen
5. maintenance screen
6. tenant login
7. tenant dashboard and maintenance view

That path shows the role model, the shared backend idea, and the workflow coverage without needing a long guided explanation.
