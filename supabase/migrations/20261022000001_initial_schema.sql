-- Vehicle Log Management System (VLMS) - Core Database Schema
-- Version: 1.0.0
-- Compatible with PostgreSQL 15+ / Supabase

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Offices
CREATE TABLE IF NOT EXISTS public.offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    employee_id TEXT UNIQUE,
    office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'suspended', 'deactivated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('staff', 'department_head', 'fleet_manager', 'auditor', 'administrator')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, role)
);

-- 4. Vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number TEXT NOT NULL UNIQUE,
    make TEXT,
    model TEXT,
    year INTEGER,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'retired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Vehicle Assignments
CREATE TABLE IF NOT EXISTS public.vehicle_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ends_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TOM Cards
CREATE TABLE IF NOT EXISTS public.tom_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_reference TEXT NOT NULL UNIQUE,
    masked_card_number TEXT NOT NULL,
    encrypted_card_number TEXT,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Registration Requests
CREATE TABLE IF NOT EXISTS public.registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_plate_number TEXT NOT NULL,
    requested_tom_card TEXT,
    requested_office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Evidence Files
CREATE TABLE IF NOT EXISTS public.evidence_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_bucket TEXT NOT NULL DEFAULT 'vlms-evidence',
    storage_path TEXT NOT NULL UNIQUE,
    evidence_type TEXT NOT NULL CHECK (evidence_type IN ('daily_odometer', 'fuel_odometer', 'fuel_receipt', 'other')),
    sha256_hash TEXT NOT NULL,
    captured_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    mime_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'flagged', 'rejected'))
);

-- 9. Daily Logs
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    business_date DATE NOT NULL,
    odometer_km NUMERIC(10, 2) NOT NULL CHECK (odometer_km >= 0),
    ocr_reading_km NUMERIC(10, 2),
    ocr_confidence NUMERIC(5, 2),
    evidence_id UUID NOT NULL REFERENCES public.evidence_files(id) ON DELETE RESTRICT,
    comment TEXT,
    latitude NUMERIC(10, 7) CHECK (latitude >= -90 AND latitude <= 90),
    longitude NUMERIC(11, 7) CHECK (longitude >= -180 AND longitude <= 180),
    gps_accuracy_m NUMERIC(10, 2),
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'flagged', 'verified', 'amended')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_vehicle_business_date UNIQUE (vehicle_id, business_date)
);

-- 10. Fuel Transactions
CREATE TABLE IF NOT EXISTS public.fuel_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    daily_log_id UUID REFERENCES public.daily_logs(id) ON DELETE SET NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('tom_card', 'personal_fund')),
    tom_card_id UUID REFERENCES public.tom_cards(id) ON DELETE SET NULL,
    vendor_name TEXT NOT NULL,
    odometer_km NUMERIC(10, 2) NOT NULL CHECK (odometer_km >= 0),
    odometer_evidence_id UUID REFERENCES public.evidence_files(id) ON DELETE RESTRICT,
    receipt_evidence_id UUID REFERENCES public.evidence_files(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'NGN',
    quantity_litres NUMERIC(10, 2) NOT NULL CHECK (quantity_litres > 0),
    purchased_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified', 'flagged', 'rejected')),
    idempotency_key TEXT NOT NULL UNIQUE
);

-- 11. Odometer Readings
CREATE TABLE IF NOT EXISTS public.odometer_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    daily_log_id UUID REFERENCES public.daily_logs(id) ON DELETE SET NULL,
    fuel_transaction_id UUID REFERENCES public.fuel_transactions(id) ON DELETE SET NULL,
    odometer_km NUMERIC(10, 2) NOT NULL CHECK (odometer_km >= 0),
    source_evidence_id UUID NOT NULL REFERENCES public.evidence_files(id) ON DELETE RESTRICT,
    reading_type TEXT NOT NULL CHECK (reading_type IN ('daily_log', 'fuel_purchase', 'manual_adjustment')),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 12. Anomaly Alerts
CREATE TABLE IF NOT EXISTS public.anomaly_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    daily_log_id UUID REFERENCES public.daily_logs(id) ON DELETE SET NULL,
    fuel_transaction_id UUID REFERENCES public.fuel_transactions(id) ON DELETE SET NULL,
    rule_code TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ
);

-- 13. Audit Events (Append-only)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Default Settings (Africa/Lagos, NGN currency, Fixed TOM Card vendor, Daily max threshold km)
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('business_timezone', '"Africa/Lagos"'::jsonb, 'Default operating timezone for business day boundaries'),
    ('default_currency', '"NGN"'::jsonb, 'Default currency for fuel purchases'),
    ('fixed_tom_vendor', '"TOTAL ENERGIES FILLING STATION"'::jsonb, 'Mandatory vendor for TOM card transactions'),
    ('max_daily_km_threshold', '800'::jsonb, 'Flag as anomaly if daily distance exceeds this km limit')
ON CONFLICT (key) DO NOTHING;

-- Indexes for Query Performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_assignments_user_active ON public.vehicle_assignments(user_id) WHERE ends_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_vehicle_active ON public.vehicle_assignments(vehicle_id) WHERE ends_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_daily_logs_vehicle_date ON public.daily_logs(vehicle_id, business_date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user ON public.daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON public.daily_logs(business_date);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_vehicle ON public.fuel_transactions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_user ON public.fuel_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_purchased ON public.fuel_transactions(purchased_at);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_vehicle ON public.anomaly_alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_status ON public.anomaly_alerts(status);
CREATE INDEX IF NOT EXISTS idx_evidence_hash ON public.evidence_files(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON public.audit_events(created_at DESC);
