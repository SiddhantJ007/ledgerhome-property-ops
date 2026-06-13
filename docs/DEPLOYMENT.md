# Deployment Guide

## Deployment Target

LedgerHome is deployed as an Expo web app on Vercel.

## Why Vercel

I chose Vercel for the public demo because it is the most practical deployment path for this project in portfolio form:

- GitHub-based deployment
- simple frontend hosting
- environment variable support
- fast public demo setup
- easy iteration when refining docs or demo data

Expo supports web builds that can be hosted on third-party services. In this case, Vercel was the most direct way to turn the Expo web export into a recruiter-friendly live demo without introducing extra infrastructure.

## Build Configuration

Recommended settings:

- install command: `npm install`
- build command: `npm run export:web`
- output directory: `dist`
- framework preset: `Other`

If you need to pin Node in Vercel, use a current LTS version that matches the repo’s Expo toolchain expectations.

## Required Environment Variables

The frontend expects only public Supabase client values:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

These should be configured in Vercel and local `.env` files, never hardcoded in application code.

## Supabase Configuration

The public demo should point to:

- a separate demo Supabase project
- a public anon key
- fake demo auth users
- fake demo records only

Do not use:

- the original private project
- any service-role key in frontend code
- real tenant or client data

## Supabase URL / Redirect Configuration

The deployed Vercel URL must be configured in Supabase Auth settings. Otherwise, login and redirect behavior can fail outside localhost.

At minimum, configure:

- local development URL
- deployed Vercel URL
- password reset redirect URL if password reset is being demonstrated

## Deployment Steps

1. Push the repo to GitHub.
2. Import the project into Vercel.
3. Configure the build settings:
   - install: `npm install`
   - build: `npm run export:web`
   - output: `dist`
4. Add environment variables:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
5. Configure Supabase Auth URL settings for the deployed domain.
6. Deploy.
7. Validate the demo admin and tenant accounts.

## Post-Deployment Verification

- app loads successfully
- admin login works
- tenant login works
- admin only sees demo records
- tenant only sees tenant-scoped demo data
- maintenance request flow loads and updates
- session persistence works across refresh
- redirect and password reset behavior point to the deployed domain

## Troubleshooting

See:

- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## Practical Deployment Note

This deployment path is intentionally simple. The goal of the public version is to prove product thinking, architecture, Supabase integration, and role-aware workflow design in a live environment without pretending that this is already a fully hardened production SaaS stack.
