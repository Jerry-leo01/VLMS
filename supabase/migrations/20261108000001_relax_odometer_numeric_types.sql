-- Migration: 20261108000001_relax_odometer_numeric_types.sql
-- Description: Convert integer odometer and distance columns across daily_logs, fuel_transactions,
-- odometer_readings, and vehicles to NUMERIC(10, 2) to natively support decimal and fractional odometer readings.

-- 1. Daily Logs
ALTER TABLE public.daily_logs 
    ALTER COLUMN closing_odometer_km TYPE NUMERIC(10, 2),
    ALTER COLUMN distance_travelled_km TYPE NUMERIC(10, 2);

-- 2. Fuel Transactions
ALTER TABLE public.fuel_transactions 
    ALTER COLUMN current_odometer_km TYPE NUMERIC(10, 2);

-- 3. Odometer Readings Audit Log
ALTER TABLE public.odometer_readings 
    ALTER COLUMN reading_km TYPE NUMERIC(10, 2);

-- 4. Vehicles Fleet State
ALTER TABLE public.vehicles 
    ALTER COLUMN current_odometer_km TYPE NUMERIC(10, 2);
