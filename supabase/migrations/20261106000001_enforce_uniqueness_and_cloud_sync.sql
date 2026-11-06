-- Migration: 20261106000001_enforce_uniqueness_and_cloud_sync.sql
-- Description: Enforce database UNIQUE constraints on profiles (email, employee_id),
-- vehicles (plate_number), and active vehicle assignments to guarantee cross-device data integrity.

-- 1. Profiles Table: Add email and password_hash columns if missing
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. Profiles Table: Enforce Case-Insensitive Unique Constraints
DO $$
BEGIN
    -- Email uniqueness
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'profiles' AND indexname = 'idx_profiles_email_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_profiles_email_unique ON public.profiles (LOWER(TRIM(email))) WHERE email IS NOT NULL;
    END IF;

    -- Employee ID uniqueness
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'profiles' AND indexname = 'idx_profiles_employee_id_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_profiles_employee_id_unique ON public.profiles (UPPER(TRIM(employee_id))) WHERE employee_id IS NOT NULL;
    END IF;
END $$;

-- 3. Vehicles Table: Enforce Case-Insensitive Unique Plate Number
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'vehicles' AND indexname = 'idx_vehicles_plate_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_vehicles_plate_unique ON public.vehicles (UPPER(TRIM(plate_number)));
    END IF;
END $$;

-- 4. Vehicle Assignments Table: Enforce Strict 1-to-1 Active Assignment
-- Prevents a staff user or a vehicle from having multiple overlapping active assignments (ends_at IS NULL).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'vehicle_assignments' AND indexname = 'idx_single_active_user_assignment'
    ) THEN
        CREATE UNIQUE INDEX idx_single_active_user_assignment ON public.vehicle_assignments (user_id) WHERE ends_at IS NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'vehicle_assignments' AND indexname = 'idx_single_active_vehicle_assignment'
    ) THEN
        CREATE UNIQUE INDEX idx_single_active_vehicle_assignment ON public.vehicle_assignments (vehicle_id) WHERE ends_at IS NULL;
    END IF;
END $$;

-- 5. TOM Cards Table: Enforce Unique Reference
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tom_cards_card_reference_key'
    ) THEN
        ALTER TABLE public.tom_cards ADD CONSTRAINT tom_cards_card_reference_key UNIQUE (card_reference);
    END IF;
END $$;
