# Supabase Setup

## Purpose

This folder contains the database schema, migrations, and demo seed data for the public LedgerHome demo.

The goal of this setup is to make the public version reproducible while keeping it completely separate from any private or client-oriented backend.

## Files

### `schema.sql`

Base schema for the application.

### `migrations/`

Version-controlled SQL changes that evolve the database structure and access model.

### `demo_seed.sql`

Fictional demo data used to populate a sanitized recruiter-facing environment.

### `functions/`

Database-side function logic and related SQL assets when applicable.

## Setup Steps

1. Create a new Supabase project.
2. Run `schema.sql`.
3. Run the curated migration sequence.
4. Create the demo auth users.
5. Run `demo_seed.sql`.
6. Confirm storage buckets and RLS-related behavior.
7. Add the Supabase URL and anon key to local/Vercel environment variables.

Detailed public setup guidance:

- `../docs/SUPABASE_DEMO_SETUP.md`

## Demo Users

Auth users must be created separately in Supabase Auth if they are not created by SQL.

Current demo users:

- `demo-admin@ledgerhome-demo.com`
- `alex.carter@ledgerhome-demo.com`

## Safety Note

This setup is for the sanitized public demo only.

It should not be pointed at a private dataset, and it should not be treated as a shortcut for production database management.
