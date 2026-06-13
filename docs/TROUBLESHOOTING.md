# Troubleshooting

This file captures the most likely failure cases for the public LedgerHome demo and the reasoning path I would use to isolate them quickly.

## App loads locally but not on Vercel

Check:

- the Vercel build command is `npm run export:web`
- the output directory is `dist`
- the deploy picked up the latest commit
- required environment variables are present in Vercel
- the app is pointing to the demo Supabase project, not an old environment

## Supabase login works locally but not in production

Check:

- the Supabase project is active and not paused
- the Vercel URL is added in Supabase Auth settings
- `EXPO_PUBLIC_SUPABASE_URL` is correct
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` is correct
- the demo auth users exist
- the deployed URL is present in the Site URL / Redirect URLs config, not just localhost

## Environment variables are undefined

Check:

- the variable names are exactly:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- the values were added in Vercel for the correct environment
- the project was redeployed after changing them
- no local-only `.env` assumption leaked into deployment steps

## Seed file fails

Check:

- `supabase/schema.sql` ran first
- curated migrations ran in order
- `0008_seed_user_profiles.sql` was skipped
- demo auth users were created before `supabase/demo_seed.sql`
- the current error line actually matches the current version of the seed file
- any partially applied table shape drift is addressed before rerunning the seed

## Tenant can log in but sees no data

Check:

- `user_profiles` exists for that auth user
- the tenant role is correct
- `tenant_id` in `user_profiles` points to the seeded tenant record
- RLS-related migrations were applied
- the tenant is still assigned to an active record / unit context in the demo data

## Admin cannot access demo records

Check:

- the admin auth user exists
- `user_profiles.role = 'admin'` for that user
- the admin row was created in the demo project, not only in a previous private environment
- RLS migrations were applied, especially auth and notification-related policy files

## Storage uploads fail

Check:

- required storage buckets exist
- storage migrations were applied
- deployed environment points to the correct demo project

## Web app builds locally but deployed login fails

Check:

- Vercel environment variables match the demo Supabase project
- deployed URL was added to Supabase Auth redirect settings
- the app was redeployed after env changes
- browser cache or stale session state is not masking the real issue

## CI fails but local build works

Check:

- Node version differences
- lockfile drift
- missing scripts in `package.json`
- test environment assumptions that only hold locally
- Expo / Jest / TypeScript version mismatches

This happened during setup and is exactly why CI matters: local success is not enough when the deployment path depends on a clean machine.

## Build fails due to TypeScript

Run:

```bash
npm run typecheck
```

Then inspect:

- the specific failing file
- aliased imports
- test-only typings
- Expo / React Native type compatibility
- whether the failure is from app code or newly added documentation/test infrastructure

## Session or redirect behavior is inconsistent

Check:

- scheme and redirect configuration match the public demo setup
- the current deployed domain is listed in Supabase Auth settings
- browser storage is not using a stale session from another environment

## Debugging Principle

My default approach here is:

1. isolate whether the problem is local, CI, deployed, or database-side
2. verify configuration before touching code
3. confirm the data/linkage assumptions behind auth and RLS
4. only patch code or SQL once the failure boundary is clear

That approach matters because a lot of demo instability comes from configuration drift, not from the application logic itself.

## Related Docs

- [DEPLOYMENT.md](DEPLOYMENT.md)
- [AUTH_RLS.md](AUTH_RLS.md)
- [SUPABASE_DEMO_SETUP.md](SUPABASE_DEMO_SETUP.md)
- [BUILD_NOTES.md](BUILD_NOTES.md)
