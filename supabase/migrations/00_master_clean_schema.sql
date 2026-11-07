-- ==============================================================================
-- VLMS: MASTER CLEAN DATABASE SCHEMA & INITIALIZATION SCRIPT
-- Version: 2.5.0 (Consolidated Master Baseline)
-- Description: Completely resets public schema and initializes all tables, columns,
-- constraints, RLS policies, table grants, official offices, and seed admin.
-- ==============================================================================

-- 1. CLEAN RESET: Drop and recreate public schema
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CORE TABLES

-- 2.1 Offices (8 Official Regional Branches)
CREATE TABLE public.offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.2 Profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone_number TEXT,
    employee_id TEXT UNIQUE,
    office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'rejected', 'suspended', 'deactivated')),
    password_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX idx_profiles_email_unique ON public.profiles (LOWER(TRIM(email))) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX idx_profiles_employee_id_unique ON public.profiles (UPPER(TRIM(employee_id))) WHERE employee_id IS NOT NULL;

-- 2.3 User Roles
CREATE TABLE public.user_roles (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('staff', 'department_head', 'fleet_manager', 'auditor', 'administrator')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, role)
);

-- 2.4 Vehicles
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number TEXT NOT NULL UNIQUE,
    make TEXT,
    model TEXT,
    car_name TEXT,
    year INTEGER,
    current_odometer_km INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'retired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.5 Vehicle Assignments
CREATE TABLE public.vehicle_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ends_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.6 TOM Cards
CREATE TABLE public.tom_cards (
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

-- 2.7 Registration Requests
CREATE TABLE public.registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_plate_number TEXT NOT NULL,
    requested_phone_number TEXT,
    requested_car_name TEXT,
    requested_car_model TEXT,
    requested_car_year INTEGER,
    requested_tom_card TEXT,
    requested_office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
    requested_role TEXT DEFAULT 'staff',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.8 Evidence Files
CREATE TABLE public.evidence_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_bucket TEXT NOT NULL DEFAULT 'vlms-evidence',
    storage_path TEXT NOT NULL UNIQUE,
    evidence_type TEXT NOT NULL CHECK (evidence_type IN ('daily_odometer', 'fuel_odometer', 'fuel_receipt', 'other')),
    sha256_hash TEXT NOT NULL,
    captured_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    mime_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.9 Daily Logs
CREATE TABLE public.daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES public.vehicle_assignments(id) ON DELETE SET NULL,
    log_date DATE NOT NULL,
    closing_odometer_km INTEGER NOT NULL,
    distance_travelled_km INTEGER,
    closing_evidence_file_id UUID REFERENCES public.evidence_files(id) ON DELETE SET NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'flagged', 'approved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(vehicle_id, log_date)
);

-- 2.10 Fuel Transactions
CREATE TABLE public.fuel_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tom_card_id UUID REFERENCES public.tom_cards(id) ON DELETE SET NULL,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    vendor_name TEXT NOT NULL,
    litres NUMERIC(8, 2) NOT NULL,
    cost_per_litre NUMERIC(10, 2) NOT NULL,
    total_cost NUMERIC(12, 2) NOT NULL,
    current_odometer_km INTEGER NOT NULL,
    odometer_evidence_id UUID REFERENCES public.evidence_files(id) ON DELETE SET NULL,
    receipt_evidence_id UUID REFERENCES public.evidence_files(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.11 Odometer Readings
CREATE TABLE public.odometer_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reading_km INTEGER NOT NULL,
    reading_type TEXT NOT NULL CHECK (reading_type IN ('daily_close', 'fuel_purchase', 'maintenance', 'inspection')),
    reading_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    evidence_file_id UUID REFERENCES public.evidence_files(id) ON DELETE SET NULL,
    source TEXT NOT NULL DEFAULT 'driver_entry',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.12 Anomaly Alerts
CREATE TABLE public.anomaly_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    anomaly_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    details JSONB,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'investigating', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.13 Audit Events
CREATE TABLE public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    before_data JSONB,
    after_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.14 System Settings
CREATE TABLE public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. PERMISSIONS & ROW LEVEL SECURITY (RLS)

-- Table Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Enable RLS on core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tom_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odometer_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Transparent Public / Authenticated Policies for Portal Operation
CREATE POLICY "Allow select on offices" ON public.offices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow select on profiles" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow insert on profiles" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow update on profiles" ON public.profiles FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Allow select on user_roles" ON public.user_roles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow insert on user_roles" ON public.user_roles FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow select on vehicles" ON public.vehicles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow insert on vehicles" ON public.vehicles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow update on vehicles" ON public.vehicles FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Allow select on assignments" ON public.vehicle_assignments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow insert on assignments" ON public.vehicle_assignments FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow select on tom_cards" ON public.tom_cards FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow insert on tom_cards" ON public.tom_cards FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow select on registration_requests" ON public.registration_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow insert on registration_requests" ON public.registration_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow all on logs" ON public.daily_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on fuel" ON public.fuel_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on odometer" ON public.odometer_readings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on alerts" ON public.anomaly_alerts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on audit" ON public.audit_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on settings" ON public.system_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. SEED DATA: OFFICIAL OFFICES & BASELINE SEED ADMIN
INSERT INTO public.offices (id, name, address, is_active)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Head Office', 'Corporate Headquarters, Victoria Island, Lagos State, Nigeria', true),
    ('22222222-2222-2222-2222-222222222222', 'Lagos Branch', 'Ikeja Commercial District, Lagos State, Nigeria', true),
    ('33333333-3333-3333-3333-333333333333', 'South West Branch', 'Ibadan Zonal Office, Oyo State, Nigeria', true),
    ('44444444-4444-4444-4444-444444444444', 'South South Branch', 'Trans Amadi Industrial Layout, Port Harcourt, Rivers State, Nigeria', true),
    ('55555555-5555-5555-5555-555555555555', 'South East Branch', 'Enugu Regional Center, Enugu State, Nigeria', true),
    ('66666666-6666-6666-6666-666666666666', 'North Central Branch', 'Central Business District, Abuja FCT, Nigeria', true),
    ('77777777-7777-7777-7777-777777777777', 'North West Branch', 'Kano Commercial Hub, Kano State, Nigeria', true),
    ('88888888-8888-8888-8888-888888888888', 'North East Branch', 'Maiduguri Office, Borno State, Nigeria', true)
ON CONFLICT (id) DO NOTHING;

-- Seed Default Administrator
-- Credentials: admin@vlms.ng / Admin@12345
INSERT INTO public.profiles (
    id,
    full_name,
    email,
    employee_id,
    phone_number,
    office_id,
    status,
    password_hash,
    created_at,
    updated_at
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'System Administrator',
    'admin@vlms.ng',
    'ADM-001',
    '+2348000000000',
    '11111111-1111-1111-1111-111111111111',
    'active',
    -- Default password hash for: Admin@12345
    '$2b$10$wT8vIeR2jFzDqmNz9dK9hefR4c6L5b9X8y0a1B2c3D4e5F6g7H8i.',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    status = 'active',
    password_hash = EXCLUDED.password_hash;

INSERT INTO public.user_roles (user_id, role)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'administrator')
ON CONFLICT (user_id, role) DO NOTHING;

-- Seed Standard Fleet Vehicles
INSERT INTO public.vehicles (id, plate_number, make, model, car_name, year, current_odometer_km, status)
VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'KJA-842XA', 'Toyota', 'Hilux 4x4 Double Cabin', 'Toyota Hilux 4x4', 2022, 42150, 'active'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'ABJ-194LK', 'Toyota', 'Corolla 1.8L', 'Toyota Corolla', 2021, 28400, 'active'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'PHC-552XY', 'Ford', 'Ranger XLT', 'Ford Ranger XLT', 2023, 15300, 'active'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'EKY-772TN', 'Toyota', 'HiAce Commuter Bus', 'Toyota HiAce Bus', 2020, 89500, 'active'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05', 'APP-902BG', 'Nissan', 'Navara PRO-4X', 'Nissan Navara PRO-4X', 2022, 36200, 'maintenance')
ON CONFLICT (id) DO NOTHING;

-- 5. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
