-- Migration: 20261024000001_v3_unit_and_geo_enhancements.sql
-- Description: Add unit separation (raw_text, source_unit, source_reading, canonical_reading_km)
-- and reverse-geocoded location name for high-fidelity auditability and zero drift.

-- 1. Enhance Daily Logs with Unit & Geolocation Metadata
ALTER TABLE public.daily_logs
    ADD COLUMN IF NOT EXISTS raw_odometer_text TEXT,
    ADD COLUMN IF NOT EXISTS source_unit TEXT NOT NULL DEFAULT 'km' CHECK (source_unit IN ('km', 'mi')),
    ADD COLUMN IF NOT EXISTS source_reading NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS canonical_reading_km NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS location_name TEXT;

-- Backfill canonical_reading_km and source_reading from existing odometer_km for existing records
UPDATE public.daily_logs
SET 
    canonical_reading_km = COALESCE(canonical_reading_km, odometer_km),
    source_reading = COALESCE(source_reading, odometer_km),
    source_unit = COALESCE(source_unit, 'km')
WHERE canonical_reading_km IS NULL;

-- 2. Enhance Odometer Readings table with Unit Tracking
ALTER TABLE public.odometer_readings
    ADD COLUMN IF NOT EXISTS source_unit TEXT NOT NULL DEFAULT 'km' CHECK (source_unit IN ('km', 'mi')),
    ADD COLUMN IF NOT EXISTS source_reading NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS canonical_reading_km NUMERIC(10, 2);

UPDATE public.odometer_readings
SET
    canonical_reading_km = COALESCE(canonical_reading_km, odometer_km),
    source_reading = COALESCE(source_reading, odometer_km),
    source_unit = COALESCE(source_unit, 'km')
WHERE canonical_reading_km IS NULL;

-- 3. Enhance Fuel Transactions with Unit Tracking
ALTER TABLE public.fuel_transactions
    ADD COLUMN IF NOT EXISTS source_unit TEXT NOT NULL DEFAULT 'km' CHECK (source_unit IN ('km', 'mi')),
    ADD COLUMN IF NOT EXISTS source_reading NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS canonical_reading_km NUMERIC(10, 2);

UPDATE public.fuel_transactions
SET
    canonical_reading_km = COALESCE(canonical_reading_km, odometer_km),
    source_reading = COALESCE(source_reading, odometer_km),
    source_unit = COALESCE(source_unit, 'km')
WHERE canonical_reading_km IS NULL;
