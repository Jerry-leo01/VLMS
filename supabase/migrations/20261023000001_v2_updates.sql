-- Migration: 20261023000001_v2_updates.sql
-- Description: Update office branches, add phone number & car details, enforce plate uniqueness

-- 1. Insert/Update exact 8 official company branches
INSERT INTO public.offices (name, address, is_active)
VALUES
    ('Head Office', 'Corporate Headquarters, Victoria Island, Lagos State', true),
    ('Lagos Branch', 'Ikeja Commercial District, Lagos State', true),
    ('South West Branch', 'Ibadan Zonal Office, Oyo State', true),
    ('South South Branch', 'Trans Amadi Industrial Layout, Port Harcourt, Rivers State', true),
    ('South East Branch', 'Enugu Regional Center, Enugu State', true),
    ('North Central Branch', 'Central Business District, Abuja FCT', true),
    ('North West Branch', 'Kano Commercial Hub, Kano State', true),
    ('North East Branch', 'Maiduguri Office, Borno State', true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- 2. Alter Profiles: Add phone_number column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 3. Alter Vehicles: Add car_name column
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS car_name TEXT;

-- Ensure plate_number has unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_plate_number_key'
    ) THEN
        ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_plate_number_key UNIQUE (plate_number);
    END IF;
END $$;

-- 4. Alter Registration Requests: Add phone and car metadata
ALTER TABLE public.registration_requests
ADD COLUMN IF NOT EXISTS requested_phone_number TEXT,
ADD COLUMN IF NOT EXISTS requested_car_name TEXT,
ADD COLUMN IF NOT EXISTS requested_car_model TEXT,
ADD COLUMN IF NOT EXISTS requested_car_year INTEGER,
ADD COLUMN IF NOT EXISTS requested_role TEXT DEFAULT 'staff';
