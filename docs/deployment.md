# VLMS Deployment Guide

## Prerequisites
- A Supabase Project (PostgreSQL 15+)
- A Vercel or Node.js hosting platform (Node 20+)
- GitHub Repository connection

## Step-by-Step Deployment Instructions

### 1. Database Migration & Setup
1. Navigate to your Supabase Project dashboard.
2. Open the **SQL Editor**.
3. Run the schema migrations in order:
   - `supabase/migrations/20261022000001_initial_schema.sql`
   - `supabase/migrations/20261022000002_rls_policies.sql`
   - (Optional for testing) `supabase/migrations/20261022000003_seed_dev_data.sql`
4. Create a Private Storage Bucket:
   - Go to **Storage** -> **New Bucket**.
   - Name: `vlms-evidence`
   - Set **Public bucket** to `OFF` (Private).

### 2. Configure Environment Variables
Set the following in Vercel / production host:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon public key.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (Never expose to browser).
- `NEXT_PUBLIC_APP_URL`: Production domain (e.g., `https://vlms.example.com`).
- `NEXT_PUBLIC_DEFAULT_TIMEZONE`: `Africa/Lagos`.
- `NEXT_PUBLIC_DEFAULT_CURRENCY`: `NGN`.
- `NEXT_PUBLIC_FIXED_TOM_VENDOR`: `TOTAL ENERGIES FILLING STATION`.

### 3. Build & Deploy
```bash
npm run build
npm start
```
Verify the production build completes with exit code 0.
