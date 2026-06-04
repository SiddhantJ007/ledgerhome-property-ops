LedgerHome

What this app is

LedgerHome is a rental and property operations app for small property management workflows.
It is built for two main sides:

1. Admin / property manager side
2. Tenant / resident side

The goal is to keep daily operations in one place:
- properties
- units
- tenants
- rent tracking
- repairs / maintenance
- messages
- documents
- notifications


Overall idea

The app is meant to help an admin manage properties without jumping between spreadsheets, chats, and manual notes.
At the same time, tenants get a simple portal where they can:
- view their rent status
- see lease information
- submit repair requests
- receive reminders and updates

The app is not trying to be a large enterprise system.
It is meant to be practical, clear, and usable for day-to-day rental management.


Admin side

The admin side is used to:
- create and manage properties
- add units
- add and manage tenants
- record rent payments
- review balances and collection status
- review and update repair requests
- upload and manage documents
- message tenants
- link tenant records to login access

Important admin actions:
- mark a tenant as former
- remove a tenant from a unit
- record a rent payment manually
- update repair status
- notify tenant


Tenant side

The tenant side is used to:
- view home dashboard
- check amount owed
- view rent and payment status
- see lease summary
- submit repair / maintenance requests
- upload repair photos
- receive rent and repair notifications
- view documents where available


How login works

There are two sign-in paths:
- Admin sign in
- Tenant sign in

They lead to the same auth system, but the app checks the user role after login and routes the person to the correct side.

This prevents a tenant from accidentally entering through the admin sign-in flow and causing confusion.


How Supabase is used

Supabase is the main backend for this app.

It is used for:
- authentication
- user profile records
- tenant, unit, property, rent, repair, and document data
- notifications and linked app data
- file storage for uploads

In simple terms:
- Supabase Auth handles who can sign in
- Supabase tables store the app records
- Supabase Storage keeps uploaded files


Tenant login linking

The normal flow is:
1. Create the tenant record in the app
2. Create the tenant auth user in Supabase
3. Link that auth email to the tenant from the admin side

Once linked, the tenant can sign in and see only their own information.


Rent cycle in short

The app supports monthly rent tracking.

Typical behavior:
- admin sees rent rows and can record payments
- tenant sees amount owed and reminders
- upcoming rent can appear before the due date
- overdue rent becomes visible if not paid by the due date
- once fully paid, the record updates and history remains visible

The app is built so rent recording is possible manually from the admin side even if the workflow is simple.


Repairs in short

Tenants can submit repair requests.
Admins can then move the request through stages such as:
- Open
- In process
- Materials needed
- Completed

Only completed repairs should be treated as closed.
Intermediate states should still be treated as active work.


Notifications in short

The app includes in-app notifications for things such as:
- upcoming rent reminders
- overdue rent
- repair updates
- repair completion

The intent is:
- lighter reminders before due date
- stronger alerts once something becomes overdue or needs attention


Property and location behavior

Properties can be created directly from the app.
The admin does not need to manually create neighborhoods first in the database.

Location inputs are designed to be flexible:
- state code
- neighborhood / borough
- city

Neighborhood and city can be entered directly during property creation.


Former tenants

When a tenant moves out, the safer recommended workflow is to mark the resident as former instead of relying on hard deletion.

This helps preserve record history while also:
- vacating the unit
- removing future participation in rent / notification activity
- stopping tenant-side access when unlinked


What this version focuses on

This version focuses on:
- cleaner UX
- safer admin workflows
- simpler wording
- better navigation
- clearer repairs and payments behavior
- better tenant/admin separation
- more trustworthy save and update flows


Short usage guide

For admin:
1. Add property
2. Add unit
3. Add tenant
4. Link auth user if tenant portal access is needed
5. Record rent payments as needed
6. Review repairs and update statuses

For tenant:
1. Sign in from tenant path
2. Review dashboard
3. Check amount owed
4. Submit repair requests if needed
5. Review notifications and documents


Changelog summary for V2

Main V2 updates:
- cleaner dashboard and navigation
- top-accessible menu improvements
- branding updated to LedgerHome
- property creation no longer depends on precreated neighborhoods
- simpler property / unit / tenant organization
- clearer payment wording and collection flow
- improved repair workflow and repair status handling
- tenant score added with visible reasons
- tenant/admin notification improvements
- better tenant login linking flow
- safer tenant offboarding behavior
- better upload trust and save feedback


Notes

- Supabase is required for the real backend-backed flows
- some app behavior depends on the data being linked correctly in Supabase
- if a tenant cannot log in, first check auth user creation and user_profiles linking
- if a file upload is visible in the app, it is expected to remain available from backend storage
