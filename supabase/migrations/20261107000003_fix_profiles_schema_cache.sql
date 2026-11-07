-- Migration: 20261107000003_fix_profiles_schema_cache.sql
-- Description: Safely adds missing email, password_hash, and phone_number columns to public.profiles,
-- enforces case-insensitive uniqueness, and triggers PostgREST schema cache reload.

-- 1. Ensure physical columns exist on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 2. Enforce case-insensitive unique indexes safely
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique 
ON public.profiles (LOWER(TRIM(email))) 
WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_employee_id_unique 
ON public.profiles (UPPER(TRIM(employee_id))) 
WHERE employee_id IS NOT NULL;

-- 3. Force PostgREST to immediately rebuild its schema cache
NOTIFY pgrst, 'reload schema';
